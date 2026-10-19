export type FilterState = 'include'|'require'|'exclude'
export type CardCollectionSignals = {
	searchTerm: string,
	sortOrder: {col:string, dir:'ASC'|'DESC'}[],
	filters: {
		set:{require:string[], exclude:string[]},
		domain:{require:string[], exclude:string[]},
		type:{require:string[], exclude:string[]},
		tag:{require:string[], exclude:string[]}
	},
}