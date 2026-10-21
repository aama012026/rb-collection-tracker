import { SQL } from "bun"
import { makeCardDetails, makeCardsTableBody, makeCardTable, makeCardVersion, makeCollectionPage, makeCycleButton, makeFilterBar, makePopupMenu, makeStickySort } from "./gen/HTMLtemplates"
import type { Artists, CardDetails, CardDetailsRow, DomainsRow, SetsRow, TagsRow, TypesRow } from "./gen/dbTableInterfaces"
import { testLexer } from "./src/modules/test"
import { testParser } from "./testParser"
import { getArtistLine, getCardTableRowHtml, getNameHtml } from "./src/modules/rbmlHtmlRenderer"
import { once, patchElements, sseResponse} from "./src/modules/sse"
import { queryCardArtists, queryShorthands} from "./src/modules/query"
import routeCards from "./src/modules/routes/routeCards"
import routeCardDetails from "./src/modules/routes/routeCardDetails"

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
const sets:Pick<SetsRow, 'name'|'id'>[] = await sql`
	SELECT id, name FROM sets ORDER BY release_date
`
const domains:Pick<DomainsRow, 'name'|'id'>[] = await sql`
	SELECT id, name FROM domains ORDER BY sort_order
`
const types:Pick<TypesRow, 'name'|'id'>[] = await sql`
	SELECT id, name FROM types ORDER BY name
`
const tags:Pick<TagsRow, 'name'|'id'>[] = await sql`
	SELECT id, name FROM tags ORDER BY name
`

const cardDetailsQueryStart = Bun.nanoseconds()
const cards:CardDetails = await sql`
	SELECT * FROM card_details ORDER BY riot_id
`
const cardDetailsQueryDuration = Bun.nanoseconds() - cardDetailsQueryStart
const shorthands = await queryShorthands(sql)

// Test
testLexer(cards)
testParser(cards)

const cardMappingStart = Bun.nanoseconds()
const cardRows = cards.map(c => getCardTableRowHtml(c, shorthands))
const cardMappingDuration = Bun.nanoseconds() - cardMappingStart
console.log(`Elapsed ms - card details query: ${cardDetailsQueryDuration / 1000000}`)
console.log(`Elapsed ms - card mapping: ${cardMappingDuration / 1000000}`)

const collection = makeCollectionPage(makeCardTable({
	sortBar: makeStickySort(),
	tbody: makeCardsTableBody(cardRows.join('\n')),
	filterBar: makeFilterBar({
		setsPopup: makePopupMenu({
			name: 'sets', content: sets.map(set =>	makeCycleButton({
				id: set.id, category: 'set', content: set.name, statesCount: 3
			})
		).join('\n')}),
		domainsPopup: makePopupMenu({
			name: 'domains', content: domains.map(domain => makeCycleButton({
				id: domain.id, category: 'domain', content: domain.name, statesCount: 3
			})
		).join('\n')}),
		typesPopup: makePopupMenu({
			name: 'types', content: types.map(type =>
			makeCycleButton({
				id: type.id, category: 'type', content: type.name, statesCount: 3
			})
		).join('\n')}),
		tagsPopup: makePopupMenu({name: 'tags', content: tags.map(tag =>
		makeCycleButton({
			id: tag.id, category: 'tag', content: tag.name, statesCount: 3
		})
		).join('\n')}),
	})
}))

console.log(`Riftbound collection server version: 0.7`)
const server = Bun.serve({
	port: 3005,
	routes: {
		'/': new Response(
			collection, {headers: {'Content-Type': 'text/html; charset=utf-8'}}
		),
		'/cards': async (req) => routeCards(req, sql),
		'/card-details/:cardId': async (req) => routeCardDetails(req, sql),
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