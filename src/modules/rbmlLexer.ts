import { prettyPrint } from "./stringify"

export type Token =
| {type:'OPEN_BRACKET'}
| {type:'CLOSE_BRACKET'}
| {type:'OPEN_PAREN'}
| {type:'CLOSE_PAREN'}
| {type:'GT'}
| {type:'HYPHEN'}
| {type:'EN_DASH'}
| {type:'EM_DASH'}
| {type:'COLON'}
| {type:'WORD', value: string}
| {type:'NUMBER', value: number}
| {type:'OTHER', value: string}

const regex = /(?<num>\d+)|(?<word>[a-zA-Z_]+)|(?<openBracket>\[)|(?<closeBracket>\])|(?<openParen>\()|(?<closeParen>\))|(?<gt>\>)|(?<hyphen>\-)|(?<enDash>\–)|(?<emDash>\—)|(?<colon>:)|(?<other>[\s\S])/y
export function lex(input: string): Token[] {
	const tokens: Token[] = []
	regex.lastIndex = 0
	let match
	while((match = regex.exec(input)) && match.groups) {
		switch(true) {
			case !!match.groups.num:
				tokens.push({type:'NUMBER', value: Number(match.groups.num)})
				break;
			case !!match.groups.word:
				tokens.push({type:'WORD', value: match.groups.word})
				break;
			case !!match.groups.openBracket:
				tokens.push({type:'OPEN_BRACKET'})
				break;
			case !!match.groups.closeBracket:
				tokens.push({type:'CLOSE_BRACKET'})
				break;
			case !!match.groups.openParen:
				tokens.push({type:'OPEN_PAREN'})
				break;
			case !!match.groups.closeParen:
				tokens.push({type:'CLOSE_PAREN'})
				break;
			case !!match.groups.gt:
				tokens.push({type:'GT'})
				break;
			case !!match.groups.hyphen:
				tokens.push({type:'HYPHEN'})
				break;
			case !!match.groups.enDash:
				tokens.push({type:'EN_DASH'})
				break;
			case !!match.groups.emDash:
				tokens.push({type:'EM_DASH'})
				break;
			case !!match.groups.colon:
				tokens.push({type:'COLON'})
				break;
			case !!match.groups.other:
				tokens.push({type:'OTHER', value: match.groups.other})
				break;
		}
	}
	return tokens
}

export function reconstruct(tokens:Token[]) {
	return tokens.reduce((output, token) => {
		switch(token.type) {
			case 'OPEN_BRACKET':
				return output + '['
			case 'CLOSE_BRACKET':
				return output + ']'
			case 'OPEN_PAREN':
				return output + '('
			case 'CLOSE_PAREN':
				return output + ')'
			case 'GT':
				return output + '>'
			case 'HYPHEN':
				return output + '-'
			case 'EN_DASH':
				return output + '–'
			case 'EM_DASH':
				return output + '—'
			case 'COLON':
				return output + ':'
			case 'NUMBER':
			case 'WORD':
			case 'OTHER':
				return output + token.value
			default:
				return output
		}
	}, '')
}