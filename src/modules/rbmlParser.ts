import { tokenize, reconstruct, type Token } from "./rbmlLexer"
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

type Keyword = {
	kind: 'keyword',
	name: string,
	param?: number,
	associated?: boolean,
	isNested?: boolean
}
type Group = {kind: 'group', value: Node[]}
type SymbolRun = {kind: 'symbol_run', value:Node[]}
type InfixGroup = {
	kind:'infix_group', operator:string, lefthand:Node[], righthand:Node[]
}
type ActivatedAbility = {
	kind:'ability',
	activated:true,
	cost:Node[],
	effect:Node[]
}
type DelimitedList = {kind:'list', value: Node[][], separator:', '}
type Root = {kind: 'root', value: Node[]}
type Symbol = {kind: 'symbol', value: string|number}
const resourceSymbols = ['R', 'G', 'B', 'O', 'P', 'Y', 'C', 'A'] as const
type Text = {kind: 'text', value: string}
type Ability = {kind: 'ability', activated?:false, value: Node[]}
type Reminder = {kind: 'reminder_text', value: Node[]}
type Might = {kind: 'might', amount: number, sign?: '+'|'-'}
type Experience = {kind: 'xp', amount: number, sign?: '+'|'-'}


export type Node =
| Root
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

	prev(): Token|undefined {
		this._pos--
		return this.peek()
	}
}


