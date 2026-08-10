import type { SQL } from "bun"
import { prettyPrint } from "../modules/stringify"

export default async function createTables(sql: SQL): Promise<void> {
	async function createTable(name:string, query:SQL.Query<any>
	): Promise<void> {
		console.log(`Creating table ${name}...`)
		await query
		prettyPrint(await sql`SHOW WARNINGS`)
		prettyPrint(await sql`DESCRIBE ${sql(name)}`)
	}

	prettyPrint(`\n\x1b[34mCREATING TABLES:`)
	await createTable('metadata', sql`
		CREATE TABLE IF NOT EXISTS metadata (
			id TINYINT UNSIGNED PRIMARY KEY DEFAULT 1,
			schema_version INT UNSIGNED NOT NULL,
			last_synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			content_version VARCHAR(32) NOT NULL,
			content_last_updated_at VARCHAR(32) NOT NULL,
			CONSTRAINT single_row CHECK (id = 1)
		);
	`)

	await createTable('rarities', sql`
		CREATE TABLE IF NOT EXISTS rarities (
			id TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
			sort_order TINYINT UNSIGNED UNIQUE,
			name VARCHAR(32) UNIQUE NOT NULL
		);
	`)

	await createTable('sets', sql`
		CREATE TABLE IF NOT EXISTS sets (
			id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
			code VARCHAR(8) UNIQUE NOT NULL,
			name VARCHAR(255) UNIQUE NOT NULL,
			cardmarket_id BIGINT UNIQUE,
			release_date DATE,
			card_count_denominator SMALLINT UNSIGNED,
			card_count_total SMALLINT UNSIGNED
		);
	`)

	await createTable('cards', sql`
		CREATE TABLE IF NOT EXISTS cards (
			id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
			riot_id VARCHAR(255) UNIQUE NOT NULL,
			collector_number BIGINT NOT NULL,
			name VARCHAR(255) NOT NULL,
			rarity_id TINYINT UNSIGNED NOT NULL,
			FOREIGN KEY(rarity_id) REFERENCES rarities(id),
			set_id INT UNSIGNED NOT NULL,
			FOREIGN KEY(set_id) REFERENCES sets(id),
			cardmarket_id BIGINT UNSIGNED UNIQUE,
			energy TINYINT,
			might TINYINT,
			power TINYINT,
			cost TINYINT,
			img VARCHAR(255),
			thumbnail VARCHAR(255),
			description VARCHAR(1000),
			flavor_text VARCHAR(1000)
		);
	`)

	await createTable('domains', sql`
		CREATE TABLE IF NOT EXISTS domains (
			id TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
			sort_order TINYINT UNSIGNED UNIQUE,
			name VARCHAR(32) UNIQUE NOT NULL,
			shorthand varchar(8) UNIQUE
		);
	`)

	await createTable('cards_x_domains', sql`
		CREATE TABLE IF NOT EXISTS cards_x_domains (
			card_id INT UNSIGNED NOT NULL,
			FOREIGN KEY(card_id) REFERENCES cards(id),
			domain_id TINYINT UNSIGNED NOT NULL,
			FOREIGN KEY(domain_id) REFERENCES domains(id),
			PRIMARY KEY(card_id, domain_id)
		);
	`)

	await createTable('types', sql`
		CREATE TABLE IF NOT EXISTS types (
			id TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
			sort_order TINYINT UNSIGNED UNIQUE,
			name VARCHAR(32) UNIQUE NOT NULL
		);
	`)

	await createTable('cards_x_types', sql`
		CREATE TABLE IF NOT EXISTS cards_x_types (
			card_id INT UNSIGNED NOT NULL,
			FOREIGN KEY(card_id) REFERENCES cards(id),
			type_id TINYINT UNSIGNED NOT NULL,
			FOREIGN KEY(type_id) REFERENCES types(id),
			PRIMARY KEY(card_id, type_id)
		);
	`)

	await createTable('tags', sql`
		CREATE TABLE IF NOT EXISTS tags (
			id SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
			name VARCHAR(32) UNIQUE NOT NULL
		);
	`)

	await createTable('cards_x_tags', sql`
		CREATE TABLE IF NOT EXISTS cards_x_tags (
			card_id INT UNSIGNED NOT NULL,
			FOREIGN KEY (card_id) REFERENCES cards(id),
			tag_id SMALLINT UNSIGNED NOT NULL,
			FOREIGN KEY (tag_id) REFERENCES tags(id),
			PRIMARY KEY(card_id, tag_id)
		);
	`)

	await createTable('keywords', sql`
		CREATE TABLE IF NOT EXISTS keywords (
			id SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
			name VARCHAR(32) UNIQUE NOT NULL,
			rules_entry VARCHAR(32) UNIQUE,
			formatting VARCHAR(32) UNIQUE,
			color VARCHAR(8),
			rules_description VARCHAR(1000),
			card_description VARCHAR(1000)
		);
	`)

	await createTable('cards_x_keywords', sql`
		CREATE TABLE IF NOT EXISTS cards_x_keywords (
			card_id INT UNSIGNED NOT NULL,
			FOREIGN KEY(card_id) REFERENCES cards(id),
			keyword_id SMALLINT UNSIGNED NOT NULL,
			FOREIGN KEY(keyword_id) REFERENCES keywords(id),
			PRIMARY KEY(card_id, keyword_id)
		);
	`)

	await createTable('artists', sql`
		CREATE TABLE IF NOT EXISTS artists (
			id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
			name VARCHAR(255) UNIQUE NOT NULL,
			website VARCHAR(255) UNIQUE DEFAULT NULL
		);
	`)

	await createTable('cards_x_artists', sql`
		CREATE TABLE IF NOT EXISTS cards_x_artists (
			card_id INT UNSIGNED NOT NULL,
			FOREIGN KEY(card_id) REFERENCES cards(id),
			artist_id INT UNSIGNED NOT NULL,
			FOREIGN KEY(artist_id) REFERENCES artists(id),
			PRIMARY KEY(card_id, artist_id)
		);
	`)
}