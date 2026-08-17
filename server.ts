import { SQL } from "bun"
import { makeCardsTableBody, makeCardTableRow, makeCollectionPage, makeEnergySvg, makeMightSvg, makePowerSvg, makeTag } from "./gen/HTMLtemplates"
import type { CardDetails, Cards } from "./gen/dbTableInterfaces"

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
const cards:Array<CardDetails> = await sql`SELECT * FROM card_details ORDER BY riot_id`
const cardRows = cards.map(c => {
	let frame = ''
	switch(c.rarity) {
		case 'common':
			frame='bronze'
			break
		case 'uncommon':
			frame='silver'
			break
		default:
			frame='gold'
			break
	}
	return makeCardTableRow(
		c.id, c.domains ?? 'null', c.rarity, c.set_code,
		c.collector_number, Math.floor(Math.random() * 5), c.name,
		c.energy ? makeEnergySvg(c.energy) : '',
		c.power ? makePowerSvg(c.domains?.split(', ').join('-') + `-${frame}`).repeat(c.power) : '',
		c.might ? makeMightSvg(c.might) : '',
		c.types ?? '',
		c.tags?.split(', ').map(makeTag).join('\n') ?? '',
		c.keywords ?? '',
		c.description ?? ''
	)
})

const collection = makeCollectionPage(makeCardsTableBody(cardRows.join('\n')))

console.log(`Riftbound collection server version: 0`)
const server = Bun.serve({
	routes: {
		'/': new Response(collection, {headers: {'Content-Type': 'text/html'}}),
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