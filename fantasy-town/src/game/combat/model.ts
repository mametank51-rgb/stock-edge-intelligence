import type {Profession} from '../characters/definitions';
export type MonsterType='wolf'|'goblin'|'skeleton'|'slime'|'boar';
export type MonsterAI='IDLE'|'WANDER'|'CHASE'|'ATTACK'|'RETURN'|'DEAD';
export type AttackType='melee'|'ranged'|'magic';
export interface MonsterDefinition {id:string;name:string;type:MonsterType;x:number;y:number;maxHp:number;moveSpeed:number;attackRange:number;attackDamage:number;attackCooldown:number;aggroRange:number;respawnSeconds:number;aggressive:boolean;leash:number}
export interface MonsterState {id:string;x:number;y:number;hp:number;maxHp:number;state:MonsterAI;targetId:string|null;isDead:boolean;respawnAt:number}
export interface Fighter {id:string;x:number;y:number;profession:Profession;hp:number;mp:number;deadUntil:number;lastAttack:number;lastCombat:number}
export interface CombatState {targetId:string|null;isInCombat:boolean;lastAttackTime:number;attackCooldown:number;attackType:AttackType;animation:'AttackMelee'|'AttackRanged'|'Cast'|null;isDead:boolean}
export interface CombatEvent {attackerId:string;targetId:string;damage:number;attackType:AttackType;x:number;y:number;targetX:number;targetY:number;died:boolean}
export const ATTACKS:Record<AttackType,{range:number;cooldown:number;damage:number;mana:number}>={melee:{range:60,cooldown:850,damage:14,mana:0},ranged:{range:200,cooldown:1100,damage:12,mana:0},magic:{range:185,cooldown:1200,damage:18,mana:10}};
export function attackType(profession:Profession):AttackType{return profession==='Archer'?'ranged':profession==='Mage'?'magic':'melee'}
export const SAFE_ZONE={x:1280,y:250,width:320,height:360};
export const isSafe=(x:number,y:number)=>x>=SAFE_ZONE.x&&x<=SAFE_ZONE.x+SAFE_ZONE.width&&y>=SAFE_ZONE.y&&y<=SAFE_ZONE.y+SAFE_ZONE.height;
const base={maxHp:60,moveSpeed:42,attackRange:30,attackDamage:8,attackCooldown:1300,aggroRange:135,respawnSeconds:12,leash:220};
export const MONSTERS:MonsterDefinition[]=[
 {...base,id:'wolf_01',name:'灰狼',type:'wolf',x:180,y:495,aggressive:true,moveSpeed:55},
 {...base,id:'goblin_01',name:'ゴブリン',type:'goblin',x:2450,y:480,aggressive:true},
 {...base,id:'skeleton_01',name:'骸骨兵',type:'skeleton',x:2300,y:1160,aggressive:true,maxHp:75},
 {...base,id:'slime_01',name:'沼スライム',type:'slime',x:980,y:1325,aggressive:false,moveSpeed:28,maxHp:45},
 {...base,id:'boar_01',name:'野猪',type:'boar',x:425,y:1300,aggressive:false,maxHp:85,attackDamage:11},
];
