import type {MonsterType} from '../combat/model';
export interface DropEntry {definitionId:string;chance:number;minQuantity:number;maxQuantity:number}
export const DROP_TABLES:Record<MonsterType,DropEntry[]>={
 wolf:[{definitionId:'hide',chance:1,minQuantity:1,maxQuantity:2},{definitionId:'meat',chance:.7,minQuantity:1,maxQuantity:2},{definitionId:'fang',chance:.15,minQuantity:1,maxQuantity:1}],
 goblin:[{definitionId:'coin',chance:1,minQuantity:2,maxQuantity:6},{definitionId:'dagger',chance:.35,minQuantity:1,maxQuantity:1},{definitionId:'cloth_scrap',chance:.7,minQuantity:1,maxQuantity:2}],
 skeleton:[{definitionId:'bone',chance:1,minQuantity:1,maxQuantity:3},{definitionId:'old_sword',chance:.4,minQuantity:1,maxQuantity:1},{definitionId:'essence',chance:.15,minQuantity:1,maxQuantity:1}],
 slime:[{definitionId:'essence',chance:.4,minQuantity:1,maxQuantity:1},{definitionId:'mana_potion',chance:.45,minQuantity:1,maxQuantity:1}],
 boar:[{definitionId:'meat',chance:1,minQuantity:1,maxQuantity:3},{definitionId:'hide',chance:.8,minQuantity:1,maxQuantity:2},{definitionId:'health_potion',chance:.3,minQuantity:1,maxQuantity:1}]
};
