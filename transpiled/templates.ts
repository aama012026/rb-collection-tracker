// We tag the literals for syntax highlighting
const html = String.raw

export function makeCollectionPage(tbody: string): string {
	return html`<!DOCTYPE html>
<html>
	<head>
		<title>Riftbound Card Collection</title>
		<link rel="stylesheet" href="src/css/style.css">
		<script type="module" src="lib/datastar.js"></script>
	</head>
	<body>
		<table>
			<thead>
			<tr>
				<th>set</th><th>nr.</th><th>count</th><th>name</th>
				<th>stats</th><th>tags & keywords</th><th>description</th>
			</tr>
			</thead>
			${tbody}
		</table>
	</body>
</html>`
}

export function makeCardsTableBody(rows: string): string {
	return html`<tbody id="cards-table-body">
		${rows}
	</tbody>`
}

export function makeCardTableRow(
	cardId: string,
	domain: string,
	rarity: string,
	setCode: string,
	cardNumber: string,
	count: number,
	name: string,
	energy: string,
	power: string,
	migth: string,
	types: string,
	tags: string,
	keywords: string,
	description: string
	): string {
	return html`<tr id="${cardId}" data-domain="${domain}" data-rarity="${rarity}">
		<td>${setCode}</td>
		<td>${cardNumber}</td>
		<td>${count}</td>
		<td>${name}</td>
		<td class="stats">
			<span>${energy}</span>
			<span>${power}</span>
			<span>${migth}</span>
		</td>
		<td>
			<span>
				<mark class="badge">${types}</mark>
				<span>${tags}</span>
			</span>
			<span>${keywords}</span>
		</td>
		<td>${description}</td>
	</tr>`
}

export function makeTag(tag: string): string {
	return html`<mark class="badge">${tag}</mark>`
}

export function makeKeyword(text: string): string {
	return html`<mark class="badge" data-keyword="${text}"></mark>`
}