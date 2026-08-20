export type Token =
| {name:'SYMBOL', value:string}
| {name:'OPEN_BRACKET'}
| {name:'CLOSE_BRACKET'}
| {name:'OPEN_PAREN'}
| {name:'CLOSE_PAREN'}
| {name:'OP', value: string}
| {name:'DASH', value: string}
| {name:'COLON'}
| {name:'COMMA'}
| {name:'DOT'}
| {name:'WORD', value: string}
| {name:'NUMBER', value: number}
| {name:'SPACE'}
| {name:'OTHER', value: string}

const regex = /(?<op>\[>{1,2}\])|(?<sym>\[(?:\d+|\w)\])|(?<num>\d+)|(?<word>[a-zA-Z_]+)|(?<openBracket>\[)|(?<closeBracket>\])|(?<openParen>\()|(?<closeParen>\))|(?<dash>[\-–—])|(?<colon>:)|(?<comma>,)|(?<dot>\.)|(?<space>\s+)|(?<other>[\s\S])/y
export function tokenize(input: string): Token[] {
	const tokens: Token[] = []
	regex.lastIndex = 0
	let match
	while((match = regex.exec(input)) && match.groups) {
		const {groups} = match
		switch(true) {
			case !!groups.op:
				tokens.push({name:'OP', value: groups.op.slice(1, -1)})
				break;
			case !!groups.sym:
				tokens.push({name:'SYMBOL', value: groups.sym.slice(1, -1)})
				break;
			case !!groups.num:
				tokens.push({name:'NUMBER', value: Number(groups.num)})
				break;
			case !!groups.word:
				tokens.push({name:'WORD', value: groups.word})
				break;
			case !!groups.openBracket:
				tokens.push({name:'OPEN_BRACKET'})
				break;
			case !!groups.closeBracket:
				tokens.push({name:'CLOSE_BRACKET'})
				break;
			case !!groups.openParen:
				tokens.push({name:'OPEN_PAREN'})
				break;
			case !!groups.closeParen:
				tokens.push({name:'CLOSE_PAREN'})
				break;
			case !!groups.dash:
				tokens.push({name:'DASH', value: groups.dash})
				break;
			case !!groups.dot:
				tokens.push({name:'DOT'})
				break;
			case !!groups.colon:
				tokens.push({name:'COLON'})
				break;
			case !!groups.comma:
				tokens.push({name:'COMMA'})
				break;
			case !!groups.space:
				tokens.push({name:'SPACE'})
				break;
			case !!groups.other:
				tokens.push({name:'OTHER', value: groups.other})
				break;
		}
	}
	return tokens
}

export function reconstruct(tokens:Token[]) {
	return tokens.reduce((output, token) => {
		switch(token.name) {
			case 'OPEN_BRACKET':
				return output + '['
			case 'CLOSE_BRACKET':
				return output + ']'
			case 'OPEN_PAREN':
				return output + '('
			case 'CLOSE_PAREN':
				return output + ')'
			case 'DOT':
				return output + '.'
			case 'COLON':
				return output + ':'
			case 'COMMA':
				return output + ','
			case 'SPACE':
				return output + ' '
			case 'OP':
			case 'SYMBOL':
				return output + '[' + token.value + ']'
			case 'DASH':
			case 'NUMBER':
			case 'WORD':
			case 'OTHER':
				return output + token.value
			default:
				return output
		}
	}, '')
}