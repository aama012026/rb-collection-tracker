type OpenBracket = {name:'OPEN_BRACKET'}
type CloseBracket = {name:'CLOSE_BRACKET'}
type OpenParen = {name:'OPEN_PAREN'}
type CloseParen = {name:'CLOSE_PAREN'}
type Associator = {name:'GT'}
type Plus = {name:'PLUS'}
type Hyphen = {name:'HYPHEN'}
type Infix = {name:'INFIX', value: string}
type Dot = {name:'DOT'}
type Word = {name:'WORD', value: string}
type NumberLiteral = {name:'NUMBER', value: number}
type Space = {name:'SPACE'}
type Other = {name:'OTHER', value: string}

export type Token = OpenBracket|CloseBracket|OpenParen|CloseParen
|Associator|Plus|Hyphen|Infix|Dot|Word|NumberLiteral|Space|Other

const regex = /(?<gt>>)|(?<num>\d+)|(?<word>[a-zA-Z_]+(\-[a-zA-Z]+)*)|(?<openBracket>\[)|(?<closeBracket>\])|(?<openParen>\()|(?<closeParen>\))|(?<plus>\+)|(?<hyphen>\-)|(?<infix> [\-–—] |[:,] )|(?<dot>\.)|(?<space> +)|(?<other>[\s\S])/y
export function tokenize(input: string): Token[] {
	if(input === '[NO TEXT]') {
		return []
	}
	const tokens: Token[] = []
	regex.lastIndex = 0
	let match
	while((match = regex.exec(input)) && match.groups) {
		const {groups} = match
		switch(true) {
			case !!groups.gt:
				tokens.push({name:'GT'})
				break
			case !!groups.num:
				tokens.push({name:'NUMBER', value: Number(groups.num)})
				break
			case !!groups.word:
				tokens.push({name:'WORD', value: groups.word})
				break
			case !!groups.openBracket:
				tokens.push({name:'OPEN_BRACKET'})
				break
			case !!groups.closeBracket:
				tokens.push({name:'CLOSE_BRACKET'})
				break
			case !!groups.openParen:
				tokens.push({name:'OPEN_PAREN'})
				break
			case !!groups.closeParen:
				tokens.push({name:'CLOSE_PAREN'})
				break
			case !!groups.plus:
				tokens.push({name:'PLUS'})
				break
			case !!groups.hyphen:
				tokens.push({name:'HYPHEN'})
				break
			case !!groups.infix:
				tokens.push({name:'INFIX', value: groups.infix})
				break
			case !!groups.dot:
				tokens.push({name:'DOT'})
				break
			case !!groups.space:
				tokens.push({name:'SPACE'})
				break
			case !!groups.other:
				tokens.push({name:'OTHER', value: groups.other})
				break
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
			case 'SPACE':
				return output + ' '
			case 'PLUS':
				return output + '+'
			case 'HYPHEN':
				return output + '-'
			case 'GT':
				return output + '>'
			case 'INFIX':
			case 'NUMBER':
			case 'WORD':
			case 'OTHER':
				return output + token.value
			default:
				return output
		}
	}, '')
}