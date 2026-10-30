export type ItemCategory='WEAPON'|'ARMOR'|'SHIELD'|'CLOTHING'|'ACCESSORY'|'CONSUMABLE'|'MATERIAL'|'QUEST'|'TOOL'|'MISC';
export type Rarity='Common'|'Uncommon'|'Rare'|'Epic'|'Legendary';
export type Quality='Poor'|'Normal'|'Fine'|'Exceptional'|'Masterwork';
export type EquipSlot='head'|'chest'|'hands'|'legs'|'feet'|'mainHand'|'offHand'|'cape'|'accessory1'|'accessory2';
export interface Stats {attack:number;defense:number;magicPower:number;attackSpeed:number}
export interface ItemDefinition {id:string;name:string;description:string;category:ItemCategory;icon:string;weight:number;stackable:boolean;maxStack:number;rarity:Rarity;baseValue:number;equipSlot?:EquipSlot;stats?:Partial<Stats>;durability?:number;tags:string[]}
export interface ItemInstance {instanceId:string;definitionId:string;quantity:number;durability:number;maxDurability:number;quality:Quality;customName?:string;craftedBy?:string;randomAffixes?:string[]}
export interface InventoryState {items:ItemInstance[];capacity:number;maxWeight:number;currentWeight:number}
export type EquipmentState=Partial<Record<EquipSlot,ItemInstance>>;
export interface GroundItem {instanceId:string;itemInstance:ItemInstance;x:number;y:number;spawnTime:number;ownerId:string|null;despawnTime:number}
export interface ItemPlayer {inventory:InventoryState;equipment:EquipmentState;lastUse:number}
export type ItemAction={action:'PICKUP'|'USE'|'DROP';id:string}|{action:'EQUIP';id:string;slot?:EquipSlot}|{action:'UNEQUIP';slot:EquipSlot};
export type EquipmentVisual=Partial<Record<EquipSlot,string>>;
