import type { SQL } from "bun"
import { prettyPrint } from "../modules/stringify"

export default async function createUsers(sql: SQL): Promise<void> {
	await createServerUser(sql)
	await createUpdateUser(sql)
}

async function createServerUser(sql: SQL): Promise<void> {
	const {DB_NAME: db, DB_SERVER_USER, DB_SERVER_PASS} = process.env
	if(!(db && DB_SERVER_USER && DB_SERVER_PASS)) {
		throw new Error(`Cannot create user ${DB_SERVER_USER}:` +
			`Not all required environment variables are set`
		)
	}

	const user = sql.unsafe(`${escapeSQLLiteral(DB_SERVER_USER)}@'%'`)
	const pass = sql.unsafe(escapeSQLLiteral(DB_SERVER_PASS))

	prettyPrint(`Creating user ${DB_SERVER_USER}...`)
	await sql`CREATE USER IF NOT EXISTS ${user} IDENTIFIED BY ${pass}`
	prettyPrint(`User created if not existed...`)
	await sql`ALTER USER ${user} IDENTIFIED BY ${pass}`
	prettyPrint(`User altered...`)
	await sql`REVOKE ALL PRIVILEGES, GRANT OPTION FROM ${user};`
	prettyPrint(`Privileges revoked for user...`)
	await grantSelectOnTables(sql, user, db, [
		'rarities',
		'sets',
		'card_versions',
		'cards',
		'symbols',
		'domains',
		'types',
		'tags',
		'keywords',
		'artists',
		'cards_x_domains',
		'cards_x_types',
		'cards_x_tags',
		'cards_x_keywords',
		'cards_x_artists',
		'card_details',
		'shorthands'
	])
	prettyPrint(`Privileges granted to user...`)
	prettyPrint(await sql`SHOW WARNINGS`)
	prettyPrint(await sql`SHOW GRANTS FOR ${user}`)
}

async function createUpdateUser(sql: SQL): Promise<void> {
	const {DB_NAME: db, DB_UPDATE_USER, DB_UPDATE_PASS} = process.env
	if(!(db && DB_UPDATE_USER && DB_UPDATE_PASS)) {
		throw new Error(`Cannot create user ${DB_UPDATE_USER}:` +
			`Not all required environment variables are set`
		)
	}
	const user = sql.unsafe(`${escapeSQLLiteral(DB_UPDATE_USER)}@'%'`)
	const pass = sql.unsafe(escapeSQLLiteral(DB_UPDATE_PASS))

	prettyPrint(`Creating user ${DB_UPDATE_USER}...`)
	await sql`CREATE USER IF NOT EXISTS ${user} IDENTIFIED BY ${pass}`
	prettyPrint(`User created if not existed...`)
	await sql`ALTER USER ${user} IDENTIFIED BY ${pass}`
	prettyPrint(`User altered...`)
	await sql`REVOKE ALL PRIVILEGES, GRANT OPTION FROM ${user};`
	prettyPrint(`Privileges revoked for user...`)
	await grantExecuteOnProcedures(sql, user, db, [
		'split_string',
		'get_or_add_rarity',
		'get_or_add_type',
		'set_card_types',
		'get_or_add_domain',
		'set_card_domains',
		'get_or_add_artist',
		'set_card_artists',
		'set_artist_website',
		'get_or_add_tag',
		'insert_card_tag',
		'get_or_add_set',
		'get_card_version',
		'add_card',
	])
	prettyPrint(`Execute privileges granted to user...`)
	await grantSelectOnTables(sql, user, db, [])
	prettyPrint(`Select privileges granted to user...`)
	prettyPrint(await sql`SHOW WARNINGS`)
	prettyPrint(await sql`SHOW GRANTS FOR ${user}`)
}

async function grantSelectOnTables(
	sql: SQL, user: SQL.Query<any>, db: string, tables?:string[]
): Promise<void> {
	if(!(tables && tables.length > 0)) {
		await sql`GRANT SELECT ON ${sql(db)}.* TO ${user}`
	}
	else {
		for(const table of tables) {
			await sql`GRANT SELECT ON ${sql(`${db}.${table}`)} TO ${user};`
		}
	}
}

async function grantExecuteOnProcedures(
	sql: SQL, user: SQL.Query<any>, db: string, procedures?:string[]
): Promise<void> {
	if(!(procedures && procedures.length > 0)) {
		await sql`GRANT EXECUTE ON PROCEDURE ${sql(db)}.* TO ${user}`
	}
	else {
		for(const procedure of procedures) {
			await sql`
				GRANT EXECUTE ON PROCEDURE ${sql(`${db}.${procedure}`)}
				TO ${user}
			`
		}
	}
}

function escapeSQLLiteral(literal: string): string {
	const ALLOWED_LITERAL = /^[A-Za-z0-9_]{1,64}$/
	if(!ALLOWED_LITERAL.test(literal)) {
		// We do not print literal in case it is sensitive data, f.ex. password.
		throw new Error(
			`Cannot escape SQL literal.` +
			`It contains illegal characters or is longer than 64 characters`
		)
	}
	return `'${literal}'`
}