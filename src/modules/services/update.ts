import { mockData } from "../../../sets"
import { artists } from "../../data/artists"
import { prettyPrint } from "../stringify"

const sql = new Bun.SQL({
	adapter:'mariadb',
	username:process.env.DB_UPDATE_USER,
	password:process.env.DB_UPDATE_PASS,
	host:process.env.DB_HOST,
	port:process.env.DB_PORT,
	database:process.env.DB_NAME,
	bigint:true
})

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
			${card.description === '[NO TEXT]' ? null : card.description.replace(/\[T\]/g, '[E]').replace(/\[S\]/g, '[M]')},
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

for(const artist of artists) {
	prettyPrint(`setting artist ${artist.name} website to ${artist.website}`)
	await sql`CALL set_artist_website(${artist.name}, ${artist.website})`
	prettyPrint(await sql`SHOW WARNINGS`)
}

prettyPrint(`artists missing home pages:\n`)
prettyPrint(await sql`SELECT name FROM artists WHERE website IS NULL;`
	.values()
)

prettyPrint(`domains missing sort order:\n`)
prettyPrint(await sql`SELECT name FROM domains WHERE sort_order IS NULL;`
	.values()
)

prettyPrint(`types missing sort order:\n`)
prettyPrint(await sql`SELECT name FROM types WHERE sort_order IS NULL;`
	.values()
)

prettyPrint(`rarities missing sort order:\n`)
prettyPrint(await sql`SELECT name FROM rarities WHERE sort_order IS NULL;`
	.values()
)

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

await sql.close()