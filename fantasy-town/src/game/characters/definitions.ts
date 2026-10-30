export type Direction='down'|'up'|'left'|'right';
export type MovementState='idle'|'walk'|'run';
export type Race='Human'|'Elf'|'Dwarf'|'Orc'|'Beast';
export type Profession='Warrior'|'Mage'|'Archer'|'Priest'|'Rogue'|'Merchant'|'Craftsman';
export interface AppearanceData {bodyType:'standard'|'slim'|'broad';skinVariant:number;hairStyle:'short'|'long'|'hood'|'bald';hairColor:number;clothesVariant:number;primaryColor:number;secondaryColor:number}
export interface CharacterLayers {body?:string;hair?:string;clothing?:string;armor?:string;weapon?:string;shield?:string;cape?:string}
export const appearancePresets:AppearanceData[]=[
 {bodyType:'standard',skinVariant:0xc9a17e,hairStyle:'short',hairColor:0x4b382d,clothesVariant:0,primaryColor:0x596b60,secondaryColor:0x987c57},
 {bodyType:'slim',skinVariant:0xd6b695,hairStyle:'long',hairColor:0x967c55,clothesVariant:1,primaryColor:0x66585d,secondaryColor:0xb3a079},
 {bodyType:'broad',skinVariant:0x9c735a,hairStyle:'hood',hairColor:0x332f2b,clothesVariant:2,primaryColor:0x53616b,secondaryColor:0x7d6a4d},
 {bodyType:'standard',skinVariant:0xc79a78,hairStyle:'bald',hairColor:0x716454,clothesVariant:1,primaryColor:0x71694f,secondaryColor:0xbba987},
];
export const professions:Profession[]=['Warrior','Mage','Archer','Priest','Rogue','Merchant','Craftsman'];
export const races:Race[]=['Human','Elf','Dwarf'];
