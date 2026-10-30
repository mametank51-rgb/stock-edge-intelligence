import type {AppearanceData,Direction,MovementState,Profession,Race} from '../characters/definitions';
import type {CombatEvent,Fighter,MonsterState} from '../combat/model';
import type {ItemAction,ItemPlayer,GroundItem,EquipmentVisual} from '../items/model';
import type {ResourceState,SkillLevels} from '../crafting/data';
import type {Listing,MarketAction} from '../market/MarketEngine';
export const ROOM_ID='town_01';
export const MAX_CHAT=160;
export interface NetworkPlayerState {id:string;name:string;x:number;y:number;direction:Direction;movementState:MovementState;race:Race;profession:Profession;appearance:AppearanceData;timestamp:number}
export interface MoveState {x:number;y:number;direction:Direction;movementState:MovementState}
export type ClientMessage = {type:'JOIN';player:NetworkPlayerState}|{type:'PLAYER_MOVE';move:MoveState}|{type:'PROFILE';name:string;race:Race;profession:Profession;appearance:AppearanceData}|{type:'CHAT';message:string}|{type:'PING';nonce:number}|{type:'ATTACK_REQUEST';targetId:string}|{type:'ITEM_ACTION';itemAction:ItemAction}|{type:'GATHER';nodeId:string}|{type:'CRAFT';recipeId:string}|{type:'MARKET_ACTION';marketAction:MarketAction};
export type ServerMessage = {type:'PLAYER_SNAPSHOT';players:NetworkPlayerState[]}|{type:'PLAYER_JOIN';player:NetworkPlayerState}|{type:'PLAYER_MOVE';id:string;move:MoveState;timestamp:number}|{type:'PROFILE';player:NetworkPlayerState}|{type:'PLAYER_LEAVE';id:string}|{type:'CHAT';playerId:string;playerName:string;message:string;timestamp:number}|{type:'PONG';nonce:number}|{type:'ERROR';message:string}|{type:'COMBAT_SNAPSHOT';monsters:MonsterState[];fighters:Fighter[]}|{type:'ATTACK_RESULT';event:CombatEvent}|{type:'INVENTORY_UPDATE';player:ItemPlayer}|{type:'ITEM_WORLD';ground:GroundItem[];equipment:{id:string;equipment:EquipmentVisual}[]}|{type:'RESOURCES';nodes:ResourceState[]}|{type:'CRAFT_SKILLS';skills:SkillLevels}|{type:'MARKET_SNAPSHOT';listings:Listing[]}|{type:'MARKET_RESULT';ok:boolean;message:string};
export function parseMessage(value:string):unknown {try{return JSON.parse(value) as unknown}catch{return null}}
export function isRecord(v:unknown):v is Record<string,unknown>{return typeof v==='object'&&v!==null&&!Array.isArray(v)}
export const isDirection=(v:unknown):v is Direction=>v==='up'||v==='down'||v==='left'||v==='right';
export const isMovement=(v:unknown):v is MovementState=>v==='idle'||v==='walk'||v==='run';
