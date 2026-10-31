import {loadCharacterProfile} from '../persistence/CharacterProfile';
import {appearancePresets} from '../characters/definitions';
import type {AppearanceData, Direction, MovementState, Profession, Race} from '../characters/definitions';
import {identity,spawnOffset} from '../network/identity';
export interface PlayerState {id:string;name:string;x:number;y:number;direction:Direction;movementState:MovementState;race:Race;profession:Profession;appearance:AppearanceData;health:number;maxHealth:number;mana:number;maxMana:number}
export class GameState {player:PlayerState;constructor(){const {id,name}=identity(),offset=spawnOffset(id),profile=loadCharacterProfile();this.player={id,name,x:1415+offset.x,y:480+offset.y,direction:'down',movementState:'idle',race:profile.race,profession:profile.profession,appearance:{...appearancePresets[profile.preset]},health:100,maxHealth:100,mana:65,maxMana:65}}}
