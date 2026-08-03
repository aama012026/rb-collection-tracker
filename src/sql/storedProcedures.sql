DELIMITER //
-- @ end of update: check what types are missing sort_order.
CREATE PROCEDURE get_or_add_type(
	IN p_name VARCHAR(32),
	OUT out_id TINYINT UNSIGNED
)
BEGIN
	SELECT id INTO out_id FROM types WHERE name = p_name;
	IF out_id IS NULL THEN
		INSERT INTO types (name) VALUES (p_name);
		SET out_id = LAST_INSERT_ID();
	END IF;
END//

CREATE PROCEDURE get_or_add_supertype(
	IN p_name VARCHAR(32),
	OUT out_id TINYINT UNSIGNED
)
BEGIN
	SELECT id INTO out_id FROM supertypes WHERE name = p_name;
	IF out_id IS NULL THEN
		INSERT INTO supertypes (name) VALUES (p_name);
		SET out_id = LAST_INSERT_ID();
	END IF;
END//

CREATE PROCEDURE get_or_add_rarity(
	IN p_name VARCHAR(32),
	OUT out_id TINYINT UNSIGNED
)
BEGIN
	SELECT id INTO out_id FROM rarities WHERE name = p_name;
	IF out_id IS NULL THEN
		INSERT INTO rarities (name) VALUES (p_name);
		SET out_id = LAST_INSERT_ID();
	END IF;
END//

CREATE PROCEDURE get_or_add_domain(
	IN p_name VARCHAR(32),
	OUT out_id TINYINT UNSIGNED
)
BEGIN
	SELECT id INTO out_id FROM domains WHERE name = p_name;
	IF out_id IS NULL THEN
		INSERT INTO domains (name) VALUES (p_name);
		SET out_id = LAST_INSERT_ID();
	END IF;
END//

CREATE PROCEDURE get_or_add_tag(
	IN p_name VARCHAR(32),
	OUT out_id SMALLINT UNSIGNED
)
BEGIN
	SELECT id INTO out_id FROM tags WHERE name = p_name;
	IF out_id IS NULL THEN
		INSERT INTO domains (name) VALUES (p_name);
		SET out_id = LAST_INSERT_ID();
	END IF;
END//

CREATE PROCEDURE get_or_add_set(
	IN p_code VARCHAR(8),
	IN p_name VARCHAR(255),
	IN p_count_denominator SMALLINT UNSIGNED,
	IN p_count_total SMALLINT UNSIGNED,
	OUT out_id SMALLINT UNSIGNED
)
BEGIN
	SELECT id INTO out_id FROM tags WHERE name = p_name;
	IF out_id IS NULL THEN
		INSERT INTO domains (name) VALUES (p_name);
		SET out_id = LAST_INSERT_ID();
	END IF;
END//

CREATE PROCEDURE get_or_add_artist(
	IN p_name VARCHAR(255),
	OUT out_id INT UNSIGNED
)
BEGIN
	SELECT id INTO out_id FROM artists WHERE name = p_name;
	IF out_id IS NULL THEN
		INSERT INTO domains (name) VALUES (p_name);
		SET out_id = LAST_INSERT_ID();
	END IF;
END//

CREATE PROCEDURE set_card(
	IN p_riot_id VARCHAR(255),
	IN p_collector_number BIGINT,
	IN p_name VARCHAR(255),
	IN p_type VARCHAR(32),
	IN p_domain VARCHAR(32),
	IN p_rarity VARCHAR(32),
	IN p_artist VARCHAR(255),
	IN p_set VARCHAR(255),
	IN p_energy TINYINT,
	IN p_might TINYINT,
	IN p_cost TINYINT,
	IN p_power TINYINT,
	IN p_img VARCHAR(255),
	IN p_thumbnail VARCHAR(255),
	IN p_description VARCHAR(1000),
	IN p_flavor_text VARCHAR(1000),
	OUT p_card_id INT UNSIGNED
)
BEGIN
	INSERT INTO cards (
		riot_id, collector_number, name, type_id, domain_id,
		rarity_id, artist_id, set_id, energy, might, cost, power,
		cardmarket_id, img, thumbnail, description, flavor_text
	) VALUES (
		p_riot_id, p_collector_number, p_name, p_type_id, p_domain_id,
		p_rarity_id, p_artist_id, p_set_id, p_energy, p_might, p_cost, p_power,
		p_cardmarket_id, p_img, p_thumbnail, p_description, p_flavor_text
	)
	ON DUPLICATE KEY UPDATE
		collector_number = COALESCE(VALUE(collector_number), collector_number),
		name             = COALESCE(VALUE(name), name),
		type_id          = COALESCE(VALUE(type_id), type_id),
		domain_id        = COALESCE(VALUE(domain_id), domain_id),
		rarity_id        = COALESCE(VALUE(rarity_id), rarity_id),
		artist_id        = COALESCE(VALUE(artist_id), artist_id),
		set_id           = COALESCE(VALUE(set_id), set_id),
		energy           = COALESCE(VALUE(energy), energy),
		might            = COALESCE(VALUE(might), might),
		cost             = COALESCE(VALUE(cost), cost),
		power            = COALESCE(VALUE(power), power),
		cardmarket_id    = COALESCE(VALUE(cardmarket_id), cardmarket_id),
		img              = COALESCE(VALUE(img), img),
		thumbnail        = COALESCE(VALUE(thumbnail), thumbnail),
		description      = COALESCE(VALUE(description), description),
		flavor_text      = COALESCE(VALUE(flavor_text), flavor_text);

	SET p_card_id = (SELECT id FROM cards WHERE riot_id = p_riot_id);
END//

DELIMITER ;