import { SQL } from "bun"
import { makeCardsTableBody, makeCollectionPage } from "./transpiled/templates"

const sql = new SQL({
	adapter:'mariadb',
	username:process.env.DB_APP_USER,
	password:process.env.DB_APP_PASS,
	host:process.env.DB_HOST,
	port:process.env.DB_PORT,
	database:'riftbound',
	bigint:true
})
await sql`USE riftbound`
const cards:Array<any> = await sql`SELECT * FROM card_details`
const cardRows = cards.forEach()

const collection = makeCollectionPage(makeCardsTableBody(await sql`
	SELECT * FROM card_details`)
)

console.log(`Riftbound collection server version: 0`)
const server = Bun.serve({
	routes: {
		'/': collection,
	}
})
console.log(`Listening on ${server.url}`)