import type {ItemInstance} from '../items/model';import type {ItemEngine} from '../items/ItemEngine';
export interface Listing {id:string;sellerId:string;sellerName:string;item:ItemInstance;price:number;createdAt:number}
export type MarketAction={action:'LIST';itemId:string;price:number}|{action:'BUY'|'CANCEL';listingId:string};
const MAX_PER_SELLER=5,MAX_LISTINGS=100;
export class MarketEngine {
 private listings=new Map<string,Listing>();constructor(private items:ItemEngine){}
 snapshot(){return [...this.listings.values()]}
 list(sellerId:string,sellerName:string,itemId:string,price:number,now:number){if(!Number.isInteger(price)||price<1||price>500||this.listings.size>=MAX_LISTINGS||this.snapshot().filter(l=>l.sellerId===sellerId).length>=MAX_PER_SELLER)return false;const item=this.items.takeForListing(sellerId,itemId);if(!item)return false;const id=item.instanceId;this.listings.set(id,{id,sellerId,sellerName,item,price,createdAt:now});return true}
 cancel(sellerId:string,id:string){const l=this.listings.get(id);if(!l||l.sellerId!==sellerId||!this.items.returnListing(sellerId,l.item))return false;this.listings.delete(id);return true}
 buy(buyerId:string,id:string){const l=this.listings.get(id);if(!l||l.sellerId===buyerId||!this.items.purchase(buyerId,l.sellerId,l.item,l.price))return false;this.listings.delete(id);return true}
}
