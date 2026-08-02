import { SQL } from "bun";

const {
	DB_ADMIN_USER:USER, DB_ADMIN_PASS:PASSWORD, DB_HOST:HOST, DB_PORT:PORT
} = process.env

console.log(`mariadb://${USER}:${PASSWORD}@${HOST}:${PORT}`)
const sql = new SQL(`mariadb://${USER}:${PASSWORD}@${HOST}:${PORT}/riftbound`)
await sql.file('src/sql/createDb.sql')
await sql.file('src/sql/seedDb.sql')
console.log(Bun.inspect(await sql`SELECT * FROM types;`))
console.log(Bun.inspect(await sql`SELECT * FROM rarities;`))
console.log(Bun.inspect(await sql`SELECT * FROM domains;`))
console.log(Bun.inspect(await sql`SELECT * FROM keywords;`))