export function parseBrackets(stream: TokenStream): Node {
	stream.skipSpace()
	let t = stream.peekExisting()
	if(t.name === 'NUMBER' || (t.name === 'WORD' && t.value.length === 1)) {
		// Symbol
		stream.next()
		stream.assertType('CLOSE_BRACKET')
		stream.next()
		return {kind:'symbol', 'value':t.value}
	}
	// Keyword
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

	if(stream.peek()?.name === 'OPEN_BRACKET' && stream.peek(1)?.name === 'GT') {
		stream.skip(2)
		stream.assertType('CLOSE_BRACKET')
		stream.next()
		node.associated = true
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
	if(amount && stream.peek(unitStartPos - 1)?.name === 'SPACE') {
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
	const item = parseCardRulesText(stream, 'list_item')
	return item.kind === 'group' ? item.value : [item]
}

function parseAbilityContent(stream: TokenStream): Node[] {
	const node = parseCardRulesText(stream, 'ability')
	return node.kind === 'ability' && !node.activated ? node.value : [node]
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

export function parseCardRulesText(stream:TokenStream, kind:'root'|'reminder_text'|'ability'|'list_item' = 'root'): Node {
	let token = stream.next()
	const children:Node[] = []
	while(token) {
		const {name} = token
		// Return a bracketed node or groups of bracketed nodes.
		if(name === 'OPEN_BRACKET') {
			let bracketNode:Node|null = parseBrackets(stream)
			if(bracketNode.kind === 'symbol') {
				const symbols:Node[] = []
				while(bracketNode) {
					symbols.push(bracketNode)
					bracketNode = tryParseSymbol(stream)
				}
				if(symbols.length === 1) {
					children.push(symbols[0]!)
				}
				else {
					children.push({kind:'symbol_run', value:symbols})
				}

				const prevToken = children[children.length - 2]
				if(prevToken?.kind === 'keyword' && !prevToken.associated) {

				}
			}
			else if(bracketNode.kind === 'keyword' && bracketNode.associated) {
				children.push({kind:'ability', value:[bracketNode, parseCardRulesText(stream, 'ability')]})
			}
			else {
				children.push(bracketNode)
			}
		}
		// Start new group.
		else if(name === 'OPEN_PAREN') {
			children.push(parseCardRulesText(stream, 'reminder_text'))
		}
		// Close group.
		else if(name === 'CLOSE_PAREN') {
			const prevNode = children[children.length-1]
			if(prevNode?.kind === 'text' && prevNode.value === '.') {
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
				const listItems:Node[][] = []
				listItems.push(children.splice(0))
				while(stream.peek(-1)?.name === 'COMMA') {
					listItems.push(parseListItem(stream))
				}
				stream.prev()
				children.push({kind:'list', separator:', ', value: listItems})
			}
		}
		else if(name === 'DOT') {
			if((kind === 'ability') && stream.peek()?.name !== 'SPACE') {
				children.push({kind:'text', value:'.'})
				const node:Ability = {kind, value: children}
				return node
			}
			else if(kind === 'list_item') {
				return {kind: 'group', value: children}
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
			if(kind !== 'ability' && kind !== 'list_item') {
				if(name === 'SPACE') {
					stream.next()
				}
				else {
					children.push(parseCardRulesText(stream, 'ability'))
				}
			}
			else {
				children.push(parseText(stream))
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
			if(token.value === ': ') {
				infixGroup = {
					kind:'ability',
					activated:true,
					cost:lefthand,
					effect: parseAbilityContent(stream)
				}
			}
			else {
				infixGroup = {
					kind: 'infix_group',
					lefthand,
					operator: token.value,
					righthand: parseAbilityContent(stream)
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
	return {kind: kind === 'list_item' ? 'group' : kind, value:children} as Node
}

/* --- AI generated code -------------------------------------------------------
	(Code inside this block are utility functions generated by LLMs.
	They are purely tooling and has no functionality relating to the program.)
*/
// Signed: Claude Sonnet 5 (Anthropic), 2026-08-26.
// Generalized below so new Node kinds/fields never need a matching case here:
// it reads each node's own properties instead of switching on `kind`.
type DescribedNode = {text: string, children: {label?: string, node: Node}[]}

function isNode(value: unknown): value is Node {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		&& typeof (value as {kind?: unknown}).kind === 'string'
}

function describeNode(node: Node): DescribedNode {
	// Each entry is one child-bearing field on this node, already reduced to
	// the Node[] it contributes (a single Node becomes a one-element array,
	// and a DelimitedList-style Node[][] becomes one synthetic 'item' node
	// per inner array -- `{kind: 'item', ...}` is a display-only shape, not
	// a real Node variant).
	const childFields: [string, Node[]][] = []
	const scalars: [string, unknown][] = []

	for(const [key, value] of Object.entries(node)) {
		if(key === 'kind') continue
		if(isNode(value)) {
			childFields.push([key, [value]])
		}
		else if(Array.isArray(value) && value.every(isNode)) {
			childFields.push([key, value])
		}
		else if(Array.isArray(value) && value.every(v => Array.isArray(v) && v.every(isNode))) {
			childFields.push([key, value.map(itemNodes => ({kind: 'item', value: itemNodes} as unknown as Node))])
		}
		else if(value !== undefined && value !== false) {
			scalars.push([key, value])
		}
	}

	const children: {label?: string, node: Node}[] = []
	if(childFields.length === 1) {
		// Only one child-bearing field (e.g. Root/Group/Ability's `value`):
		// no label needed, the parent's own kind already gives it context.
		childFields[0]![1].forEach(n => children.push({node: n}))
	}
	else {
		// More than one (e.g. InfixGroup's lefthand/righthand, or
		// ActivatedAbility's cost/effect): each field needs its own label so
		// they don't bleed into each other. A single-element field is
		// labeled directly; a multi-element one gets a small synthetic
		// wrapper (its own `kind` is the field name) so its several
		// children stay visually grouped under that label.
		for(const [key, nodes] of childFields) {
			if(nodes.length === 1) {
				children.push({label: key, node: nodes[0]!})
			}
			else {
				// Empty `kind`: this wrapper contributes no text of its own,
				// just its (labeled) children -- see withLabel below.
				children.push({label: key, node: {kind: '', value: nodes} as unknown as Node})
			}
		}
	}

	const scalarText = (value: unknown) => typeof value === 'string' ? value : JSON.stringify(value)
	const display = ([key, value]: [string, unknown]) =>
		value === true ? key : `${key}: ${scalarText(value)}`
	const summary = scalars.length === 1 && scalars[0]![1] !== true
		? scalarText(scalars[0]![1])
		: scalars.map(display).join(', ')

	return {text: summary ? `${node.kind}: ${summary}` : node.kind, children}
}

// Joins a label onto a value with a colon, e.g. `righthand: keyword: Add`,
// or just `righthand:` when there's no text to follow it (the value is
// purely a list of further children, rendered on the next lines instead).
function withLabel(label: string|undefined, value: string): string {
	if(!label) return value
	return value ? `${label}: ${value}` : `${label}:`
}

// Recursively renders a whole subtree as one line, e.g. `symbol_run: [symbol: 2, symbol: R]`
// nested arbitrarily deep -- used by formatAst to decide what fits before falling back to
// one-line-per-node.
function renderInline(node: Node): string {
	const {text, children} = describeNode(node)
	if(children.length === 0) return text
	const inner = children
		.map(c => withLabel(c.label, renderInline(c.node)))
		.join(', ')
	return withLabel(text, `[${inner}]`)
}

/*
Prints an AST as an indented outline instead of a JS-object dump: one node
per line, with only the fields that carry information for that kind (a
Keyword's `isNested: false` or an unset `associated` don't add anything when
scanning for bugs, so they're dropped rather than printed). Any subtree that
fits within `columns` at its current indentation collapses onto a single
line -- pass a narrower value for side-by-side viewing, or a wider one for a
full-width terminal.
*/
export function formatAst(node: Node, columns = 100): string {
	const lines: string[] = []
	function walk(node: Node, prefix: string, connector: string, childPrefix: string, label?: string) {
		const {text, children} = describeNode(node)
		const inlineLine = `${prefix}${connector}${withLabel(label, renderInline(node))}`
		if(children.length === 0 || inlineLine.length <= columns) {
			lines.push(inlineLine)
			return
		}
		lines.push(`${prefix}${connector}${withLabel(label, text)}`)
		children.forEach((child, i) => {
			const isLast = i === children.length - 1
			walk(
				child.node,
				childPrefix,
				isLast ? '└─ ' : '├─ ',
				childPrefix + (isLast ? '   ' : '│  '),
				child.label
			)
		})
	}
	walk(node, '', '', '')
	return lines.join('\n')
}
// -----------------------------------------------------------------------------

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
		prettyPrint(parseCardRulesText(new TokenStream(tokens)))
	}
}
