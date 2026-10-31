import type {AppearanceData,Direction,MovementState,Profession,Race} from '../characters/definitions';
export type MovementType='STATIC'|'PATROL'|'WANDER';
export interface NpcDefinition {id:string;name:string;role:string;x:number;y:number;race:Race;profession:Profession;appearance:AppearanceData;movementType:MovementType;dialogueSet:string[];interactionRadius:number;patrolPoints?:{x:number;y:number}[];wanderRadius?:number;art?:'townswoman'|'guard'|'blacksmith'|'merchant'|'innkeeper'|'traveler'}
export interface NpcState {x:number;y:number;direction:Direction;movementState:MovementState;behavior:'waiting'|'moving';patrolIndex:number}
