import { SQL } from "bun"
import { makeCardsTableBody, makeCollectionPage} from "./gen/HTMLtemplates"
import type { CardDetails, Cards, Keywords } from "./gen/dbTableInterfaces"
import { testLexer } from "./src/modules/test"
import { testParser } from "./testParser"
import { getCardTableRowHtml } from "./src/modules/rbmlHtmlRenderer"

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
const cards:CardDetails[] = await sql`SELECT * FROM card_details ORDER BY riot_id`
// Test
testLexer(cards)
testParser(cards)

const cardRows = cards.map(c => getCardTableRowHtml(c))

const collection = makeCollectionPage(makeCardsTableBody(cardRows.join('\n')))

console.log(`Riftbound collection server version: 0`)
const server = Bun.serve({
	routes: {
		'/': new Response(collection, {headers: {'Content-Type': 'text/html; charset=utf-8',}}),
		'/fonts': (request) => {
			const fontName = new URL(request.url).pathname
			try {
				return new Response(Bun.file(`.assets/fonts/${fontName}`))
			}
			catch {
				return Response.json({message: `Could not find font: ${fontName}`})
			}
		},
		'/*': (request) => {
			try {
				return new Response(Bun.file(`./assets/${new URL(request.url).pathname}`))
			}
			catch {
				return Response.json({message: "Not found"}, {status: 404})
			}
		}
	}
})
console.log(`Listening on ${server.url}`)