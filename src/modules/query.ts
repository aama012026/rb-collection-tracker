import { sql } from "bun";

export async function update<O extends object, K extends keyof O> (
	table:string, row:O, pkColumn:K
) {
	await sql`UPDATE ${table} SET ${sql(row)} WHERE id = ${row[pkColumn]}`
}

export function WhereIn(...filters:{column:string, filterList:string[], exclude: boolean}[]) {
	const conditions: string[] = []
	filters.forEach(({column, filterList, exclude}) => {
		if(filterList.length > 0) {
			conditions.push(`${column}${exclude ? ' NOT' : ''} IN ('${filterList.join(`','`)}')`)
		}
	})
	return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ``
}