import { tokenize, type Token } from "./rbmlLexer"
import stringify, { prettyPrint } from "./stringify"

/*
GRAMMAR:
List = (Any COMMA)*
Symbol = OPEN_BRACKET (WORD.len=1|NUMBER) CLOSE_BRACKET
MightSymbol = Symbol='[M]'
MightModifier = (OTHER='+'|'-') NUMBER OTHER=' ' MightSymbol
Keyword = ([>>])? OPEN_BRACKET WORD (SPACE NUMBER)? CLOSE_BRACKET ([>])?
AbilityAssociator = (OPEN_BRACKET GT CLOSE_BRACKET) | (Keyword OTHER=' ' (HYPHEN|EN_DASH|EM_DASH))
SymbolRun = Symbol*
Keyword with cost = Keyword Symbol?* (DASH Sentence)?
CostEffectDelim = COLON
ReminderText = OPEN_PAREN (ANY*) CLOSE_PAREN
XPAmt = (+/-)?NUMBER(+/-)? XP
(alt) Amt = (+/-)?NUMBER(+/-)? WORD=XP|MightSymbol
MightCount = NUMBER OTHER=' ' MightSymbol
Group = Keyword[>]|((Keyword|Sentence|List) (SPACE DASH SPACE)|(COLON SPACE)) (Sentence | Group)
KeywordCost = <Non-associative Keyword with valid cost templating> <Cost that is a SymbolRun With only runes and energy> <No text cost>

Cost = (Symbol|Keyword) (OTHER=',' OTHER=' ' (Symbol|Keyword))*
ActivatedAbility = Cost COLON Instruction+


RulesText = Ability*
Ability = Keyword | ActivatedAbility | TriggeredAbility | PassiveAbility
*/

const resourceSymbols: string[] = ['R', 'G', 'B', 'O', 'P', 'Y', 'C', 'A']

type Symbol = {kind: 'symbol', value: string|number}
type SymbolRun = {kind: 'symbol_run', value:Node[]}
type Keyword = {
	kind: 'keyword',
	name: string,
	param?: number,
	cost?: Symbol[],
	associated?: Node,
	isNested?: boolean,
	reminderText?: Node[]
}

type Ability = {
	kind: 'ability',
	activated?:false,
	value: Node[],
	reminderText?: Node[]
}
type ActivatedAbility = {
	kind:'ability',
	activated:true,
	cost:Node[],
	effect:Node[],
	reminderText?: Node[]
}
type InfixGroup = {
	kind:'infix_group',
	operator:string,
	lefthand:Node[],
	righthand:Node[],
	reminderText?: Node[]
}
type DelimitedList = {kind:'list', value: Node[][], separator:','}
type Group = {kind: 'group', value: Node[]}
type Text = {kind: 'text', value: string}
type Reminder = {kind: 'reminder_text', value: Node[]}
type Might = {kind: 'might', amount: number, sign?: '+'|'-'}
type Experience = {kind: 'xp', amount: number, sign?: '+'|'-'}


export type Node =
| Symbol
| Might
| Experience
| SymbolRun
| Keyword
| Text
| Ability
| ActivatedAbility
| InfixGroup
| Group
| Reminder
| DelimitedList

export class TokenStream {
	constructor(public readonly tokens: Token[], private _pos = 0) {}
	public get pos() {return this._pos}

	static assert(token:Token|undefined, pos: number) {
		if(!token) {
			throw new Error(`Expected a token, but got ${token} at pos ${pos}`)
		}
		return token
	}
	assertType<T extends Token['name']>(type:T, offset = 0): Extract<Token, {name: T}> {
		const token = this.peek(offset)
		if(token?.name !== type) {throw new Error(
			`Expected ${type}, got ${stringify(token) ?? 'End Of Stream'
			} at pos ${this.pos + offset}`
		)}
		return token as Extract<Token, {name: T}>
	}

	peek(offset = 0): Token|undefined {
		return this.tokens[this.pos + offset]
	}
	peekExisting(offset = 0): Token {
		return TokenStream.assert(this.peek(offset), this.pos + offset)
	}

