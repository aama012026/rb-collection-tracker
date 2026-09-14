import { SQL } from "bun"
import { makeCardsTableBody, makeCollectionPage, makeCycleButton, makeFilterBar, makePopupMenu } from "./gen/HTMLtemplates"
import type { CardDetails, Domains, Sets, Tags, Types } from "./gen/dbTableInterfaces"
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
const sets:Pick<Sets, 'name'|'id'>[] = await sql`SELECT id, name FROM sets ORDER BY release_date`
const domains:Pick<Domains, 'name'|'id'>[] = await sql`SELECT id, name FROM domains ORDER BY sort_order`
const types:Pick<Types, 'name'|'id'>[] = await sql`SELECT id, name FROM types ORDER BY name`
const tags:Pick<Tags, 'name'|'id'>[] = await sql`SELECT id, name FROM tags ORDER BY name`
const cards:CardDetails[] = await sql`SELECT * FROM card_details ORDER BY riot_id`
// Test
testLexer(cards)
testParser(cards)

const cardRows = cards.map(c => getCardTableRowHtml(c))

const setsFilters:Record<number, 'include'> = {}
const domainsFilters:Record<number, 'include'> = {}
const typesFilters:Record<number, 'include'> = {}
const tagsFilters:Record<number, 'include'> = {}

sets.forEach(set => setsFilters[set.id] = 'include')
domains.forEach(domain => domainsFilters[domain.id] = 'include')
types.forEach(type => typesFilters[type.id] = 'include')
tags.forEach(tag => tagsFilters[tag.id] = 'include')

const collection = makeCollectionPage(
	makeCardsTableBody(cardRows.join('\n')),
	makeFilterBar(
		Bun.escapeHTML(stringify(setsFilters)),
		Bun.escapeHTML(stringify(domainsFilters)),
		Bun.escapeHTML(stringify(typesFilters)),
		Bun.escapeHTML(stringify(tagsFilters)),
		makePopupMenu('sets', sets.map(set =>
			makeCycleButton(`$setsFilters[${set.id}]`, set.name)).join('\n')
		),
		makePopupMenu('domains', domains.map(domain =>
			makeCycleButton(`$domainsFilters[${domain.id}]`, domain.name)).join('\n')
		),
		makePopupMenu('types', types.map(type =>
			makeCycleButton(`$typesFilters[${type.id}]`, type.name)).join('\n')
		),
		makePopupMenu('tags', tags.map(tag =>
			makeCycleButton(`$tagsFilters[${tag.id}]`, tag.name)).join('\n')
		),
	)
)

console.log(`Riftbound collection server version: 0.7`)
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
			const sortOrder = signals.sortOrder.map(s => s
				.replace('set', 'set_code')
				.replace('number', 'collector_number')
				.replace('domain', 'domains')
				.replace('type', 'types')
			)
			// We escape each column name as a quoted identifier.
			.map(column => sql(column))
			.reduce((accumulated, column) => sql`${accumulated}, ${column}`)

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