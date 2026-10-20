import type { Artists, ArtistsRow, CardDetailsRow, Shorthands } from "../../gen/dbTableInterfaces";
import {
	makeAbility, makeActivatedAbility, makeAnchor,
	makeCardDescription, makeCardMight,	makeCardTableRow, makeCommaListItem,
	makeCycleButton, makeEnergyCost, makeInfixGroup, makeInlineOrbSymbol, makeInlineSymbol,
	makeKeyword, makeMightCount, makePowerCost, makeReminder, makeShortNameAndSubtitle,
	makeSpan, makeTooltip, makeXpCount
} from "../../gen/HTMLtemplates";
import { tokenize } from "./rbmlLexer";
import { parseCardRulesText, type Node, type Symbol } from "./rbmlParser";
import stringify from "./stringify";

export function getCardTableRowHtml(
	c:CardDetailsRow, symbolLookup:Shorthands
): string {
	const tags = c.tags ? JSON.parse(c.tags) as [number, string][] : []
	const types = c.types ? JSON.parse(c.types) as [number, string][] : []
	const html = makeCardTableRow({
		cardId: c.id,
		cardIndex: c.riot_id.split('-')[1]!.split('/')[0]!,
		count: 0,
		setCode: c.set_code,
		name: getNameHtml(c.name),
		domain: c.domains ?? 'null',
		rarity: c.rarity,
		energyHtml: c.energy ? makeEnergyCost(
			makeInlineOrbSymbol({
				shorthand: c.energy,
				name: `${c.energy} energy`,
				tooltipHtml: makeTooltip(`${c.energy} energy`)
			})
		) : '',
		powerHtml: c.power ? makePowerCost(getPowerCostHtml(c)) : '',
		mightHtml: c.might ? makeCardMight(c.might) : '',
		typeSymbol: getTypeSymbol(types),
		typeBadges: types.length > 0 ? types.map(([id, name]) => makeCycleButton(
			{id, content: name, category: 'type', statesCount: 2}
		)).join('') : '',
		tagBadges: tags.length > 0 ? tags.map(([id, name]) => makeCycleButton(
			{id, content: name, category: 'tag', statesCount: 2}
		)).join('') : '',
		description: getDescriptionHtml(c.description ?? '', symbolLookup)
	})
	if(c.domain_shorthands && c.domain_shorthands.split(', ').length === 1) {
		const domains = c.domain_shorthands.split(', ')
		return html.replace(/symbol-C/g, `symbol-${domains[0]!}`)
		.replace(/data-symbol="C"/g, `data-symbol="${domains[0]!}"`)
	}
	else {
		return html
	}
}

export function getNameHtml(cardName: string): string {
	const [shortName, subtitle] = cardName.split(', ')
	if(shortName && subtitle) {
		return makeShortNameAndSubtitle(
			{shortName, subtitle: subtitle.replace(/\s/g, '&nbsp;')}
		)
	}
	else {
		return makeSpan({classString: 'short-name', textContent: cardName})
	}
}

export function getArtistLine(artists: Artists): string {
	const artistsHtml = artists.map(linkArtistPage).join(', ')
	return `${artists.length > 1 ? 'Artists' : 'Artist'}: ${artistsHtml}`
}

function getTypeSymbol(types:[number, string][]): string {
	if(types.length === 0) {
		return ''
	}
	const typeNames = types.map(([_, name]) => name)
	if(typeNames.length === 1) {
		return typeNames.pop()!
	}
	if(typeNames.includes('champion')) {
		return 'champion'
	}
	return typeNames[0] === 'signature' ? typeNames[1]! : typeNames[0]!
}

function linkArtistPage(artist: ArtistsRow): string {
	if(!artist.website) {
		return makeSpan({classString: 'artist', textContent: artist.name})
	}
	else {
		return makeAnchor({
			href: artist.website,
			target:'_blank',
			attributes:'class="artist"',
			textContent:artist.name
		})
	}
}

function getPowerCostHtml(card: CardDetailsRow): string {
	if(!card.domains || !card.domain_shorthands || !card.power) {
		return ''
	}
	const domain_shorthands = card.domain_shorthands.split(', ')
	const domains = card.domains.split(', ')
	if(domains.length > 1) {
		return makeInlineSymbol({
			shorthand: 'C',
			name: 'Power',
			tooltipHtml: makeTooltip(`Power (${card.domains})`)
		}).repeat(card.power)
	}
	else if(domains.length === 1){
		const domain = domains.pop()!
		return makeInlineSymbol({
			shorthand: domain_shorthands.pop()!,
			name: domain,
			tooltipHtml: makeTooltip(domain)
		}).repeat(card.power)
	}
	else {
		return `[${card.domain_shorthands}]`
	}
}

