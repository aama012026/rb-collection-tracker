type Euros = number
export interface Catalog {
	version:number,
	createdAt:string, //"YYYY-MM-DDTHH:MM:SS+0200"
	products:Product[] | PriceGuide[]
}

export interface Product {
	idProduct:number,
	name:string,
	idCategory:number,
	categoryName:string,
	idExpansion:number,
	idMetacard:number,
	dateAdded:string //"YYYY-MM-DD HH:MM:SS"
}

export interface PriceGuide {
	idProduct:number,
	idCategory:number,
	avg:Euros,
	low:Euros,
	trend:Euros,// weighted avg. of last 100 sales in NM cond. w/smoothed out outliers.
	avg1:Euros, // 1 day avg.
	avg7:Euros, // 7 days avg.
	avg30:Euros,// 1 month avg.
	"avg-foil":Euros,
	"low-foil":Euros,
	"trend-foil":Euros,
	"avg1-foil":Euros,
	"avg7-foil":Euros,
	"avg30-foil":Euros
}