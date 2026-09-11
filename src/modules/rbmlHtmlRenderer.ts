import type { CardDetails } from "../../gen/dbTableInterfaces";
import { makeAbility, makeActivatedAbility, makeBadge, makeCardDescription, makeCardTableRow, makeCommaListItem, makeInfixGroup, makeInlineSymbol, makeKeyword, makeMightCount, makeReminder, makeShortNameAndSubtitle, makeSpan, makeXpCount } from "../../gen/HTMLtemplates";
import { tokenize } from "./rbmlLexer";
import { parseCardRulesText, type Node, type Symbol } from "./rbmlParser";
import stringify from "./stringify";

export function getCardTableRowHtml(c:CardDetails): string {
	const html = makeCardTableRow(
		c.id, c.domains ?? 'null', c.rarity, c.set_code,
		c.riot_id.split('-')[1]!.split('/')[0]!, Math.floor(Math.random() * 5),
		getNameHtml(c.name),
		c.energy ? makeInlineSymbol(c.energy) : '',
		getPowerCostHtml(c),
		c.might ? makeMightCount('', c.might) : '',
		makeBadge('type', c.types ?? ''),
		c.tags?.split(', ').map(tag => makeBadge('tag', tag)).join('') ?? '',
		getDescriptionHtml(c.description ?? '')
	)
	if(c.domain_shorthands && c.domain_shorthands.split(', ').length === 1) {
		const domains = c.domain_shorthands.split(', ')
		return html.replace(/symbol-C/g, `symbol-${domains[0]!}`)
		.replace(/data-symbol="C"/g, `data-symbol="${domains[0]!}"`)
	}
	else {
		return html
	}
}

function getNameHtml(cardName: string): string {
	const [shortName, subtitle] = cardName.split(', ')
	if(shortName && subtitle) {
		return makeShortNameAndSubtitle(shortName, subtitle.replace(/\s/g, '&nbsp;'))
	}
	else {
		return makeSpan('short-name', cardName)
	}
}

function getPowerCostHtml(card: CardDetails): string {
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
		return makeMightCount(node.sign ?? '', node.amount)
	}
	else if(node.kind === 'xp') {
		return makeXpCount(node.amount, node.sign ?? '')
	}
	else if(node.kind === 'symbol') {
		return makeInlineSymbol(node.value)
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
		return makeKeyword(
			!!node.isNested,
			!!node.associated,
			node.name,
			node.param ? makeSpan('kw-param', `${node.param}`) : '',
			node.cost ? makeSpan('kw-cost', getSymbolRunHtml(node.cost)) : '',
			node.associated ? translateASTnode(node.associated) : '',
			node.reminderText ? getReminderHtml(node.reminderText) : ''
		)
	}
	else if(node.kind === 'ability') {
		if(node.activated) {
			return makeActivatedAbility(
				translateASTnodes(node.cost),
				translateASTnodes(node.effect),
				node.reminderText ? getReminderHtml(node.reminderText) : ''
			)
		}
		else {
			return makeAbility(
				translateASTnodes(node.value),
				node.reminderText ? getReminderHtml(node.reminderText) : ''
			)
		}
	}
	else if(node.kind === 'infix_group') {
		return makeInfixGroup(
			translateASTnodes(node.lefthand),
			node.operator,
			translateASTnodes(node.righthand),
			node.reminderText ? getReminderHtml(node.reminderText) : ''
		)
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
		(html, child) => html += makeInlineSymbol(child.value), ''
	)
}

function translateASTnodes(nodes:Node[]): string {
	return nodes.reduce(
		(html, node) => html += translateASTnode(node), ''
	)
}