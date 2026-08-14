import { SQL } from "bun";
import { prettyPrint } from "./stringify";
import createStoredFunctions from "../schema/createFunctions";
import createStoredProcedures from "../schema/createProcedures";
import createTables from "../schema/createTables";
import seedTables from "../schema/seedDB";
import { mockData } from "../../sets";
import createViews from "../schema/createViews";
import generateTableInterfaces from "./generateTableInterfaces";

const {DB_ADMIN_USER, DB_ADMIN_PASS, DB_HOST, DB_PORT} = process.env

const sql = new SQL({
	adapter:'mariadb',
	username:DB_ADMIN_USER,
	password:DB_ADMIN_PASS,
	host:DB_HOST,
	port:DB_PORT,
	database:'riftbound',
	bigint:true
})

await createTables(sql)
await createStoredFunctions(sql)
await createStoredProcedures(sql)
await createViews(sql)
await seedTables(sql)

for(const set of mockData) {
	for(const card of set.cards) {
		prettyPrint(`adding ${card.id} ${card.name}`)
		await sql`CALL add_card(
			${card.set},
			${card.id},
			${card.collectorNumber},
			${card.rarity},
			${card.name},
			${card.type},
			${card.faction},
			${card.art.artist},
			${card.stats.energy ?? null},
			${card.stats.power ?? null},
			${card.stats.might ?? null},
			${card.stats.cost ?? null},
			${card.art.fullURL ?? null},
			${card.art.thumbnailURL ?? null},
			${card.description},
			${card.flavorText},
			@card_id
			)
		`
		prettyPrint(await sql`SHOW WARNINGS`)
		const [{id}] = await sql`SELECT @card_id as id`
		for(const tag of card.tags) {
			await sql`CALL insert_card_tag(${id}, ${tag}, @got_inserted)`
		}
	}
}

prettyPrint(`artists missing home pages:\n`)
prettyPrint(await sql`SELECT name FROM artists WHERE website IS NULL;`.values())

prettyPrint(`domains missing sort order:\n`)
prettyPrint(await sql`SELECT name FROM domains WHERE sort_order IS NULL;`.values())

prettyPrint(`types missing sort order:\n`)
prettyPrint(await sql`SELECT name FROM types WHERE sort_order IS NULL;`.values())

prettyPrint(`rarities missing sort order:\n`)
prettyPrint(await sql`SELECT name FROM rarities WHERE sort_order IS NULL;`.values())

prettyPrint(`sets missing details:\n`)
prettyPrint(await sql`
	SELECT * FROM sets
	WHERE release_date IS NULL
	OR card_count_denominator IS NULL
`)
prettyPrint(`cards missing details\n`)
prettyPrint(await sql`
	SELECT * FROM cards
	WHERE NOT EXISTS(
		SELECT domain_id FROM cards_x_domains
		WHERE cards.id = cards_x_domains.card_id
	)
	OR NOT EXISTS(
		SELECT type_id FROM cards_x_types
		WHERE cards.id = cards_x_types.card_id
	);
`)
prettyPrint(await sql`SELECT COUNT(*) FROM cards;`)
prettyPrint(`Cards in dataset: ${
	mockData.reduce((cardCount, set) => cardCount + set.cards.length, 0)
}`)

await generateTableInterfaces(sql,
	'metadata',
	'rarities',
	'sets',
	'cards',
	'domains',
	'types',
	'tags',
	'keywords',
	'artists',
	'cards_x_domains',
	'cards_x_types',
	'cards_x_tags',
	'cards_x_keywords',
	'cards_x_artists',
	'card_details'
)

prettyPrint('done...')