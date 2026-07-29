import { SQL } from "bun";

const USER = 'mikkel'
const PASSWORD = ''
const HOST = 'localhost'
const PORT = '3306'

const sql = new SQL(`mysql://${USER}:${PASSWORD}@${HOST}:${PORT}`)
await sql.file('src/sql/createDb.sql');