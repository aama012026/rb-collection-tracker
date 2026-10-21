import type { SQL } from "bun"
import type { CardCollectionSignals } from "../types/DomainTypes"
import type { Encoding } from "./pickEncoding"
import { patchElements, sseResponse } from "../modules/sse"
import { queryCards, queryShorthands} from "../modules/query"
import { makeCardsTableBody } from "../../gen/HTMLtemplates"
import { getCardTableRowHtml } from "./rbmlHtmlRenderer"

const CHUNK_SIZE = 100
const PREFERRED_ENCODING: Encoding[] = ['br','gzip']
async function* streamCardRows(rows: string[]) {
	if(rows.length === 0) {
		yield patchElements(makeCardsTableBody(''))
		return
	}
	// Replace the table body with the initial chunk
	yield patchElements(
		makeCardsTableBody(rows.slice(0, CHUNK_SIZE).join('\n'))
	)
	// Append every subsequent chunk
	for(let i = CHUNK_SIZE; i < rows.length; i += CHUNK_SIZE) {
		const elements = rows.slice(i, i + CHUNK_SIZE).join('\n')
		yield patchElements(elements, {selector: '#cards-table-body', mode: 'append'})
		await Bun.sleep(0)
	}
}

function readSignals(request: Request): CardCollectionSignals | null {
	const raw = new URL(request.url).searchParams.get('datastar')
	return raw ? JSON.parse(raw) as CardCollectionSignals : null
}

export default async function routeCards(req: Request, sql: SQL): Promise<Response> {
	const signals = readSignals(req)
	if(!signals) {
		return new Response('Missing datastar signals', {status: 400})
	}
	const queryStart = Bun.nanoseconds()
	const shorthands = await queryShorthands(sql)
	const cards = await queryCards(sql, signals)
	const queryDone = Bun.nanoseconds()
	const rows = cards.map(c => getCardTableRowHtml(c, shorthands))
	const markupDone = Bun.nanoseconds()
	const serverTimings = [
		`query;dur=${(queryDone-queryStart)/1000000}`,
		`markup;dur=${(markupDone-queryDone)/1000000}`
	]
	return sseResponse(req, streamCardRows(rows), serverTimings, ...PREFERRED_ENCODING)
}