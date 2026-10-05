import type { Artists, ArtistsRow, CardDetailsRow } from "../../gen/dbTableInterfaces";
import {
	makeAbility, makeActivatedAbility, makeAnchor,
	makeCardDescription, makeCardMight,	makeCardTableRow, makeCommaListItem,
	makeCycleButton, makeEnergyCost, makeInfixGroup, makeInlineOrbSymbol, makeInlineSymbol,
	makeKeyword, makeMightCount, makePowerCost, makeReminder, makeShortNameAndSubtitle,
	makeSpan, makeXpCount
} from "../../gen/HTMLtemplates";
import { tokenize } from "./rbmlLexer";
import { parseCardRulesText, type Node, type Symbol } from "./rbmlParser";
import stringify from "./stringify";

export function getCardTableRowHtml(c:CardDetailsRow): string {
	const tags = c.tags ? JSON.parse(c.tags) as [number, string][] : []
	const types = c.types ? JSON.parse(c.types) as [number, string][] : []
	const html = makeCardTableRow({
		cardId: c.id,
		cardIndex: c.riot_id.split('-')[1]!.split('/')[0]!,
		count: Math.floor(Math.random() * 5),
		setCode: c.set_code,
		name: getNameHtml(c.name),
		domain: c.domains ?? 'null',
		rarity: c.rarity,
		energyHtml: c.energy ? makeEnergyCost(
			makeInlineOrbSymbol(c.energy)
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
		description: getDescriptionHtml(c.description ?? '')
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
	if(!card.domain_shorthands || !card.power) {
		return ''
	}
	const domains = card.domain_shorthands.split(', ')
	if(domains.length > 1) {
		return makeInlineSymbol('C').repeat(card.power)
	}
	else if(domains.length === 1){
		return makeInlineSymbol(domains.pop()!).repeat(card.power)
	}
	else {
		return `[${card.domain_shorthands}]`
	}
}

export function getDescriptionHtml(description: string): string {
	const ast = parseCardRulesText(tokenize(description))
	const htmlFragments = ast.map(branch => {
		return translateASTnode(branch)
	})
	return makeCardDescription(htmlFragments.join(''))
}

function translateASTnode(node:Node): string {
	// Leaves
	if(node.kind === 'text') {
		return node.value
	}
	else if(node.kind === 'might') {
		return makeMightCount({sign: node.sign ?? '', amount: node.amount})
	}
	else if(node.kind === 'xp') {
		return makeXpCount({amount: node.amount, sign: node.sign ?? ''})
	}
	else if(node.kind === 'symbol') {
		return makeInlineOrbSymbol(node.value)
	}
	// Branches
	else if(node.kind === 'symbol_run') {
		return getSymbolRunHtml(node.value)
	}
	else if(node.kind === 'reminder_text') {
		return getReminderHtml(node.value)
	}
	else if(node.kind === 'list') {
		return node.value.map(child => makeCommaListItem(child.reduce(
			(html, content) => html += translateASTnode(content), ''
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
				textContent: getSymbolRunHtml(node.cost)
			}) : '',
			associated: node.associated ? translateASTnode(node.associated) : '',
			reminder: node.reminderText ? getReminderHtml(node.reminderText) : ''
		})
	}
	else if(node.kind === 'ability') {
		if(node.activated) {
			return makeActivatedAbility({
				cost: translateASTnodes(node.cost),
				effect: translateASTnodes(node.effect),
				reminder: node.reminderText ? getReminderHtml(
					node.reminderText
				) : ''
			})
		}
		else {
			return makeAbility({
				ability: translateASTnodes(node.value),
				reminder: node.reminderText ? getReminderHtml(node.reminderText) : ''
			})
		}
	}
	else if(node.kind === 'infix_group') {
		return makeInfixGroup({
			lefthand: translateASTnodes(node.lefthand),
			righthand: translateASTnodes(node.righthand),
			operator: node.operator,
			reminder: node.reminderText ? getReminderHtml(node.reminderText) : ''
		})
	}
	else if(node.kind === 'group') {
		throw new Error(`Should groups be in the output ast?`)
	}
	else {
		throw new Error(`AST Node defaulted in translate branching:\n${stringify(node)}`)
	}
}

function getReminderHtml(reminder:Node[]) {
	return makeReminder(
		reminder.reduce((html, child) => html += translateASTnode(child), '')
	)
}

function getSymbolRunHtml(symbols:Symbol[]) {
	return symbols.reduce(
		(html, child) => html += makeInlineOrbSymbol(child.value), ''
	)
}

function translateASTnodes(nodes:Node[]): string {
	return nodes.reduce(
		(html, node) => html += translateASTnode(node), ''
	)
}