import Phaser from 'phaser';import {CharacterView} from '../characters/CharacterView';import {CharacterAssetRegistry} from '../characters/CharacterAssetRegistry';import type {NetworkPlayerState,ServerMessage} from './protocol';
import {interpolate} from './interpolation';import type {Sample} from './interpolation';
import type {EquipmentVisual} from '../items/model';
interface Remote {state:NetworkPlayerState;view:CharacterView;samples:Sample[]}
const DELAY=120;
export class RemotePlayerManager {
 private players=new Map<string,Remote>();private equipment=new Map<string,EquipmentVisual>();
 constructor(private scene:Phaser.Scene,private registry:CharacterAssetRegistry,private localId:string){}
 get count(){return this.players.size} get names(){return [...this.players.values()].map(r=>`${r.state.name} (${r.state.id.slice(0,8)})`)}
 handle(m:ServerMessage){if(m.type==='PLAYER_SNAPSHOT'){const ids=new Set(m.players.map(p=>p.id));for(const id of this.players.keys())if(!ids.has(id))this.remove(id);for(const p of m.players)this.upsert(p)}else if(m.type==='PLAYER_JOIN'||m.type==='PROFILE')this.upsert(m.player);else if(m.type==='PLAYER_LEAVE'){this.remove(m.id);this.equipment.delete(m.id)}else if(m.type==='PLAYER_MOVE'){const r=this.players.get(m.id);if(r){r.samples.push({time:performance.now(),move:m.move});if(r.samples.length>20)r.samples.shift()}}else if(m.type==='COMBAT_SNAPSHOT'){for(const f of m.fighters){const r=this.players.get(f.id);if(r)r.view.sprite.setAngle(f.deadUntil?90:0).setAlpha(f.deadUntil?.5:1)}}else if(m.type==='ITEM_WORLD'){for(const e of m.equipment){this.equipment.set(e.id,e.equipment);this.players.get(e.id)?.view.setEquipment(e.equipment)}}}
 private upsert(p:NetworkPlayerState){if(p.id===this.localId)return;let r=this.players.get(p.id);if(!r){const state={...p,appearance:{...p.appearance}};const view=new CharacterView(this.scene,this.registry,state,true,true);view.setEquipment(this.equipment.get(p.id)??{});(view.sprite.body as Phaser.Physics.Arcade.Body).enable=false;r={state,view,samples:[{time:performance.now(),move:p}]};this.players.set(p.id,r)}else{r.state.name=p.name;r.state.race=p.race;r.state.profession=p.profession;r.state.appearance={...p.appearance};r.view.setName(p.name)}}
 private remove(id:string){const r=this.players.get(id);if(r){r.view.destroy();this.players.delete(id)}}
 update(delta:number){const now=performance.now()-DELAY;for(const r of this.players.values()){const samples=r.samples;while(samples.length>2&&samples[1].time<=now)samples.shift();const a=samples[0],b=samples[1];if(a){Object.assign(r.state,interpolate(a,b,now));r.view.sprite.setPosition(r.state.x,r.state.y)}r.view.update(delta)}}
 destroy(){for(const id of this.players.keys())this.remove(id)}
}
