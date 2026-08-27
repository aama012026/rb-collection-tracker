import type { CardDetails } from "../../gen/dbTableInterfaces"
import { reconstruct, tokenize } from "./rbmlLexer"
import { parseCardRulesText, TokenStream, formatAst } from "./rbmlParser"
import { prettyPrint } from "./stringify"

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
				const ast = parseCardRulesText(new TokenStream(tokenize(c.description)))
				count++
				prettyPrint(`\n\x1b[34m${c.riot_id}: ${c.name}`)
				prettyPrint(c.description)
				prettyPrint(formatAst(ast))
			}
			catch(e) {
				prettyPrint(`\n\x1b[34m${c.riot_id}: ${c.name}`)
				prettyPrint(c.description)
				console.log(e)
			}
		}
	})
	console.log(`\n\x1b[32mCards: ${count}/${cards.length}`)
}