	next(): Token|undefined {
		const token = this.tokens[this.pos]
		this._pos++
		return token
	}
	nextExisting(): Token {
		return TokenStream.assert(this.next(), this.pos-1)
	}
	skipSpace() {
		while(this.peek()?.name === 'SPACE') {
			this.next()
		}
	}
	skip(distance:number): Token|undefined {
		this._pos += distance
		return this.peek()
	}
	skipTo(pos:number): Token|undefined {
		this._pos = pos
		return this.peek()
	}

	prev(): Token|undefined {
		this._pos--
		return this.peek()
	}
}

export function parseBrackets(stream: TokenStream): SymbolRun|Keyword {
	stream.prev()
	const symbols = tryParseSymbols(stream)
	if(symbols) {
		return {kind: 'symbol_run', value: symbols}
	}
	stream.next()
	// Keyword
	stream.skipSpace()
	let t = stream.peekExisting()
	let isNested
	if(t.name === 'GT') {
		// Should be [>>]
		stream.skipSpace()
		stream.next()
		stream.assertType('GT')
		stream.next()
		stream.skipSpace()
		stream.assertType('CLOSE_BRACKET')
		stream.next()
		stream.skipSpace()
		stream.assertType('OPEN_BRACKET')
		stream.next()
		stream.skipSpace()
		isNested = true
	}
	const node:Keyword = {kind:'keyword', name: stream.assertType('WORD').value, isNested}
	stream.next()
	stream.skipSpace()
	t = stream.peekExisting()
	if(t.name === 'NUMBER') {
		node.param = t.value
		stream.next()
		stream.skipSpace()
	}
	stream.assertType('CLOSE_BRACKET')
	stream.next()

	// Check and parse if associated.
	if(stream.peek()?.name === 'OPEN_BRACKET' && stream.peek(1)?.name === 'GT') {
		stream.skip(2)
		stream.assertType('CLOSE_BRACKET')
		stream.next()
		node.associated = parse(stream, 'ability')
	}

	// Try to add inside badge-cost.
	else if(!node.associated && !node.cost && node.name !== 'Add'){
		const prevPos = stream.pos
		if(stream.peek()?.name !== 'SPACE') {
			return node
		}
		stream.skipSpace()
		const symbols = tryParseSymbols(stream)
		const nextToken = stream.peek()?.name
		// Valid inside badge-cost terminators: NEW_LINE | DOT | SPACE OPEN_PAREN | EOS (undefined)
		if(symbols && (!nextToken || nextToken === 'NEW_LINE' || nextToken === 'DOT' || (nextToken === 'SPACE' && stream.peek(1)?.name === 'OPEN_PAREN'))) {
			if(symbols.every(symbol => typeof symbol.value ===  'number' || resourceSymbols.includes(symbol.value))) {
				node.cost = symbols
			}
		}
		else {
			stream.skipTo(prevPos)
		}
		if(stream.peek(1)?.name === 'OPEN_PAREN') {
			stream.skip(2)
			const reminderText = parse(stream, 'reminder_text')
			if(reminderText.kind !== 'reminder_text') {
				throw new Error("Bug in parser! parseBrackets did not get reminder_text on return.")
			}
			node.reminderText = reminderText.value
		}
	}
	return node
}

function tryParseSymbol(stream: TokenStream): Symbol|null {
	const openBracket = stream.peek()?.name === 'OPEN_BRACKET'
	const closeBracket = stream.peek(2)?.name === 'CLOSE_BRACKET'
	if(openBracket && closeBracket) {
		const t = stream.peek(1)
		if(t?.name === 'NUMBER' || (t?.name === 'WORD' && t.value.length === 1)) {
			stream.skip(3)
			return {kind: 'symbol', value: t.value}
		}
	}
	return null
}

function tryParseSymbols(stream:TokenStream, startSymbol?:Symbol): Symbol[]| null {
	let symbol:Symbol|null = startSymbol ?? tryParseSymbol(stream)
	const symbolRun:Symbol[] = []

	while(symbol) {
		symbolRun.push(symbol)
		symbol = tryParseSymbol(stream)
	}
	return symbolRun.length !== 0 ? symbolRun : null
}

