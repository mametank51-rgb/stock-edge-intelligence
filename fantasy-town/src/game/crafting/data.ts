export type GatheringType='woodcutting'|'mining'|'fishing'|'herbalism'|'fiber';
export type CraftType='smithing'|'tailoring'|'carpentry'|'cooking';
export interface ResourceDefinition {id:string;name:string;type:GatheringType;x:number;y:number;item:string;cooldown:number}
export interface Recipe {id:string;name:string;type:CraftType;inputs:Record<string,number>;output:string}
export const RESOURCES:ResourceDefinition[]=[
 {id:'tree_1',name:'若木',type:'woodcutting',x:1520,y:500,item:'log',cooldown:10000},
 {id:'ore_1',name:'鉱脈',type:'mining',x:1550,y:540,item:'ore',cooldown:12000},
 {id:'fish_1',name:'釣り場',type:'fishing',x:1300,y:510,item:'fish',cooldown:10000},
 {id:'herb_1',name:'薬草',type:'herbalism',x:1300,y:565,item:'herb',cooldown:8000},
 {id:'fiber_1',name:'繊維草',type:'fiber',x:1580,y:565,item:'fiber',cooldown:8000},
];
export const RECIPES:Recipe[]=[
 {id:'forge_sword',name:'鉄の剣',type:'smithing',inputs:{ore:3,log:1},output:'sword'},
 {id:'sew_cloth',name:'布の衣',type:'tailoring',inputs:{fiber:3},output:'cloth'},
 {id:'carve_shield',name:'木の盾',type:'carpentry',inputs:{log:3},output:'wood_shield'},
 {id:'cook_food',name:'干し肉',type:'cooking',inputs:{fish:2,herb:1},output:'food'},
];
export interface ResourceState {id:string;readyAt:number}
export type SkillLevels=Partial<Record<GatheringType|CraftType,number>>;
