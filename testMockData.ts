import { mockData } from "./sets";
import stringify from "./src/modules/stringify";
import type { Card } from "./src/types/DTO";
const cardIds: Record<string, Card> = {}
mockData.forEach(set => {
	set.cards.forEach(card => {
		if(cardIds[card.id]) {
			console.log('Dupe IDs:\n'
				+ stringify(cardIds[card.id]) + '\n'
				+ stringify(card)
			)
		}
		else {
			cardIds[card.id] = card;
		}
	})
})