function isMightSymbol(stream: TokenStream, offset: number): boolean {
	const openBracket = stream.peek(offset)?.name === 'OPEN_BRACKET'
	const glyph = (t => t?.name === 'WORD' && t.value === 'M')(stream.peek(offset + 1))
	const closeBracket = stream.peek(offset + 2)?.name === 'CLOSE_BRACKET'
	return openBracket && glyph && closeBracket ? true : false
}

function tryParseCount(stream: TokenStream): Might|Experience|null {
	const countTokens = [stream.peek(-1), stream.peek(0)]
	let amount
	let sign
	countTokens.forEach(token => {
		if(token?.name === 'NUMBER') {
			amount = token.value
		}
		else if(token?.name === 'PLUS') {
			sign = '+'
		}
		else if(token?.name === 'HYPHEN') {
			sign = '-'
		}
	})
	const unitStartPos = sign ? 2 : 1
	if(amount !== undefined && stream.peek(unitStartPos - 1)?.name === 'SPACE') {
		const identifierStart = stream.peek(unitStartPos)
		if (identifierStart?.name === 'WORD' && identifierStart.value.toLowerCase() === 'xp') {
			stream.skip(unitStartPos + 1)
			return {kind: 'xp', amount, sign}
		}
		else if(isMightSymbol(stream, unitStartPos)) {
			stream.skip(unitStartPos + 3)
			return {kind: 'might', amount, sign}
		}
	}
	return null
}

function parseListItem(stream: TokenStream): Node[] {
	const item = parse(stream, 'list_item')
	return item.kind === 'group' ? item.value : [item]
}

function parseAbilityContent(stream: TokenStream): {value: Node[], reminderText?:Node[]} {
	const node = parse(stream, 'ability')
	if(node.kind === 'ability' && !node.activated) {
		return {value: node.value, reminderText: node.reminderText}
	}
	else {
		return {value: [node]}
	}
}

function parseText(stream:TokenStream): Text {
	let t = stream.next()
	let value = ''
	while (t && (t.name === 'WORD' || t.name === 'SPACE' || t.name === 'OTHER')) {
		value += t.name === 'SPACE' ? ' ' : t.value
		t = stream.next()
	}
	stream.prev()
	if(value === '') {
		throw new Error(`parseText ended up with empty string at ${stream.pos}, which should not happen!\nStream: ${stringify(stream.tokens)}`)
	}
	return {kind:'text', value}
}

export function parseCardRulesText(tokens:Token[]):Node[] {
	const stream = new TokenStream(tokens)
	const ast: Node[] = []
	let prevPos = -1
	while(stream.peek() && stream.pos !== prevPos) {
		prevPos = stream.pos
		if(stream.peek()?.name === 'NEW_LINE') {
			stream.next()
		}
		else {
			ast.push(parse(stream))
		}
	}
	if(stream.pos === prevPos) {
		throw new Error(`Broke out of infinite loop.\nTokens: ${stringify(tokens)}\n Partial AST: ${stringify(ast)}`)
	}
	return ast
}

