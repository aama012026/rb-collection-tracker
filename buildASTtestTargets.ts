import { SQL } from "bun";
import type { CardDetails } from "./gen/dbTableInterfaces";
import { tokenize } from "./src/modules/rbmlLexer";
import { parseCardRulesText, TokenStream, type Node } from "./src/modules/rbmlParser";
import stringify from "./src/modules/stringify";

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

type TestAST = {description:string, verified:boolean, tree:Node[]}

const cards:Array<CardDetails> = await sql`SELECT * FROM card_details ORDER BY riot_id`
const targets = generateAstTargets(cards)
const file = `export const TEST_ASTS = ${stringify(targets, 90)} as const satisfies Record<string, {description:string, verified:boolean, tree:Node[]}>`
await Bun.write('src/data/parserTestASTs.ts', file, {createPath:true})

function generateAstTargets(cards:CardDetails[]): Record<string, TestAST> {
	const targets:Record<string, TestAST> = {}
	cards.forEach(card => {
		const {description, riot_id} = card
		if(description) {
			console.log(riot_id)
			const tokens = new TokenStream(tokenize(description))
			const tree = (t => t.kind === 'root' ? t.value : [t])(parseCardRulesText(tokens))
			targets[riot_id] = {description, verified:false, tree}
		}
	})
	return targets
}