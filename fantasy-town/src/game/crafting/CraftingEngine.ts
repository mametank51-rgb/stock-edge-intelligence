import {RECIPES,RESOURCES} from './data';import type {ResourceState,SkillLevels} from './data';import type {ItemEngine} from '../items/ItemEngine';
import {rollQuality} from './quality';
export class CraftingEngine {
 private nodes=new Map(RESOURCES.map(n=>[n.id,0]));private skills=new Map<string,SkillLevels>();private lastAction=new Map<string,number>();
 constructor(private items:ItemEngine){}
 getSkills(id:string){return {...this.skills.get(id)}}
 restoreSkills(id:string,skills:SkillLevels){this.skills.set(id,{...skills})}
 states():ResourceState[]{return [...this.nodes].map(([id,readyAt])=>({id,readyAt}))}
 gather(id:string,nodeId:string,x:number,y:number,now:number){const n=RESOURCES.find(v=>v.id===nodeId);if(!n||!this.items.get(id)||now<(this.nodes.get(nodeId)??0)||now-(this.lastAction.get(id)??0)<1000||Math.hypot(x-n.x,y-n.y)>70)return false;if(!this.items.grant(id,n.item,1))return false;this.nodes.set(nodeId,now+n.cooldown);this.lastAction.set(id,now);this.addXp(id,n.type);return true}
 craft(id:string,recipeId:string,name:string,now:number){const r=RECIPES.find(v=>v.id===recipeId);if(!r||now-(this.lastAction.get(id)??0)<1000)return false;const quality=rollQuality(this.getSkills(id)[r.type]??0,Math.random());if(!this.items.craft(id,r.inputs,r.output,name,quality))return false;this.lastAction.set(id,now);this.addXp(id,r.type);return true}
 private addXp(id:string,key:keyof SkillLevels){const s=this.skills.get(id)??{};s[key]=(s[key]??0)+1;this.skills.set(id,s)}
}
