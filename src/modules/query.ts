import { SQL, sql } from "bun";

export async function update<O extends object, K extends keyof O> (
	table:string, row:O, pkColumn:K
) {
	await sql`UPDATE ${table} SET ${sql(row)} WHERE id = ${row[pkColumn]}`
}

// export function WhereIn(...filters:{column:string, filterList:string[], exclude: boolean}[]) {
// 	const conditions: string[] = []
// 	filters.forEach(({column, filterList, exclude}) => {
// 		if(filterList.length > 0) {
// 			conditions.push(`${column}${exclude ? ' NOT' : ''} IN ('${filterList.join(`','`)}')`)
// 		}
// 	})
// 	return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ``
// }

export function whereIn(sql:SQL, ...filters:{
	column:string,
	filterList: {require:string[], exclude:string[]},
	subClause?: {outerColumn:string, innerColumn:string, innerTable: string}
}[]) {
	const clauses: SQL.Query<any>[] = []
	filters.forEach(({column, filterList, subClause}) => {
		const parts: SQL.Query<any>[] = []
		if(filterList.require.length > 0) {
			parts.push(sql`${sql(column)} IN ${sql(filterList.require)}`)
		}
		if(filterList.exclude.length > 0) {
			parts.push(sql`${sql(column)} NOT IN ${sql(filterList.exclude)}`)
		}
		if(parts.length === 0) {
			return []
		}
		const clause = parts.reduce((accumulator, part) => sql`${accumulator} AND ${part}`)
		subClause ? clauses.push(
			sql`${sql(subClause.outerColumn)
				} IN (SELECT ${sql(subClause.innerColumn)
				} FROM ${sql(subClause.innerTable)
				} WHERE ${clause})`
		) : clauses.push(clause)
	})
	return clauses.length > 0 ? clauses.reduce((accumulator, clause) => sql`${accumulator} AND ${clause}`) : ``
}