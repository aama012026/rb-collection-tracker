import { PassThrough, pipeline, Readable } from "node:stream"
import { encoders, pickEncoding, type Encoding } from "./pickEncoding"

interface DatastarEventModifiers {
	selector?: string,
	mode?:
	| 'outer' | 'inner' | 'replace' | 'remove'
	| 'prepend' | 'append' | 'before' | 'after',
	namespace?: 'svg' | 'mathml',
	useViewTransition?: boolean
}

export function patchSignals(
	data: Record<string, unknown>,	onlyIfMissing: boolean = false
): string {
	const ssEvent = (
		`event: datastar-patch-signals\n` +
		`data: onlyIfMissing ${onlyIfMissing}\n` +
		`data: signals ${JSON.stringify(data)}\n\n`
	)
	return ssEvent
}

export function patchElements(elements: string, modifiers?: DatastarEventModifiers) {
	let ssEvent = `event: datastar-patch-elements\n`
	if(modifiers) {
		const {selector, mode, namespace, useViewTransition} = modifiers
		ssEvent += selector ? `data: selector ${selector}\n` : ''
		ssEvent += mode ? `data: mode ${mode}\n` : ''
		ssEvent += namespace ? `data: namespace ${namespace}\n` : ''
		ssEvent += useViewTransition ? `data: useViewTransition true\n` : ''
	}
	elements.split('\n').forEach(line => ssEvent += `data: elements ${line}\n`)
	ssEvent += '\n'
	return ssEvent
}

export function sseResponse(
	req: Request, events: AsyncIterable<string>, serverTimings: string[], ...preferredEncoding: Encoding[]
): Response {
	const headers: Record<string, string> = {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		'Vary': 'Accept-Encoding',
		'Server-Timing': serverTimings.join(', ')
	}

	const encoding = pickEncoding(req, ...preferredEncoding)
	const stage = encoding ? encoders[encoding]() : new PassThrough()
	if(encoding) {headers['Content-Encoding'] = encoding}

	pipeline(Readable.from(events), stage, (err) => {
		// Premature close is the normal "browser aborted / user re-sorted" case.
		if(err && (err as NodeJS.ErrnoException).code !== 'ERR_STREAM_PREMATURE_CLOSE') {
			console.error('SSE stream failed:', err)
		}
	})

	// Explicit cancellation path, in case the web-stream bridge doesn't forward aborts.
	req.signal.addEventListener('abort', () => stage.destroy(), {once: true})

	return new Response(Readable.toWeb(stage) as ReadableStream<Uint8Array>, {headers})
}

export async function* once(event: string) {yield event}