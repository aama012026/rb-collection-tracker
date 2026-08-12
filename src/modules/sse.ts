interface DatastarEventModifiers {
	selector?: string,
	mode?: 'outer' | 'inner' | 'replace' | 'prepend' | 'append' | 'before' | 'after' | 'remove',
	namespace?: 'svg' | 'mathml',
	useViewTransition?: boolean
}

export function patchSignals(
	data: Record<string, any>,
	onlyIfMissing: boolean = false
): string {
	const ssEvent = (
		`event: datastar-patch-signals\n` +
		`data: onlyIfMissing ${onlyIfMissing}\n` +
		`data: signals ${JSON.stringify(data)}\n\n`
	)
	return ssEvent
}

export function patchElements(data: string[], modifiers?: DatastarEventModifiers) {
	let ssEvent = `event: datastar-patch-elements\n`
	if(modifiers) {
		const {selector, mode, namespace, useViewTransition} = modifiers
		ssEvent += selector ? `data: selector ${selector}\n` : ''
		ssEvent += mode ? `data: mode ${mode}\n` : ''
		ssEvent += namespace ? `namespace: ${namespace}\n` : ''
		ssEvent += useViewTransition ? `useViewTransition true\n` : ''
	}
	data.forEach(line => ssEvent += `data: elements ${line}\n`)
	ssEvent += '\n'
	return ssEvent
}