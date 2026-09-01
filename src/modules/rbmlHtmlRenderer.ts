import { makeInlineSymbol, makeMightCount, makeReminder, makeXpCount } from "../../gen/HTMLtemplates";
import type { Experience, Might, Symbol, Text } from "./rbmlParser";

function getSymbol(s: Symbol): string {
	return makeInlineSymbol(s.value)
}

function getMightCount(m: Might): string {
	return makeMightCount(m.sign ?? '', m.amount)
}

function getXpCount(xp: Experience): string {
	return makeXpCount(xp.amount, xp.sign ?? '')
}

function getText(text: Text): string {
	return text.value
}

function getReminder(text: string): string {
	return makeReminder(text)
}
