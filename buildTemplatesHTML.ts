import { file } from 'bun'
const templates = await file('src/html/templates.html').text()

const templateRegexp = /<template\s+id="([^"]+)">([\s\S]*?)<\/template>/g
const placeholderRegexp = /%\{([^}]+)\}/g
const placehodlerExcludingType = /%\{([^:}]+)(?::[^}]*)?\}/g

const matches = [...templates.matchAll(templateRegexp)]
const functions = matches.map(([_, id, content]) => {
	if(!(id && content)) {
		throw new Error('match for template was malformed')
	}
	// We're converting template id from kebab-case to camelCase.
	const name = 'make' + id.split('-').map((part) => {
		return part[0]!.toUpperCase() + part.slice(1)
	}).join('')
	const variables = new Map<string, string>()
	for (const [_, placeholder] of content.matchAll(placeholderRegexp)) {
		const ph = placeholder!
		const typeSeparatorPos = ph.indexOf(':')
		let key = placeholder
		let type = 'unknown'
		if(typeSeparatorPos !== -1) {
			key = ph.slice(0, typeSeparatorPos).trim()
			type = ph.slice(typeSeparatorPos + 1).trim()
			if(!variables.has(key) || variables.get(key) === 'unknown') {
				variables.set(key, type)
			}
		}
	}
	const params = [...variables.entries()].map(([key, type]) => `${key}: ${type}`)
	const body = content.trim()
		.replaceAll(placehodlerExcludingType, '${$1}')
		.replaceAll('`', '\\`')
	const signatureName = `export function ${name}(`
	const returnType = '): string {'
	let paramString = params.join(', ')
	if((signatureName + paramString + returnType).length > 80) {
		paramString = `\n\t${params.join(',\n\t')}\n\t`
	}
	return(
		`${signatureName}${paramString}${returnType}\n` +
			`\treturn html\`${body}\`\n` +
		`}`
	)
})

await Bun.write('transpiled/templates.ts',
	'// We tag the literals for syntax highlighting\n' +
	'const html = String.raw\n\n' +
	functions.join('\n\n')
)