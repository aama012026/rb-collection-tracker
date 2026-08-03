export default function stringify(value: unknown, tabStops = 0, keyLength = 0): string {
	const MAX_COLUMNS = 80
	const TAB_SIZE = 4
	const outerTab = '\t'.repeat(tabStops)
	const innerTab = '\t'.repeat(tabStops + 1)

	// Return as literals instead of string versions (don't wrap in quotes)
	if(value === null || typeof value === 'number' || typeof value === 'boolean') {
		return `${value}`
	}

	// Format objects and arrays
	if(Array.isArray(value)) {
		if(value.length === 0) return '[]'
		const items = value.map(i =>
			`${stringify(i, tabStops + 1)}`
		)
		return `[${formatCollection(items)}]`
	}

	if(typeof value === 'object') {
		const entries: string[] = []
		Object.entries(value).forEach(([k, v]) => {
			if(v === undefined){
				return
			}
			// Unquoted key if valid, quoted if not
			const key = /^\w+$/.test(k) ? k : JSON.stringify(k)
			entries.push (`${key}: ${stringify(v, tabStops + 1, key.length)}`)
		})
		return `{${formatCollection(entries)}}`
	}
	// Catch other types we don't know or care about
	else {
		return JSON.stringify(value, null, '\t')
	}
	// Format on same line or one separate line if possible.
	function formatCollection(items: string[]) {
		const itemsString = items.join(', ')
		if(itemsString.length + keyLength + tabStops * 4 <= MAX_COLUMNS - 2) {
			return `${itemsString}`
		}
		else if(itemsString.length + (tabStops + 1) * TAB_SIZE <= MAX_COLUMNS) {
			return `\n${innerTab + itemsString}\n${outerTab}`
		}
		else {
			return `\n${
				innerTab + items.join(`,\n${innerTab}`)}\n${outerTab}`
		}
	}
}

export function prettyPrint(value:unknown):void {
	console.log(stringify(value))
}