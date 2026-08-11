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
			rarities.name AS rarity,
			sets.code AS set_code, sets.name AS set_name,
			cards.energy, cards.might, cards.power, cards.cost,
			cards.img, cards.thumbnail, cards.description, cards.flavor_text,
			(SELECT GROUP_CONCAT(types.name ORDER BY types.name SEPARATOR ', ')
			FROM cards_x_types cxt
			JOIN types ON types.id = cxt.type_id
			WHERE cxt.card_id = cards.id) AS types,
			(SELECT GROUP_CONCAT(domains.name
				ORDER BY domains.sort_order SEPARATOR ', ')
			FROM cards_x_domains cxd
			JOIN domains ON domains.id = cxd.domain_id
			WHERE cxd.card_id = cards.id) AS domains,
			(SELECT GROUP_CONCAT(tags.name ORDER BY tags.name SEPARATOR ', ')
			FROM cards_x_tags cxtg JOIN tags ON tags.id = cxtg.tag_id
			WHERE cxtg.card_id = cards.id) AS tags,
			(SELECT GROUP_CONCAT(keywords.name
				ORDER BY keywords.name SEPARATOR ', ')
			FROM cards_x_keywords cxk
			JOIN keywords ON keywords.id = cxk.keyword_id
			WHERE cxk.card_id = cards.id) AS keywords,
			(SELECT GROUP_CONCAT(artists.name ORDER BY artists.name SEPARATOR ' & ')
			FROM cards_x_artists cxa
			JOIN artists ON artists.id = cxa.artist_id
			WHERE cxa.card_id = cards.id) AS artists
		FROM cards
		JOIN rarities ON rarities.id = cards.rarity_id
		JOIN sets ON sets.id = cards.set_id;
	`)
}