export function parse(stream:TokenStream, kind:'reminder_text'|'ability'|'list_item' = 'ability'): Node {
	let token = stream.next()
	const children:Node[] = []
	while(token) {
		const {name} = token
		// Return a bracketed node or groups of bracketed nodes.
		if(name === 'OPEN_BRACKET') {
			const node = parseBrackets(stream)
			if(node.kind === 'symbol_run' && node.value.length === 1) {
				children.push(node.value.pop()!)
			}
			else {
				children.push(node)
			}
		}
		// Start new group.
		else if(name === 'OPEN_PAREN') {
			const parenthesisText = parse(stream, 'reminder_text')
			if(parenthesisText.kind === 'reminder_text') {
				if(kind === 'ability' && parenthesisText.kind === 'reminder_text') {
					return {kind, value: children, reminderText: parenthesisText.value}
				}
				children.push(parenthesisText)
			}
			else if(parenthesisText.kind === 'group') {
				children.push(...parenthesisText.value)
			}
			else {
				children.push(parenthesisText)
			}
		}
		// Close group.
		else if(name === 'CLOSE_PAREN') {
			if(kind !== 'reminder_text') {
				stream.prev()
				return {kind: kind === 'list_item' ? 'group' : kind, value:children} as Node
			}
			const precedingToken = stream.peek(-2)
			if(precedingToken?.name === 'DOT' || (precedingToken?.name === 'OTHER' && precedingToken.value === '"' && stream.peek(-3)?.name === 'DOT')) {
				return {kind:'reminder_text', value:children}
			}
			else {
				children.unshift({kind:'text', value:'('})
				children.push({kind:'text', value:')'})
				return {kind:'group', value:children}
			}
		}
		else if(name === 'COMMA') {
			if(kind === 'list_item') {
				return children.length === 1 ? children.pop()! : {kind:'group', value:children}
			}
			else {
				const sentenceStart = children.findLastIndex(c => c.kind === 'list' || (c.kind === 'text' && c.value === '.')) + 1
				const listItems:Node[][] = []
				listItems.push(children.splice(sentenceStart))
				while(stream.peek(-1)?.name === 'COMMA') {
					listItems.push(parseListItem(stream))
				}
				children.push({kind:'list', separator:',', value: listItems})
				if(kind === 'ability' && stream.peek(-1)?.name === 'DOT') {
					if(stream.peek()?.name !== 'SPACE') {
						return {kind, value: children}
					}
				}
				else {
					stream.prev()
				}
			}
		}
		else if(name === 'DOT') {
			children.push({kind:'text', value:'.'})
			const nextToken = stream.peek()?.name
			if((kind === 'ability') && nextToken !== 'SPACE') {
				const node:Ability = {kind, value: children}
				return node
			}
			else if(kind === 'list_item') {
				return {kind: 'group', value: children}
			}
		}
		else if(name === 'NEW_LINE') {
			if(children.length === 1) {
				return children.pop()!
			}
			else if(kind === 'ability') {
				return {kind, value: children}
			}
		}
		// Try to group might & xp with its amount.
		else if(name === 'PLUS' || name === 'HYPHEN' || name === 'NUMBER') {
			const countNode = tryParseCount(stream)
			if(countNode) {
				children.push(countNode)
			}
			else if(name === 'PLUS') {
				children.push({kind: 'text', value: '+'})
			}
			else if(name === 'HYPHEN') {
				children.push({kind: 'text', value: '-'})
			}
			else {
				children.push({kind: 'text', value: String(token.value)})
			}
		}
		else if(name === 'WORD' || name === 'SPACE' || name === 'OTHER') {
			stream.prev()
			if(kind === 'ability' || kind === 'list_item') {
				children.push(parseText(stream))
			}
			else if(kind === 'reminder_text') {
				const {value, reminderText} = parseAbilityContent(stream)
				children.push(...value)
				if(reminderText) {
					children.push({kind:'reminder_text', value:reminderText})
				}
			}
			else if(name === 'SPACE') {
				stream.next()
			}
			else {
				children.push(parse(stream, 'ability'))
			}
		}
		else if(name === 'INFIX') {
			if(kind === 'list_item') {
				return children.length === 1 ? children.pop()! : {kind:'group', value:children}
			}
			if(children.length === 0) {
				throw new Error(`No children to be lefthand of infix operator.\nTokens: ${stringify(stream.tokens)}`)
			}
			const lefthand:Node[] = children.splice(0)
			let infixGroup:InfixGroup|ActivatedAbility
			const {value, reminderText} = parseAbilityContent(stream)
			if(token.value === ': ') {
				infixGroup = {
					kind:'ability',
					activated:true,
					cost:lefthand,
					effect: value,
					reminderText: reminderText
				}
			}
			else {
				infixGroup = {
					kind: 'infix_group',
					lefthand,
					operator: token.value,
					righthand: value,
					reminderText: reminderText
				}
			}
			if(kind === 'ability') {
				return infixGroup
			}
			else {
				children.push(infixGroup)
			}
		}
		token = stream.next()
	}
	if(children.length === 1) {
		return children.pop()!
	}
	else {
		return {kind: kind === 'list_item' ? 'group' : kind, value:children} as Node
	}
}

