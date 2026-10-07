import type { SQL } from "bun"
import { prettyPrint } from "../modules/stringify"

export default async function createViews(sql:SQL): Promise<void> {
	async function createView(name:string, query:SQL.Query<any>) {
		prettyPrint(`Creating view ${name}...`)
		await query
		prettyPrint(await sql`SHOW WARNINGS`)
	}

	await createView('card_details', sql`
		CREATE OR REPLACE VIEW card_details AS
		SELECT cards.id, cards.riot_id, cards.collector_number, cards.name,
			rarities.id AS rarity_id, rarities.name AS rarity,
			sets.id AS set_id, sets.code AS set_code, sets.name AS set_name,
			cards.energy, cards.might, cards.power, cards.cost,
			cards.img, cards.thumbnail, cards.description, cards.flavor_text,
			card_versions.name AS version,
			(SELECT JSON_OBJECT_TO_ARRAY(JSON_OBJECTAGG(types.id, types.name))
			FROM cards_x_types cxt
			JOIN types ON types.id = cxt.type_id
			WHERE cxt.card_id = cards.id) AS types,
			(SELECT GROUP_CONCAT(domains.name
				ORDER BY domains.sort_order SEPARATOR ', ')
			FROM cards_x_domains cxd
			JOIN domains ON domains.id = cxd.domain_id
			WHERE cxd.card_id = cards.id) AS domains,
			(SELECT GROUP_CONCAT(domains.shorthand
				ORDER BY domains.sort_order SEPARATOR ', ')
			FROM cards_x_domains cxd
			JOIN domains ON domains.id = cxd.domain_id
			WHERE cxd.card_id = cards.id) AS domain_shorthands,
			(SELECT JSON_OBJECT_TO_ARRAY(JSON_OBJECTAGG(tags.id, tags.name))
			FROM cards_x_tags cxtg JOIN tags ON tags.id = cxtg.tag_id
			WHERE cxtg.card_id = cards.id) AS tags,
			(SELECT GROUP_CONCAT(keywords.id
				ORDER BY keywords.name SEPARATOR ', ')
			FROM cards_x_keywords cxk
			JOIN keywords ON keywords.id = cxk.keyword_id
			WHERE cxk.card_id = cards.id) AS keyword_ids,
			(SELECT GROUP_CONCAT(artists.name ORDER BY artists.name SEPARATOR ' & ')
			FROM cards_x_artists cxa
			JOIN artists ON artists.id = cxa.artist_id
			WHERE cxa.card_id = cards.id) AS artists
		FROM cards
		JOIN rarities ON rarities.id = cards.rarity_id
		JOIN sets ON sets.id = cards.set_id
		JOIN card_versions ON card_versions.id = cards.version_id
		;
	`)
}