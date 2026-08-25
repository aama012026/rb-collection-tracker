import type { SQL } from "bun"
import { prettyPrint } from "../modules/stringify"

export default async function seedTables(sql: SQL): Promise<void> {
	async function seedTable(name:string, query:SQL.Query<any>
	): Promise<void> {
		prettyPrint(`Creating stored procedure ${name}...`)
		await query
		prettyPrint(await sql`SHOW WARNINGS`)
	}

	prettyPrint('\n\x1b[32mSEEDING TABLES:')
	await seedTable('types', sql`
		INSERT INTO types (sort_order, name) VALUES
			(1, 'unit'),
			(2, 'gear'),
			(3, 'spell'),
			(4, 'battlefield'),
			(5, 'legend')
		ON DUPLICATE KEY UPDATE
			sort_order = VALUE(sort_order),
			name = VALUE(name)
		RETURNING *;
	`)

	await seedTable('rarities', sql`
		INSERT INTO rarities (sort_order, name) VALUES
			(1, 'common'),
			(2, 'uncommon'),
			(3, 'rare'),
			(4, 'epic'),
			(5, 'showcase')
		ON DUPLICATE KEY UPDATE
			sort_order = VALUE(sort_order),
			name = VALUE(name)
		RETURNING *;
	`)

	await seedTable('domains', sql`
		INSERT INTO domains (sort_order, name, shorthand) VALUES
			(1, 'fury', '[R]'),
			(2, 'calm', '[G]'),
			(3, 'mind', '[B]'),
			(4, 'body', '[O]'),
			(5, 'chaos', '[P]'),
			(6, 'order', '[Y]')
		ON DUPLICATE KEY UPDATE
			sort_order = VALUE(sort_order),
			name = VALUE(name),
			shorthand = VALUE(shorthand)
		RETURNING *;
	`)

	await seedTable('keywords', sql`
		INSERT INTO keywords (rules_entry, name, formatting, color, rules_description, card_description) VALUES
			(
				'805', 'accelerate', NULL, 'teal',
				'As you play me, you may pay [1][C] as an additional cost to have me enter ready.',
				'You may pay [1][C] as an additional cost to have me enter ready.'
			), (
				'806', 'action', '[Action]|[Action][>]', 'teal',
				'[I|This] can be [played|activated] during showdowns on any player''s turn.',
				'Play on your turn or in showdowns.'
			), (
				'807', 'assault', 'Assault [X]', 'magenta',
				'While I am an attacker, I have +[X][M].',
				'+[X][M] while I''m an attacker.'
			), (
				'808', 'deathknell', '[Deathknell][>] [Effect]', 'green',
				'When I die, [Effect].',
				'When I die, get the effect.'
			), (
				'809', 'deflect', 'Deflect [X]', 'green',
				'Spells and abilities an opponent controls that choose me cost [AX] more to play, as an additional cost for each time they choose me.',
				'Opponents must pay [AX] to choose me with a spell or ability.'
			), (
				'810', 'ganking', NULL, 'green',
				'I may move to a battlefield from another battlefield with a standard move.',
				'I can move from battlefield to battlefield.'
			), (
				'811', 'hidden', NULL, 'magenta',
				'While this card is in your hand or your Champion Zone on your turn during an Open State, you may pay [A] to hide this facedown at a battlefield you control that doesn''t already have a facedown card hidden there for as long as you control that battlefield. Beginning on the next turn, this gains [Reaction] and you may play this, ignoring its base cost.',
				'Hide now for [A] to react with later for [0].'
			), (
				'812', 'legion', '[Legion][>] [Text]|[Legion] — [Text]', 'teal',
				'If you have played another card this turn, this card gains [Text].',
				'[Text] (Get the effect if you''ve played another card this turn.)'
			), (
				'813', 'reaction', '[Reaction]|[Reaction][>]', 'teal',
				'[I|This] can be [played|activated] during Closed States on any player''s turn.',
				'Play any time, even before spells and abilities resolve.'
			), (
				'814', 'shield', 'Shield [X]', 'magenta',
				'While I am a defender, I have +[X][M]',
				'+[X][M] while I''m a defender.'
			), (
				'815', 'tank', NULL, 'magenta',
				'I must be assigned lethal damage before any other unit with the same controller as me that does not have [Tank] during the Combat Damage step.',
				'I must be assigned combat damage first.'
			), (
				'816', 'temporary', NULL, 'green',
				'At the start of your Beginning Phase, before scoring, kill this.',
				'Kill me at the start of your Beginning Phase, before scoring.'
			), (
				'817', 'vision', NULL, 'gray',
				'When this is played, look at the top card of your Main Deck. You may recycle it.',
				'When you play me, look at the top card of your Main Deck. You may recycle it.'
			), (
				'818', 'equip', 'Equip [Cost]|Equip — [Cost]', 'gray',
				'[Cost]: Attach this gear to a unit you control.',
				'[Cost]: Attach this to a unit you control.'
			), (
				'819', 'quick-draw', NULL, 'teal',
				'[Reaction] When you play this, attach it to a Unit you control.',
				'This has [Reaction]. When you play this, attach it to a Unit you control.'
			), (
				'820', 'repeat', 'Repeat [Cost]', 'teal',
				'You may pay [Cost] as an additional cost as you play me. If you do, execute the instructions of this spell one additional time.',
				'You may pay the additional cost to repeat this spell''s effect.'
			), (
				'821', 'weaponmaster', NULL, 'gray',
				'When you play me, you may choose a Card you control with the Equipment tag. Necessary portions of its Rules Text are no longer inactive if they are currently Inactive. Pay the cost of its Equip ability, reduced by [A], to attach it to me.',
				'When you play me, you may [Equip] one of your Equipment to me for [A] less, even if it''s already attached.'
			), (
				'822', 'ambush', NULL, 'teal',
				'I may be played to a battlefield where you control Units. I have [Reaction] as long as I''m being played to a battlefield where you control Units.',
				'You may play me as a [Reaction] to a battlefield where you have units.'
			), (
				'823', 'hunt', 'Hunt X', 'green',
				'When I Conquer or Hold, my controller gains [X] XP.',
				'When I conquer or hold, gain [X] XP.'
			), (
				'824', 'level', '[Level N][>] [Text]', 'green',
				'While you have [N] or more XP, this card gains "[Text]"',
				'[Text] (While you have [N]+ XP, get the effect.)'
			), (
				'825', 'unique', NULL, 'gray',
				'A deck can contain only one card of a given name if the card has [Unique]',
				'Your deck can have only 1 card with this name.'
			), (
				'826', 'backline', NULL, 'magenta',
				'I must be assigned lethal damage after any other unit with the same controller as me that does not have [Backline] during the Combat Damage step.',
				'I must be assigned combat damage last.'
			), (
				'827', 'empower', 'Empower [Cost]|Empower — [Cost]', 'gray',
				'[Cost]: Empower this. Play only if not Empowered.',
				'Pay the cost: Empower me. Use only if not Empowered.'
			), (
				'828', 'empowered', '[Empowered][>][Text]', 'green',
				'While I have the Empowered status, this card gains ‘[Text]',
				'While I have the Empowered status, this card gains ‘[Text]'
			), (
				'829', 'flow', 'Flow [Cost] | Flow — [Cost]', 'teal',
				'You may play this from your trash for its Flow cost. Then banish it.',
				'You may play this from your trash for its Flow cost. Then banish it.'
			)
		ON DUPLICATE KEY UPDATE
			rules_entry = VALUE(rules_entry),
			name = VALUE(name),
			formatting = VALUE(formatting),
			color = VALUE(color),
			rules_description = VALUE(rules_description),
			card_description = VALUE(card_description)
		RETURNING *;
	`)
}