export function getDescriptionHtml(description: string, symbolLookup:Shorthands): string {
	const ast = parseCardRulesText(tokenize(description))
	const htmlFragments = ast.map(branch => {
		return translateASTnode(branch, symbolLookup)
	})
	return makeCardDescription(htmlFragments.join(''))
}

function translateASTnode(node:Node, symbolLookup:Shorthands): string {
	// Leaves
	if(node.kind === 'text') {
		return node.value
	}
	else if(node.kind === 'might') {
		return makeMightCount({
			sign: node.sign ?? '',
			amount: node.amount,
			tooltipHtml: makeTooltip(`${node.sign ?? ''}${node.amount} might`)
		})
	}
	else if(node.kind === 'xp') {
		return makeXpCount({amount: node.amount, sign: node.sign ?? ''})
	}
	else if(node.kind === 'symbol') {
		return getSymbolHtml(node, symbolLookup)
	}
	// Branches
	else if(node.kind === 'symbol_run') {
		return getSymbolRunHtml(node.value, symbolLookup)
	}
	else if(node.kind === 'reminder_text') {
		return getReminderHtml(node.value, symbolLookup)
	}
	else if(node.kind === 'list') {
		return node.value.map(child => makeCommaListItem(child.reduce(
			(html, content) => html += translateASTnode(content, symbolLookup), ''
		))).join(node.separator)
	}
	else if(node.kind === 'keyword') {
		return makeKeyword({
			isNested: !!node.isNested,
			isAssociated: !!node.associated,
			keyword: node.name,
			param: node.param ? makeSpan({
				classString: 'kw-param', textContent:`${node.param}`
			}) : '',
			cost: node.cost ? makeSpan({
				classString: 'kw-cost',
				textContent: getSymbolRunHtml(node.cost, symbolLookup)
			}) : '',
			associated: node.associated ? translateASTnode(
				node.associated, symbolLookup
			) : '',
			reminder: node.reminderText ? getReminderHtml(
				node.reminderText, symbolLookup
			) : ''
		})
	}
	else if(node.kind === 'ability') {
		if(node.activated) {
			return makeActivatedAbility({
				cost: translateASTnodes(node.cost, symbolLookup),
				effect: translateASTnodes(node.effect, symbolLookup),
				reminder: node.reminderText ? getReminderHtml(
					node.reminderText, symbolLookup
				) : ''
			})
		}
		else {
			return makeAbility({
				ability: translateASTnodes(node.value, symbolLookup),
				reminder: node.reminderText ? getReminderHtml(
					node.reminderText, symbolLookup
				) : ''
			})
		}
	}
	else if(node.kind === 'infix_group') {
		return makeInfixGroup({
			lefthand: translateASTnodes(node.lefthand, symbolLookup),
			righthand: translateASTnodes(node.righthand, symbolLookup),
			operator: node.operator,
			reminder: node.reminderText ? getReminderHtml(
				node.reminderText, symbolLookup
			) : ''
		})
	}
	else if(node.kind === 'group') {
		throw new Error(`Should groups be in the output ast?`)
	}
	else {
		throw new Error(`AST Node defaulted in translate branching:\n${stringify(node)}`)
	}
}

function getReminderHtml(reminder:Node[], symbolLookup:Shorthands) {
	return makeReminder(reminder.reduce(
		(html, child) => html += translateASTnode(child, symbolLookup), ''
	))
}

function getSymbolHtml(symbol:Symbol, symbolLookup:Shorthands) {
	let name = `${symbol.value}`
	if(typeof symbol.value === 'number') {
		name = `${symbol.value} energy`
	}
	else {
		name = symbolLookup.find(
			({shorthand}) => shorthand === symbol.value
		)?.name ?? `${symbol.value}`
	}

	return makeInlineOrbSymbol({
		shorthand: symbol.value,
		name,
		tooltipHtml: makeTooltip(name)
	})
}

function getSymbolRunHtml(symbols:Symbol[], symbolLookup:Shorthands) {
	return symbols.reduce(
		(html, child) => html += getSymbolHtml(child, symbolLookup), ''
	)
}

function translateASTnodes(nodes:Node[], symbolLookup:Shorthands): string {
	return nodes.reduce(
		(html, node) => html += translateASTnode(node, symbolLookup), ''
	)
}