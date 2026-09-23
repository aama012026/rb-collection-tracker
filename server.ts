import { SQL } from "bun"
import { makeCardDetails, makeCardsTableBody, makeCardTable, makeCollectionPage, makeCycleButton, makeFilterBar, makePopupMenu, makeStickySort } from "./gen/HTMLtemplates"
import type { CardDetails, Domains, Sets, Tags, Types } from "./gen/dbTableInterfaces"
import { testLexer } from "./src/modules/test"
import { testParser } from "./testParser"
import { getCardTableRowHtml } from "./src/modules/rbmlHtmlRenderer"
import { prettyPrint } from "./src/modules/stringify"
import { patchElements } from "./src/modules/sse"
import type { CardCollectionSignals, FilterState } from "./src/types/DomainTypes"
import { whereIn } from "./src/modules/query"

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

const collection = makeCollectionPage(makeCardTable(
	makeStickySort(),
	makeCardsTableBody(cardRows.join('\n')),
	makeFilterBar(
		makePopupMenu('sets', sets.map(set =>
			makeCycleButton('sets', set.id, set.name)
		).join('\n')),
		makePopupMenu('domains', domains.map(domain =>
			makeCycleButton('domains', domain.id, domain.name)
		).join('\n')),
		makePopupMenu('types', types.map(type =>
			makeCycleButton('types', type.id, type.name)
		).join('\n')),
		makePopupMenu('tags', tags.map(tag =>
			makeCycleButton('tags', tag.id, tag.name)
		).join('\n')),
	))
)

console.log(`Riftbound collection server version: 0.7`)
const server = Bun.serve({
	port: 3005,
	routes: {
		'/': new Response(collection, {headers: {'Content-Type': 'text/html; charset=utf-8',}}),
		'/cards': async (request) => {
			const signalsString = new URL(request.url).searchParams.get('datastar')
		 	if(!signalsString) {
				return new Response('Missing datastar signals', {status:404})
			}
			const signals = JSON.parse(signalsString) as CardCollectionSignals
			prettyPrint(signals, 140)
			const sortOrder = signals.sortOrder.map(s => s
				.replace('set', 'set_code')
				.replace('number', 'collector_number')
				.replace('domain', 'domains')
				.replace('type', 'types')
			)
			// We escape each column name as a quoted identifier.
			.map(column => sql(column))
			.reduce((accumulated, column) => sql`${accumulated}, ${column}`)
			const {filters} = signals
			const subCond = {outerColumn: 'id', innerColumn: 'card_id'}
			const filterClause = whereIn(sql,
				{column: 'set_id', filterList: filters.sets},
				{column: 'domain_id', filterList: filters.domains, subClause:
					{...subCond, innerTable:'cards_x_domains'}
				},
				{column: 'type_id', filterList: filters.types, subClause:
					{...subCond, innerTable:'cards_x_types'}
				},
				{column: 'tag_id', filterList: filters.tags, subClause:
					{...subCond, innerTable:'cards_x_tags'}
				},
			)
			const sortedCards:CardDetails[] = await sql`
				SELECT * FROM card_details
				WHERE ${filterClause
				} AND CONCAT_WS('', riot_id, name, description) LIKE ${'%' + signals.searchTerm + '%'} ORDER BY ${sortOrder};
			`
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
		'/card-details/:cardId': async (request) => {
			console.log(`selected card id: ${request.params.cardId}`)
			const {riot_id, name, img, artists} = (await sql`SELECT riot_id, name, img, artists FROM card_details WHERE id = ${request.params.cardId}`)[0]
			console.log(riot_id, name, img, artists)
			const sse = patchElements(
				makeCardDetails(img ?? '', `${name} (${riot_id})`).split('\n'), {selector:'#card-details', mode: 'inner'}
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