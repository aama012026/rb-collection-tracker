import { SQL } from "bun";
import { prettyPrint } from "./stringify";
import createStoredFunctions from "../schema/createFunctions";
import createStoredProcedures from "../schema/createProcedures";
import createTables from "../schema/createTables";
import seedTables from "../schema/seedDB";
import type { RiftboundContent, Set } from "../types/DTO";
import { mockData } from "../../sets";

const {DB_ADMIN_USER, DB_ADMIN_PASS, DB_HOST, DB_PORT} = process.env

const sql = new SQL({
	adapter:'mariadb',
	username:DB_ADMIN_USER,
	password:DB_ADMIN_PASS,
	host:DB_HOST,
	port:DB_PORT,
	database:'riftbound',
})
await createTables(sql)
await createStoredFunctions(sql)
await createStoredProcedures(sql)
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
		console.log(id)
		prettyPrint(await sql`SELECT * FROM cards WHERE riot_id = ${card.id}`)
		for(const tag of card.tags) {
			await sql`CALL insert_card_tag(${id}, ${tag}, @got_inserted)`
		}
		prettyPrint(await sql`SELECT * FROM cards_x_tags WHERE card_id = ${id}`)
	}
}
prettyPrint(await sql`SELECT * FROM cards`)
prettyPrint('done...')