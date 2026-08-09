import { SQL } from "bun"

const {	DB_APP_USER, DB_APP_PASS, DB_HOST, DB_PORT} = process.env

const sql = new SQL({
	adapter:'mariadb',
	username:DB_APP_USER,
	password:DB_APP_PASS,
	host:DB_HOST,
	port:DB_PORT,
	database:'riftbound'
})
