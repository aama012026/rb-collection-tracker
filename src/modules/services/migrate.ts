import createStoredFunctions from "../../schema/createFunctions"
import createStoredProcedures from "../../schema/createProcedures"
import createTables from "../../schema/createTables"
import createUsers from "../../schema/createUsers"
import createViews from "../../schema/createViews"
import seedTables from "../../schema/seedDB"
import generateTableTypes from "../generateTableTypes"
import { prettyPrint } from "../stringify"

const migrate = new Bun.SQL({
	adapter:'mariadb',
	username:process.env.DB_MIGRATE_USER,
	password:process.env.DB_MIGRATE_PASS,
	host:process.env.DB_HOST,
	port:process.env.DB_PORT,
	database:process.env.DB_NAME,
	bigint:true
})

await createTables(migrate)
await createStoredFunctions(migrate)
await createStoredProcedures(migrate)
await createViews(migrate)
await seedTables(migrate)

if(process.env.GENERATE_DB_TYPES === 'true') {
	await generateTableTypes(migrate,
		'metadata',
		'rarities',
		'sets',
		'cards',
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
	)
}
else {
	prettyPrint('GENERATE_DB_TYPES is not set, skipping type generation.')
}
await migrate.close()

const root = new Bun.SQL({
	adapter:'mariadb',
	username:'root',
	password:process.env.DB_ROOT_PASS,
	host:process.env.DB_HOST,
	port:process.env.DB_PORT,
	database:process.env.DB_NAME,
	bigint:true
})

await createUsers(root)
await root.close()

prettyPrint('done...')