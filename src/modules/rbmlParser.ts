import { lex, type Token } from "./rbmlLexer"
import stringify, { prettyPrint } from "./stringify"

/*
GRAMMAR:
Symbol = OPEN_BRACKET (WORD.len=1|NUMBER) CLOSE_BRACKET
// Sometimes the keyword has a number as in Assault X, sometimes it has a [Cost] as in Equip [Cost]
Keyword = OPEN_BRACKET WORD (OTHER=' ' NUMBER|Symbol*)? CLOSE_BRACKET
AbilityAssociator = (OPEN_BRACKET GT CLOSE_BRACKET) | (Keyword OTHER=' ' (HYPHEN|EN_DASH|EM_DASH))
CostEffectDelim = COLON
ReminderText = OPEN_PAREN (ANY*) CLOSE_PAREN
MightSymbol = Symbol='[M]'
MightModifier = (OTHER='+'|'-') NUMBER OTHER=' ' MightSymbol
MightCount = NUMBER OTHER=' ' MightSymbol

// Cost isn't a lexical category — [R], [E], [1] etc. are always just Symbols.
// "Cost" only exists as a *position* in the grammar: one or more Symbol/Keyword
// groups (optionally comma-separated) that happen to sit directly before a COLON.
// So we don't classify a Symbol as "cost" when we parse it — ActivatedAbility
// looks ahead for a COLON to decide whether the bracket run it just read was a
// Cost or just a run of Keywords.
Cost = (Symbol|Keyword) (OTHER=',' OTHER=' ' (Symbol|Keyword))*
ActivatedAbility = Cost COLON Instruction+

// Abilities are just concatenated with no separator token at all, e.g.
// "I enter ready.[E]: Give a unit +3 [M] this turn." or
// "[Hidden] (...)When you play me to a battlefield, deal 2 to an enemy unit here."
// So RulesText can't split on a delimiter — it has to recognize where each
// Ability *starts*. Bracket-starting Abilities (Keyword / ActivatedAbility) are
// unambiguous once you check for a COLON after the bracket run. Anything else
// is a TextAbility (Passive or Triggered) whose Instruction text just keeps
// consuming tokens until the next OPEN_BRACKET that starts a new Ability, or EOF.
TriggeredAbility = Instruction OTHER=',' Instruction+
// "Instruction" here is a stand-in for "run of WORD/NUMBER/OTHER/Symbol tokens
// forming a sentence" — still needs its own end condition (a '.' isn't reliable
// on its own, e.g. "I have 3 [M]." vs "3.5" never appears, but "Mr." style
// abbreviations don't either, so '.' + next-token-is-bracket-or-capital might
// be enough — worth testing against more real examples before committing).
RulesText = Ability*
Ability = Keyword | ActivatedAbility | TriggeredAbility | PassiveAbility
*/
export type Node =
| {kind: 'Symbol', value: string|number}
| {kind: 'Keyword', name: string, param?: number | Node[]}
| {kind: 'Text', value: string}
| {kind: 'ReminderText', value: Node[]}

interface TokenStream {tokens: Token[], pos:number}

function peek(stream:TokenStream, offset = 0) {
	return stream.tokens[stream.pos + offset]
}

// This has been flagged by AI as unusual as the incrementing happens before
// lookup, while the usual is opposite so that pos reflects next rather than
// current. Worth looking into switching around and seeing how downstream is
// affected at some point.
function nextToken(stream:TokenStream) {
	stream.pos++
	return stream.tokens[stream.pos]
}

function nextNonSpaceToken(stream:TokenStream) {
	let t = nextToken(stream)
	while(t?.type === 'OTHER' && t.value === ' ') {
		t = nextToken(stream)
	}
	return t
}

function assertType(stream:TokenStream, type:Token['type']) {
	const token = nextNonSpaceToken(stream)
	if(token?.type !== type) {
		throw new Error(`Expected ${type}, got ${stringify(token) ?? 'EOF'} at pos ${stream.pos}}`)
	}
}

// Worked example: Symbol = OPEN_BRACKET (WORD.len=1|NUMBER) CLOSE_BRACKET
export function parseBracketedText(stream: TokenStream): Node {
	let token = nextNonSpaceToken(stream)
	if(!token) {
		throw new Error(`End of stream`)
	}
	if(token.type ==='NUMBER') {
		assertType(stream, 'CLOSE_BRACKET')
		return {kind:'Symbol', value: token.value}
	}
	else if(token.type === 'WORD') {
		if(token.value.length === 1) {
			assertType(stream, 'CLOSE_BRACKET')
			return {kind: 'Symbol', value: token.value}
		}
		else {
			// Keyword
			const node:Node = {kind:'Keyword', name: token.value}
			token = nextNonSpaceToken(stream)
			if(!token) {
				throw new Error(`End of stream`)
			}
			if(token.type === 'NUMBER') {
				node.param = token.value
				return node
			}
			else {
				stream.pos--
			}
			/*	This piece was written with the assumption of cost inside the []
		 		of the keyword. The mock data does not have this, but the rules
				templating is ambigous, so we keep it around just in case for
				the real API.
			*/
			// else if(token.type ==='OPEN_BRACKET') {
			// 	const cost:Node[] = []
			// 	while(token?.type === 'OPEN_BRACKET') {
			// 		cost.push(parseBracketedText(stream))
			// 		token = nextToken(stream)
			// 	}
			// 	stream.pos--
			// 	node.param = cost
			// }
			assertType(stream, 'CLOSE_BRACKET')
			return node
		}
	}
	else {
		throw new Error(`Expected a 1-letter WORD or a NUMBER inside [ ], got ${token.type}`)
	}
}

function parseReminderText(stream:TokenStream): Node {
	const value: Node[] = []
	let token = nextToken(stream)
	let textString = ''
	while(token && token.type !== 'CLOSE_PAREN') {
		if(token.type === 'OPEN_BRACKET') {
			if(textString !== '') {
				value.push({kind: 'Text', value:textString})
				textString = ''
			}
			value.push(parseBracketedText(stream))
			// stream.pos--
		}
		else if(token.type === 'WORD' || token.type === 'NUMBER' || token.type === 'OTHER') {
			textString += String(token.value)
		}
		token = nextToken(stream)
	}
	value.push({kind: 'Text', value:textString})
	stream.pos--
	assertType(stream, 'CLOSE_PAREN')
	return {kind: 'ReminderText', value}

}
// TODO(you): Keyword = OPEN_BRACKET WORD (OTHER=' ' NUMBER|Symbol*)? CLOSE_BRACKET
// Try it against: "[Ambush]", "[Assault 2]", "[Hunt 2]", "[Level 3]"
prettyPrint(parseBracketedText({tokens: lex('[ E]'), pos:0}))
prettyPrint(parseBracketedText({tokens: lex('[12]'), pos:0}))
prettyPrint(parseBracketedText({tokens: lex('[A ]'), pos:0}))
prettyPrint(parseBracketedText({tokens: lex('[ Ambush]'), pos:0}))
prettyPrint(parseBracketedText({tokens: lex('[Assault 2]'), pos:0}))
prettyPrint(parseBracketedText({tokens: lex('[Hunt 2]'), pos:0}))
prettyPrint(parseBracketedText({tokens: lex('[ Level  3]'), pos:0}))
prettyPrint(parseBracketedText({tokens: lex('[Ambush ]'), pos:0}))

prettyPrint(parseReminderText({tokens: lex(`(+2 [M] while it's an attacker. It can move from battlefield to battlefield.)`), pos:0}))