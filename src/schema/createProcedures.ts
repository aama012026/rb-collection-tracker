import type { SQL } from "bun"
import { prettyPrint } from "../modules/stringify"

export default async function createStoredProcedures(sql: SQL): Promise<void> {
	async function createStoredProcedure(name:string, query:SQL.Query<any>
	): Promise<void> {
		prettyPrint(`Creating stored procedure ${name}...`)
		await query
		prettyPrint(await sql`SHOW WARNINGS`)
	}

	prettyPrint('\n\x1b[34mCREATING STORED PROCEDURES:')
	await createStoredProcedure('split_string', sql`
		CREATE PROCEDURE IF NOT EXISTS split_string(
			IN input VARCHAR(1000),
			IN delimiter VARCHAR(1000),
			OUT result VARCHAR(1000),
			OUT rest VARCHAR(1000)
		) BEGIN
			DECLARE split_pos INT UNSIGNED;
			SET split_pos = LOCATE(delimiter, input);
			IF split_pos = 0 THEN
				SET result = input;
				SET rest = NULL;
			ELSE
				SET result = SUBSTRING(input, 1, split_pos - 1);
				SET rest = SUBSTRING(input, split_pos + 1);
			END IF;
		END;
	`)

	await createStoredProcedure('get_or_add_rarity', sql`
		CREATE PROCEDURE IF NOT EXISTS get_or_add_rarity(
			IN rarity_name VARCHAR(32),
			OUT rarity_id TINYINT UNSIGNED
		) BEGIN
			SELECT id INTO rarity_id FROM rarities WHERE name = rarity_name;
			IF rarity_id IS NULL THEN
				INSERT INTO rarities (name) VALUES (rarity_name);
				SET rarity_id = LAST_INSERT_ID();
			END IF;
		END;
	`)

	await createStoredProcedure('get_or_add_type', sql`
		CREATE PROCEDURE IF NOT EXISTS get_or_add_type(
			IN type_name VARCHAR(32),
			OUT type_id TINYINT UNSIGNED
		) BEGIN
			SELECT id INTO type_id FROM types WHERE name = type_name;
			IF type_id IS NULL THEN
				INSERT INTO types (name) VALUES (type_name);
				SET type_id = LAST_INSERT_ID();
			END IF;
		END;
	`)

	await createStoredProcedure('set_card_types', sql`
		CREATE PROCEDURE IF NOT EXISTS set_card_types(
			IN p_card_id INT UNSIGNED,
			IN type_text VARCHAR(1000)
		) BEGIN
			DECLARE type_name TYPE OF types.name;
			DECLARE v_type_id TYPE OF types.id;

			DELETE FROM cards_x_types WHERE card_id = p_card_id;
			WHILE type_text IS NOT NULL AND LENGTH(type_text) > 0 DO
				CALL split_string(type_text, ',', type_name, type_text);
				SET type_name = LOWER(TRIM(type_name));
				IF type_name <> '' THEN
					CALL get_or_add_type(type_name, v_type_id);
					INSERT INTO cards_x_types (card_id, type_id)
					VALUES (p_card_id, v_type_id);
				END IF;
			END WHILE;
		END;
	`)

	await createStoredProcedure('get_or_add_domain', sql`
		CREATE PROCEDURE IF NOT EXISTS get_or_add_domain(
			IN domain_name VARCHAR(32),
			OUT domain_id TINYINT UNSIGNED
		) BEGIN
			SELECT id INTO domain_id FROM domains WHERE name = domain_name;
			IF domain_id IS NULL THEN
				INSERT INTO domains (name) VALUES (domain_name);
				SET domain_id = LAST_INSERT_ID();
			END IF;
		END;
	`)

	await createStoredProcedure('set_card_domains', sql`
		CREATE PROCEDURE IF NOT EXISTS set_card_domains(
			IN p_card_id INT UNSIGNED,
			IN domain_text VARCHAR(1000)
		) BEGIN
			DECLARE domain_name TYPE OF domains.name;
			DECLARE v_domain_id TYPE OF domains.id;

			DELETE FROM cards_x_domains WHERE card_id = p_card_id;
			WHILE domain_text IS NOT NULL AND LENGTH(domain_text) > 0 DO
				CALL split_string(domain_text, ',', domain_name, domain_text);
				SET domain_name = LOWER(TRIM(domain_name));
				IF domain_name <> '' THEN
					CALL get_or_add_domain(domain_name, v_domain_id);
					INSERT INTO cards_x_domains (card_id, domain_id)
					VALUES (p_card_id, v_domain_id);
				END IF;
			END WHILE;
		END;
	`)

	await createStoredProcedure('get_or_add_artist', sql`
		CREATE PROCEDURE IF NOT EXISTS get_or_add_artist(
			IN artist_name VARCHAR(255),
			OUT artist_id INT UNSIGNED
		) BEGIN
			SELECT id INTO artist_id FROM artists WHERE name = artist_name;
			IF artist_id IS NULL THEN
				INSERT INTO artists (name) VALUES (artist_name);
				SET artist_id = LAST_INSERT_ID();
			END IF;
		END;
	`)

	await createStoredProcedure('set_card_artists', sql`
		CREATE PROCEDURE IF NOT EXISTS set_card_artists(
			IN p_card_id INT UNSIGNED,
			IN artist_text VARCHAR(1000)
		) BEGIN
			DECLARE artist_name TYPE OF artists.name;
			DECLARE v_artist_id TYPE OF artists.id;

			DELETE FROM cards_x_artists WHERE card_id = p_card_id;
			WHILE artist_text IS NOT NULL AND LENGTH(artist_text) > 0 DO
				CALL split_string(artist_text, ' & ', artist_name, artist_text);
				SET artist_name = TRIM(artist_name);
				IF artist_name <> '' THEN
					CALL get_or_add_artist(artist_name, v_artist_id);
					INSERT INTO cards_x_artists (card_id, artist_id)
					VALUES (p_card_id, v_artist_id);
				END IF;
			END WHILE;
		END;
	`)

	await createStoredProcedure('get_or_add_tag', sql`
		CREATE PROCEDURE IF NOT EXISTS get_or_add_tag(
			IN tag_name VARCHAR(32),
			OUT tag_id SMALLINT UNSIGNED
		) BEGIN
			SELECT id INTO tag_id FROM tags WHERE name = tag_name;
			IF tag_id IS NULL THEN
				INSERT INTO tags (name) VALUES (tag_name);
				SET tag_id = LAST_INSERT_ID();
			END IF;
		END;
	`)

	await createStoredProcedure('insert_card_tag', sql`
		CREATE PROCEDURE IF NOT EXISTS insert_card_tag(
			IN p_card_id INT UNSIGNED,
			IN tag_name VARCHAR(32),
			OUT got_inserted BOOLEAN
		) BEGIN
			DECLARE v_tag_id TYPE OF tags.id;
			DECLARE v_count BIGINT;
			CALL get_or_add_tag(tag_name, v_tag_id);
			SELECT COUNT(*) INTO v_count FROM card_tags
			WHERE card_id = p_card_id AND tag_id = v_tag_id;
			IF v_count > 0 THEN
				SET got_inserted = FALSE;
			ELSE
				INSERT INTO cards_x_tags (card_id, tag_id)
				VALUES (p_card_id, v_tag_id);
				SET got_inserted = TRUE;
			END IF;
		END;
	`)

	await createStoredProcedure('get_or_add_set', sql`
		CREATE PROCEDURE IF NOT EXISTS get_or_add_set(
			IN set_name VARCHAR(255),
			IN p_code VARCHAR(8),
			IN p_count_denominator SMALLINT UNSIGNED,
			OUT set_id INT UNSIGNED
		) BEGIN
			DECLARE denominator TYPE OF sets.card_count_denominator;
			SELECT id, card_count_denominator INTO set_id, denominator FROM sets
			WHERE code = LOWER(p_code);
			IF set_id IS NULL THEN
				INSERT INTO sets (code, name, card_count_denominator)
				VALUES (LOWER(p_code), LOWER(set_name), p_count_denominator);
				SET set_id = LAST_INSERT_ID();
			ELSEIF denominator IS NULL AND p_count_denominator IS NOT NULL THEN
				UPDATE sets
				SET card_count_denominator = p_count_denominator
				WHERE id = set_id;
			END IF;
		END;
	`)

	await createStoredProcedure('add_card', sql`
		CREATE PROCEDURE IF NOT EXISTS add_card(
			IN p_set_name VARCHAR(255),
			IN p_riot_id VARCHAR(255),
			IN p_collector_number BIGINT,
			IN p_rarity VARCHAR(32),
			IN card_name VARCHAR(255),
			IN type_text VARCHAR(32),
			IN domain_text VARCHAR(32),
			IN artist_text VARCHAR(255),
			IN p_energy TINYINT,
			IN p_power TINYINT,
			IN p_might TINYINT,
			IN p_cost TINYINT,
			IN p_img VARCHAR(255),
			IN p_thumbnail VARCHAR(255),
			IN p_description VARCHAR(1000),
			IN p_flavor_text VARCHAR(1000),
			OUT p_card_id INT UNSIGNED
		) BEGIN
			DECLARE v_rarity_id TYPE OF cards.rarity_id;
			DECLARE v_set_id TYPE OF cards.set_id;

			CALL get_or_add_rarity(p_rarity, v_rarity_id);
			CALL get_or_add_set(
				p_set_name,
				extract_set_code(p_riot_id),
				extract_count_denom(p_riot_id),
				v_set_id
			);
			INSERT INTO cards (
				riot_id, collector_number, name, rarity_id, set_id,
				energy, might, power, cost, img, thumbnail, description, flavor_text
			) VALUES (
				p_riot_id, p_collector_number, card_name, v_rarity_id, v_set_id,
				p_energy, p_might, p_power, p_cost, p_img, p_thumbnail,
				p_description, p_flavor_text
			) ON DUPLICATE KEY UPDATE
				riot_id          = VALUE(riot_id),
				collector_number = VALUE(collector_number),
				name             = VALUE(name),
				rarity_id        = VALUE(rarity_id),
				set_id           = VALUE(set_id),
				energy           = COALESCE(VALUE(energy), energy),
				might            = COALESCE(VALUE(might), might),
				power            = COALESCE(VALUE(power), power),
				cost             = COALESCE(VALUE(cost), cost),
				img              = COALESCE(VALUE(img), img),
				thumbnail        = COALESCE(VALUE(thumbnail), thumbnail),
				description      = COALESCE(VALUE(description), description),
				flavor_text      = COALESCE(VALUE(flavor_text), flavor_text)
			;
			SELECT id INTO p_card_id FROM cards WHERE riot_id = p_riot_id;
			CALL set_card_types(p_card_id, type_text);
			CALL set_card_domains(p_card_id, domain_text);
			CALL set_card_artists(p_card_id, artist_text);
		END;
	`)

	prettyPrint(await sql`SHOW PROCEDURE STATUS;`)
}