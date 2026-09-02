import { SQL } from "bun";
import type { CardDetails } from "./gen/dbTableInterfaces";
import { tokenize } from "./src/modules/rbmlLexer";
import { formatAst, parse, parseCardRulesText, TokenStream, type Node } from "./src/modules/rbmlParser";
import stringify, { prettyPrint } from "./src/modules/stringify";
import { TEST_ASTS } from "./src/data/parserTestASTs";

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

type TestAST = {description:string, verified?:boolean, tree:Node[]}

const cards:Array<CardDetails> = await sql`SELECT * FROM card_details ORDER BY riot_id`
const targets = testParser(cards)
const file = `import type { Node } from "../modules/rbmlParser"\n`
+ `export const TEST_ASTS: `
+ `Record<string, {verified?: boolean, description: string, tree: Node[]}> = `
+ stringify(targets, 90)
await Bun.write('src/data/parserTestASTs.ts', file, {createPath:true})

export function testParser(cards:CardDetails[]): Record<string, TestAST> {
	const targets:Record<string, TestAST> = {}

	const rightCards: string[] = []
	const wrongCards: string[] = []
	const wrongTests: string[] = []
	const otherCards: string[] = []
	const noTxtCards: string[] = []

	cards.forEach(card => {
		const {description, riot_id, name} = card
		const currentAst = TEST_ASTS[riot_id]

		if(currentAst?.verified === true) {
			targets[riot_id] = currentAst
		}
		if(description) {
			const tokens = tokenize(description)
			const tree = parseCardRulesText(tokens)
			if(currentAst?.verified !== true) {
				targets[riot_id] = {verified: currentAst?.verified, description, tree}
			}
			switch(currentAst?.verified) {
				case undefined:
					otherCards.push(`\x1b[34m${riot_id}: ${name}`)
					break
				case false:
					wrongTests.push(`\x1b[33m${riot_id}: ${name}`)
					break
				case true:
					if(stringify(currentAst.tree) === stringify(tree)) {
						rightCards.push(`\x1b[32m${riot_id}: ${name} OK!`)
						}
						else {
							wrongCards.push(`\n\x1b[31m${riot_id}: ${name}\n` +
								`\x1b[0m${description}\n${formatAst(tree)}`
							)
						}
					break
			}
		}
		else {
			noTxtCards.push(`\x1b[35m${riot_id}: ${name} - No description`)
		}
	})
	noTxtCards.forEach(c => prettyPrint(c))
	otherCards.forEach(c => prettyPrint(c))
	rightCards.forEach(c => prettyPrint(c))
	wrongTests.forEach(c => prettyPrint(c))
	wrongCards.forEach(c => prettyPrint(c))
	prettyPrint(`Right cards: \x1b[32m${rightCards.length}/${cards.length}`)
	prettyPrint(`Wrong cards: \x1b[31m${wrongCards.length}/${cards.length}`)
	prettyPrint(`Wrong tests: \x1b[33m${wrongTests.length}/${cards.length}`)
	prettyPrint(`Not checked: \x1b[34m${otherCards.length}/${cards.length}`)
	prettyPrint(`No card txt: \x1b[35m${noTxtCards.length}/${cards.length}`)
	return targets
}