import { SQL } from "bun"
import { makeCardsTableBody, makeCollectionPage} from "./gen/HTMLtemplates"
import type { CardDetails, Cards, Keywords } from "./gen/dbTableInterfaces"
import { testLexer } from "./src/modules/test"
import { testParser } from "./testParser"
import { getCardTableRowHtml } from "./src/modules/rbmlHtmlRenderer"
import stringify, { prettyPrint } from "./src/modules/stringify"
import { patchElements } from "./src/modules/sse"

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
		'/cards': async (request) => {
			const signalsString = new URL(request.url).searchParams.get('datastar')
		 	if(!signalsString) {
				return new Response('Missing datastar signals', {status:404})
			}
			const signals = JSON.parse(signalsString) as {sortOrder: string[], draggedIdx: number}
			prettyPrint(signals)
			const sortOrder = signals.sortOrder.join(', ')
				.replace(/set/g, 'set_code')
				.replace(/number/g, 'collector_number')
				.replace(/domain/g, 'domains')
				.replace(/type/g, 'types')

			prettyPrint(sortOrder)
			const sortedCards:CardDetails[] = await sql`SELECT * FROM card_details ORDER BY ${sortOrder};`
			const sse = patchElements(
				makeCardsTableBody(sortedCards.map(getCardTableRowHtml).join('\n')).split( '\n')
			)
			const stream = new ReadableStream({
				start(c) {Promise.all([c.enqueue(sse)]).finally(() => c.close())},
				cancel() {}
			})
			return new Response(stream, {
				headers:{"Content-Type": "text/event-stream", "Cache-Control": "no-cache"}
			})
		},
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