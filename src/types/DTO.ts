type ISOtimestamp = string

export interface RiftboundContent {
	game:string,
	version:string,
	lastUpdates:ISOtimestamp,
	sets:Set[]
}

export interface Set {
	id:string,
	name:string,
	cards:Card[]
}

export interface Card {
	id:string,
	collectorNumber:number,
	set:string,
	name:string,
	description:string,
	type:string,
	rarity:string,
	faction:string,
	stats:CardStats,
	keywords:string[],
	art:CardArt,
	flavorText:string,
	tags:string[]
}

export interface CardStats {
	energy:number,
	might:number,
	cost:number,
	power:number
}

export interface CardArt {
	thumbnailURL:string,
	fullURL:string,
	artist:string
}