// Same literal object/array shape stringify would print (real field names,
// quoted strings, real brackets -- comparable to what's stored in
// parserTestASTs.ts) but drawn as a branch outline instead of brace/comma
// nesting, so an over-budget value never costs a line that's just "{" or "[".
function renderInline(value: unknown): string {
	if(value === null || typeof value === 'number' || typeof value === 'boolean') {
		return `${value}`
	}
	if(Array.isArray(value)) {
		return `[${value.map(renderInline).join(', ')}]`
	}
	if(typeof value === 'object') {
		const entries = Object.entries(value).filter(([, v]) => v !== undefined)
		return `{${entries.map(([k, v]) => `${k}: ${renderInline(v)}`).join(', ')}}`
	}
	return JSON.stringify(value)
}

function withLabel(label: string|undefined, value: string): string {
	if(label === undefined) return value
	return value ? `${label}: ${value}` : `${label}:`
}

export function formatAst(nodes: Node[], columns = 100): string {
	const lines: string[] = []
	function walk(value: unknown, prefix: string, connector: string, childPrefix: string, label?: string) {
		const inlineLine = `${prefix}${connector}${withLabel(label, renderInline(value))}`
		const isArray = Array.isArray(value)
		const isObject = !isArray && typeof value === 'object' && value !== null
		const expandable = (isArray && value.length > 0) || isObject
		if(!expandable || inlineLine.length <= columns) {
			lines.push(inlineLine)
			return
		}
		lines.push(`${prefix}${connector}${withLabel(label, isArray ? '[' : '{')}`)
		const items: {label?: string, value: unknown}[] = isArray
			? value.map(v => ({value: v}))
			: Object.entries(value as object).filter(([, v]) => v !== undefined).map(([k, v]) => ({label: k, value: v}))
		items.forEach((item, i) => {
			const isLast = i === items.length - 1
			walk(
				item.value,
				childPrefix,
				isLast ? '└─ ' : '├─ ',
				childPrefix + (isLast ? '   ' : '│  '),
				item.label
			)
		})
	}
	nodes.forEach((node, i) => {
		const isLast = i === nodes.length - 1
		walk(node, '', isLast ? '└─ ' : '├─ ', isLast ? '   ' : '│  ')
	})
	return lines.join('\n')
}

if (import.meta.main) {
	const cases = [
		// cost binds only to the piece straight before the colon
		'[Deflect][2][R]: Double my Might this turn.',
		// ...unless a comma run marks several pieces as one unit
		'This enters exhausted.Kill this, [1], [E]: Draw 1.',
		// [>] ties to an ability Grouper, and sets Keyword.associated
		"[Legion][>] You may play me from your trash for [3][R]. (Get the effect if you've played another card this turn.)",
		// [>>] nests rather than chains: Level's granted ability IS the
		// Reaction-tied ability, not a sibling of it
		'[Level 6][>] [>>][Reaction][>] [E]: [Add] [1][A]. (Use this ability only while you have 6+ XP.)',
		// external cost (818.1.c) is a Grouper, not a prop, per your steer
		'[Equip] [1][R] ([1][R]: Attach this to a unit you control.)',
		// dash-introduced cost needs no special case: it's just an ordinary
		// ability-tie whose right side happens to read as a cost
		'[Empower] — Discard 1 (Pay the cost: Empower me.)',
		// [Add] isn't a keyword (429.5) but still takes an external symbol-run
		'When I move, [Add] [1][A].',
		// [12] must read as one Symbol, exactly like [1]
		'[Empower] [12]. This ability costs [1] less for each rune you control.',
		// might modifier vs. a hyphen that merely joins two words
		'Give a unit -4 [M] this turn.',
		'I have [Quick-Draw] now.',
		// parenthetical mid-sentence: the stop follows the reminder
		"I can be played to a battlefield where there are enemy units (even if you don't have units there).",
	]
	for (const c of cases) {
		console.log('\n### ' + c)
		const tokens = tokenize(c)
		prettyPrint(parse(new TokenStream(tokens)))
	}
}
