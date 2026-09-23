export type FilterState = 'include'|'require'|'exclude'

export type CardCollectionSignals = {
	searchTerm: string,
	sortOrder: string[],
	filters: {
		sets:{require:string[], exclude:string[]},
		domains:{require:string[], exclude:string[]},
		types:{require:string[], exclude:string[]},
		tags:{require:string[], exclude:string[]}
	},
}