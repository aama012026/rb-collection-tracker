import type { CardDetails } from "../../gen/dbTableInterfaces"
import { reconstruct, tokenize } from "./rbmlLexer"
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