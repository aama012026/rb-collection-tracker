import { SQL, sql } from "bun";
import type { Artists, ArtistsRow, CardDetails, Shorthands } from "../../gen/dbTableInterfaces";
import type { CardCollectionSignals } from "../types/DomainTypes";

export async function update<O extends object, K extends keyof O> (
	table:string, row:O, pkColumn:K
) {
	await sql`UPDATE ${table} SET ${sql(row)} WHERE id = ${row[pkColumn]}`
}

export function whereIn(sql:SQL, ...filters:{
	column:string,
	filterList: {require:string[], exclude:string[]},
	subClause?: {outerColumn:string, innerColumn:string, innerTable: string}
}[]) {
	const clauses: SQL.Query<any>[] = []

	filters.forEach(({column, filterList, subClause}) => {
		if(filterList.require.length > 0) {
			subClause ? clauses.push(sql`
				${sql(subClause.outerColumn)
				} IN (SELECT ${sql(subClause.innerColumn)
				} FROM ${sql(subClause.innerTable)
				} WHERE ${sql(column)} IN ${sql(filterList.require)})
			`) : clauses.push(sql`
				${sql(column)} IN ${sql(filterList.require)}
			`)
		}
		if(filterList.exclude.length > 0) {
			subClause ? clauses.push(sql`
				${sql(subClause.outerColumn)
				} NOT IN (SELECT ${sql(subClause.innerColumn)
				} FROM ${sql(subClause.innerTable)
				} WHERE ${sql(column)} IN ${sql(filterList.exclude)})
			`) : clauses.push(sql`
				${sql(column)} NOT IN ${sql(filterList.exclude)}
			`)
		}
	})
	return clauses.length > 0 ? sql`${clauses.reduce((accumulator, clause) => sql`
		${accumulator} AND ${clause}
	`)}` : null
}

export async function queryCardArtists(
	sql:SQL, cardId:number
):Promise<Pick<ArtistsRow, 'name'|'website'>[]> {
	return await sql`
		SELECT name, website FROM artists WHERE id IN (
			SELECT artist_id FROM cards_x_artists WHERE card_id = ${cardId}
		)
	`
}

export async function queryShorthands(sql: SQL): Promise<Shorthands> {
	return await sql`SELECT * FROM shorthands;`
}

export async function queryCards(sql: SQL, signals: CardCollectionSignals): Promise<CardDetails> {
	const sortOrder = signals.sortOrder.map(s => sql`
		${sql(s.col
			.replace('set', 'set_code')
			.replace('number', 'collector_number')
			.replace('domain', 'domains')
			.replace('type', 'types')
		)} ${s.dir === 'ASC' ? sql`ASC` : sql`DESC`}`
	).reduce((accumulated, column) => sql`${accumulated}, ${column}`)

	const {filters} = signals
	const subCond = {outerColumn: 'id', innerColumn: 'card_id'}
	const filtersClause = whereIn(sql,
		{
			column: 'set_id',
			filterList: filters.set
		}, {
			column: 'domain_id',
			filterList: filters.domain,
			subClause: {...subCond, innerTable:'cards_x_domains'}
		}, {
			column: 'type_id',
			filterList: filters.type,
			subClause: {...subCond, innerTable:'cards_x_types'}
		}, {
			column: 'tag_id',
			filterList: filters.tag,
			subClause: {...subCond, innerTable:'cards_x_tags'}
		}
	)

	const whereSubClauses = []
	if(filtersClause) {whereSubClauses.push(filtersClause)}
	if(signals.searchTerm) {
		whereSubClauses.push(sql`
			CONCAT_WS(' ', riot_id, name, description) LIKE ${'%' + signals.searchTerm + '%'}
		`)
	}
	return await sql`
		SELECT * FROM card_details
		${whereSubClauses.length === 0 ? sql`` : sql`
			WHERE ${whereSubClauses.reduce((acc, clause) => sql`${acc} AND ${clause}`)}
		`}
		ORDER BY ${sortOrder};
	`
}