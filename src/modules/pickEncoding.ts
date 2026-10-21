import {type Transform} from "node:stream"
import { constants, createBrotliCompress, createGzip } from "node:zlib"

export const encoders = {
	br: () => createBrotliCompress({
		flush: constants.BROTLI_OPERATION_FLUSH,
		params: {[constants.BROTLI_PARAM_QUALITY]: 4}
	}),
	gzip: () => createGzip({flush: constants.Z_SYNC_FLUSH})
} satisfies Record<string, () => Transform>
export type Encoding = keyof typeof encoders

export function pickEncoding(
	req: Request, ...preferred: Encoding[]
): Encoding | null {
	const header = req.headers.get('accept-encoding') ?? ''
	const accepted = new Map<string, number>()
	for(const part of header.split(',')) {
		const [name, ...params] = part.trim().toLowerCase().split(';')
		if(!name) {
			continue
		}
		const qParam = params.find(p => p.trim().startsWith('q='))
		const q = qParam ? Number(qParam.trim().slice(2)) : 1
		accepted.set(name.trim(), Number.isNaN(q) ? 0 : q)
	}
	for(const encoding of preferred) {
		// An explicit entry wins over the `*` wildcard, so `br;q=0, *` still refuses br.
		if((accepted.get(encoding) ?? accepted.get('*') ?? 0) > 0) {
			return encoding
		}
	}
	return null
}