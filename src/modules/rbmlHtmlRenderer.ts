import { makeAbility, makeActivatedAbility, makeCardDescription, makeCommaListItem, makeInfixGroup, makeInlineSymbol, makeKeyword, makeMightCount, makeReminder, makeXpCount } from "../../gen/HTMLtemplates";
import { tokenize } from "./rbmlLexer";
import { parseCardRulesText, type Experience, type Might, type Node, type Symbol, type Text } from "./rbmlParser";
import stringify, { prettyPrint } from "./stringify";

export function getDescriptionHtml(description: string): string {
	const ast = parseCardRulesText(tokenize(description))
	const htmlFragments = ast.map(branch => {
		return translateASTnode(branch)
	})
	return makeCardDescription(htmlFragments.join('<br>'))
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
			node.param ?? '',
			node.cost ? getSymbolRunHtml(node.cost) : '',
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