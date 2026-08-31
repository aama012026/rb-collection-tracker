import type { CardDetails } from "../../gen/dbTableInterfaces"
import { TEST_ASTS } from "../data/parserTestASTs"
import { reconstruct, tokenize } from "./rbmlLexer"
import { parse, TokenStream, formatAst, parseCardRulesText } from "./rbmlParser"
import stringify, { prettyPrint } from "./stringify"

export function testLexer(cards:CardDetails[]) {
	cards.forEach(c => {
		if(c.description) {
			const reconstructed = reconstruct(tokenize(c.description))
			if(reconstructed !== c.description) {
				prettyPrint(`\n\x1b[34m${c.riot_id}: ${c.name}`)
				prettyPrint(`original: ${c.description}`)
				prettyPrint(`\x1b[33mreconstr: ${reconstructed}`)
			}
		}
	})
}

export function testParser(cards:CardDetails[]) {
	let count = 0
	cards.forEach(c => {
		if(c.description) {
			try {
				const ast = parseCardRulesText(tokenize(c.description))
				const testAst = TEST_ASTS[c.riot_id]
				if(testAst?.verified && stringify(testAst.tree) === stringify(ast)) {
					count++
					prettyPrint(`\n\x1b[32m${c.riot_id}: ${c.name} OK!`)
				}
				else {
					// prettyPrint(`\n\x1b[34m${c.riot_id}: ${c.name}`)
					// prettyPrint(c.description)
					// prettyPrint(formatAst(ast))
				}
			}
			catch(e) {
				prettyPrint(`\n\x1b[32m${c.riot_id}: ${c.name}`)
				prettyPrint(c.description)
				console.log(e)
			}
		}
	})
	console.log(`\n\x1b[32mCards: ${count}/${cards.length}`)
}