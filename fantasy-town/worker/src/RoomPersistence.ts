import type {GroundItem,ItemPlayer} from '../../src/game/items/model';
import type {SkillLevels} from '../../src/game/crafting/data';
import type {Listing} from '../../src/game/market/MarketEngine';
import type {NetworkPlayerState} from '../../src/game/network/protocol';
import {parseOfflineSave} from '../../src/game/persistence/OfflineStore';

export interface SavedPlayer {id:string;items:ItemPlayer;skills:SkillLevels;profile?:NetworkPlayerState}
export interface RoomSnapshot {version:1;players:SavedPlayer[];ground:GroundItem[];listings:Listing[]}
export interface RoomStore {load():RoomSnapshot|null;save(value:RoomSnapshot):void}
const emptyPlayer=():ItemPlayer=>({inventory:{items:[],capacity:24,currentWeight:0,maxWeight:35},equipment:{},lastUse:0});
/** Refuse to overwrite invalid or future saves. Recalculate derived weight on load. */
export function decodeRoom(raw:string,now:number):RoomSnapshot {
 const value:unknown=JSON.parse(raw);
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid room save');
 const v=value as Record<string,unknown>;
 if(v.version!==1||!Array.isArray(v.players)||!Array.isArray(v.ground)||!Array.isArray(v.listings))throw Error('Unsupported room save');
 const players:SavedPlayer[]=[],ids=new Set<string>(),items=new Set<string>();
 const recordItem=(id:string)=>{if(items.has(id))throw Error('Duplicate item in room save');items.add(id)};
 for(const p of v.players){
  if(!p||typeof p!=='object'||typeof p.id!=='string'||!/^[\w-]{8,64}$/.test(p.id)||ids.has(p.id))throw Error('Invalid player in room save');
  const parsed=parseOfflineSave(JSON.stringify({version:1,playerId:p.id,items:p.items,skills:p.skills,ground:[]}),p.id,now);
  if(!parsed)throw Error('Invalid player inventory in room save');
  ids.add(p.id);for(const item of parsed.items.inventory.items)recordItem(item.instanceId);for(const item of Object.values(parsed.items.equipment))if(item)recordItem(item.instanceId);
  players.push({id:p.id,items:parsed.items,skills:parsed.skills,profile:p.profile as NetworkPlayerState|undefined});
 }
 const groundSave=parseOfflineSave(JSON.stringify({version:1,playerId:'room-save',items:emptyPlayer(),skills:{},ground:v.ground}),'room-save',now);
 if(!groundSave)throw Error('Invalid ground items in room save');
 for(const item of groundSave.ground)recordItem(item.instanceId);
 const listings:Listing[]=[];
 for(const l of v.listings){
  if(!l||typeof l!=='object'||typeof l.sellerId!=='string'||!ids.has(l.sellerId)||typeof l.sellerName!=='string'||l.sellerName.length>24||!Number.isInteger(l.price)||l.price<1||l.price>500||typeof l.createdAt!=='number'||!Number.isFinite(l.createdAt)||!l.item||l.id!==l.item.instanceId)throw Error('Invalid listing in room save');
  const inventory=emptyPlayer();inventory.inventory.items=[l.item];
  if(!parseOfflineSave(JSON.stringify({version:1,playerId:'room-save',items:inventory,skills:{},ground:[]}),'room-save',now))throw Error('Invalid listed item in room save');
  recordItem(l.item.instanceId);listings.push(l as Listing);
 }
 return {version:1,players,ground:groundSave.ground,listings};
}
export class SqliteRoomStore implements RoomStore {
 constructor(private sql:SqlStorage){sql.exec('CREATE TABLE IF NOT EXISTS game_state (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL)')}
 load(){const row=this.sql.exec<{payload:string}>('SELECT payload FROM game_state WHERE id = 1').toArray()[0];return row?decodeRoom(row.payload,Date.now()):null}
 save(value:RoomSnapshot){this.sql.exec('INSERT INTO game_state (id, payload) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload',JSON.stringify(value))}
}
