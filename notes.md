# Notes

## Shorthands
- \[A] Power of any domain
- \[E] Exhaust symbol
- \[T] Old exhaust symbol (tap)
- \[M] Might symbol
- \[S] Old might symbol (strength)
- \[C] Power of a card's domain
- \[>] Keyword associated with an ability
- **Activated Abilities** are **Game Effects** written as **Costs** followed by a ":" and then succeeded by an effect.

## Other Formatting
- **Name** with subtitle: "\[Short Name], \[Subtitle]"

## Lingo
**Damage** is **Healed** from **Units** at the end of the player's turn, and during a **Combat Cleanup**
**Move** | **Standard Move**
### Text
- **Rules Text** (May contain **Abilities**, **Instructions**, **Keywords**, **Reminder Text**, symbols, or be blank).
- **Effect Text** (text below the rules text that are appended to the card this card is attached to.)
- **Might Bonus** (Bottom right corner, added to the might of the card this card is attached to.)
- **Flavor Text**
- **Illustration**
- **Cost** (**Energy** & **Power**)
### Game Terms
- **Privacy**: **Secret** | **Private** | **Public**
### Categories
- **Main Deck** card (**Permanent**, either **Unit** or **Gear**, || **Spell**)(**Play**) | **Rune Deck** card (**Runes**)(**Channel**)
- **Non-Deck Cards**: **Battlefields** | **Legends**
#### Supertypes
- **Champion** (Exclusively units, impacts deckbuilding)
- **Signature** (any card type, impacts deckbuilding)
- **Token** (applied to temporary **Game Objects** of any card type)
### Tags
- **Tags** have no innate rules meaning, but may be referenced.
- **Champion Tags**: Tags used to link **Legends**, **Champion Units** and **Signature** cards.


## Syntax
**Reminder Text** appears in *italics* & (*parentheses*).
- The presence, absence or exact wording has no effect on game function.

## Semantics
**Dependent Keywords** are comprised of both a **Condition** that they are short for, and an ability of som format immediately after the **Keyword** itself.
- The **Dependent Ability** is **Inactive** on the card with the **Dependent Keyword** until the **Condition** is met, when it becomes **Active**

## Card Text Hierarchy
Rule numbers point into `Riftbound Core Rules.md`.
- **Rules Text** (135) contains, in any combination:
  - **Abilities** (135.2.a, 360) — discrete units of "what a card may or must do." Kinds:
    - **Passive Ability** (363) — a standing condition/constraint/statement; no trigger, no cost.
    - **Activated Ability** (376) — `Cost ":" Effect`.
    - **Triggered Ability** (382) — `Condition "," Instruction(s)`; fires when its Condition is met.
      - **Reflexive Trigger** (386) — a Triggered Ability spawned mid-resolution by another ability/instruction, rather than printed directly.
    - **Delayed Ability** (389) — only active during a window the creating ability defines; not tied to its source staying on the board.
    - **Linked Abilities** (393) — two or more Abilities on the same printed text (or granted by the same source) that reference each other.
  - **Instructions** (135.2.b) — imperative-mood `Game Action + Complement`, found on Spells and inside Abilities. A trigger Condition is not itself an Instruction (135.2.b.6).
  - **Keywords** (135.2.c, 800) — shorthand for a longer Ability/Instruction; may carry Reminder Text.
    - **Dependent Keyword** — `Keyword [>] Text` where Text (a Dependent Ability) is Inactive until the Keyword's Condition is met (see Semantics above).
    - **Permissive Keyword** — e.g. `[Action][>]`, grants permission to the Ability/Instruction after `[>]`.
    - **Keyword-triggered Ability** — e.g. `[Deathknell]`, the keyword itself doubles as the trigger condition.
  - **Reminder Text** (135.2.d) — *(italicized, parenthetical)*; cosmetic only, never affects game function.
  - **Symbols** (135.2.e) — `[E]` exhaust, `[M]` might, `[A]` power of any domain, `[C]` power of this card's own domain, domain symbols, `[>]` keyword-to-ability link.
- **Effect Text** (136) — a second block of Abilities below Rules Text; Inactive unless the card is Attached, then appended to the host's Rules Text.
- **Might Bonus** (137) — `+N`/`-N`; modifies the Might of the card this card is Attached to.
- **Flavor Text** (138) / **Illustration** (139) — no gameplay meaning; safe for the parser to ignore.

### Interpretation Conventions
Govern how parsed text resolves; not part of the text grammar itself.
- Card text supersedes rules text (001-002); a card's own terminology, not the rules', governs how its text reads (050-051).
- Self-reference: Units/Legends say "I"/"me", Gear/Spells say "this", Battlefields say "here" (053).
- "Can't" beats "can"; "only" makes a permission exclusive (054).
- Resolve as much of an instruction as possible; ignore whatever part is impossible (055).

### Grammar Doodles
#### Hard Separation
**Rules Text** - Always the root of the AST, Defined and identified by that.

**Symbols and Keywords** - Bracket delimited. AST leaves.
- Symbols contain either a number or a single letter.
- Keywords contain a single word and a an optional single value. (Given the cost is written after the brackets.)

**Might Count/Modifier** - (+|-)? \[M\]. Always the direct parent of a Might Node if present.
- Make sure we capture the right glyph for minus here.

**Colon** - What came before was a cost, what comes after is an effect.

**—** - Ties the Node before to the node after. It might be keyword effect, like in:

	"_\[Legion\] — When you play me, play two 1 [M] Recruit unit tokens here. (Get the effect if you've played another card this turn.)_"
	
or marking a branch like in:

	"_When you attach an Equipment to me, choose one that hasn't been chosen this turn —Ready 2 runes.Channel 1 rune exhausted.Buff a friendly unit._"
	
or a cost like in:

	"_\[Empower\] — Discard 1 (Pay the cost: Empower me. Use only if not Empowered.)\[Empowered\]\[>\] I have +1 \[M\]._"
	
**\[>\]** - The ability after is tied to the keyword before. Badge should render with arrow end.

**\[>>\]** - The keyword after is tied to the keyword before. Badge after first should render with arrow indent beginning.

**Reminder Text** - Parenthesis delimited. Belongs to whatever sibling node came before it.

#### Fuzzier separation
**Effect Text** - Unknown as not present in mock data. Separate field on riot's page but not separate prop in DTO.

**Instructions** - Appr. sentence level. Begins When no text-token came before, with a capital letter, and after '.'

#### Notes
**A note on sequential symbols** - Symbols immediately following each other should be grouped. This is most commonly seen as costs, but may just be an enumeration of resources, like in \[Add\] - \[1]\[C].

**A note on hyphens** - If hyphens are connected by word-tokens on either side, the hyphen is connecting the two words rather than ending a composite node and connecting it to the next.