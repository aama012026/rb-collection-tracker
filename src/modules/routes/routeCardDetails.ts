import type { BunRequest, SQL } from "bun"
import type { CardDetailsRow } from "../../../gen/dbTableInterfaces"
import { queryCardArtists } from "../query"
import { once, patchElements, sseResponse } from "../sse"
import { getArtistLine, getNameHtml } from "../rbmlHtmlRenderer"
import { makeCardDetails, makeCardVersion } from "../../../gen/HTMLtemplates"

export default async function routeCardDetails(req: BunRequest<'/card-details/:cardId'>, sql: SQL) {
	console.log(`selected card id: ${req.params.cardId}`)

	if(req.params.cardId === '-1') {
		return Response.json({success: true})
	}

	const queryStart = Bun.nanoseconds()
	const cardVersions: Pick<
		CardDetailsRow, 'id'|'riot_id'|'name'|'rarity'|'img'|'version_sort_order'|'version_name'
	>[] = await sql`
		SELECT id, riot_id, name, rarity, img, version_sort_order, version_name FROM card_details
		WHERE name IN (
			SELECT name FROM cards
			WHERE id = ${req.params.cardId}
		) ORDER BY version_sort_order
	`

	const cards = await Promise.all(cardVersions.map(async (v) => {
		const artists = await queryCardArtists(sql, v.id)
		return {...v, artists}
	}))
	const queryDone = Bun.nanoseconds()

	cards.forEach((c, i) => {
		if(c.version_name.toLowerCase() === 'base' && (
			c.rarity.toLowerCase() === 'common' ||
			c.rarity.toLowerCase() === 'uncommon'
		)) {
			const foil = {...c}
			foil.version_name = 'Foil'
			cards.splice(i + 1, 0, foil)
		}
	})

	const selectedCard = cards.find(
		c => c.id === Number(req.params.cardId)
	)

	if(!(selectedCard)) {
		return Response.json({message: "Not found"}, {status: 404})
	}


	const sse = patchElements(
		makeCardDetails({
			nameHtml: getNameHtml(selectedCard.name),
			url: selectedCard.img ?? '',
			altText: `${selectedCard.riot_id} ${selectedCard.name}`,
			artistsLine: getArtistLine(selectedCard.artists),
			versions: cards.map(card => makeCardVersion({
				index: card.riot_id,
				id: card.id,
				version: card.version_name,
				rarityName: card.rarity,
				rarityString: card.rarity,
				artistLine: getArtistLine(card.artists)
			})).join('')
		}),
		{selector:'#card-details', mode: 'inner'}
	)
	const markupDone = Bun.nanoseconds()
	return sseResponse(req, once(sse), [
		`query;dur=${(queryDone-queryStart)/1000000}`,
		`markup;dur=${(markupDone-queryDone)/1000000}`
	])
}