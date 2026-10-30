import Phaser from 'phaser';import type {GroundItem} from './model';
export class GroundItemManager {private sprites=new Map<string,Phaser.GameObjects.Container>();private items:GroundItem[]=[];
 constructor(private scene:Phaser.Scene,private pickup:(id:string)=>void){}
 apply(items:GroundItem[]){this.items=items;const ids=new Set(items.map(g=>g.instanceId));for(const [id,s] of this.sprites)if(!ids.has(id)){s.destroy();this.sprites.delete(id)}for(const item of items){if(this.sprites.has(item.instanceId))continue;const shadow=this.scene.add.ellipse(0,5,16,5,0x161a15,.4),bag=this.scene.add.rectangle(0,0,12,10,0x8c7955).setStrokeStyle(1,0x3f372b),tie=this.scene.add.rectangle(0,-5,5,3,0xb5a47c);const c=this.scene.add.container(item.x,item.y,[shadow,bag,tie]).setDepth(item.y).setSize(28,28).setInteractive({useHandCursor:true});c.on('pointerdown',()=>this.pickup(item.instanceId));this.sprites.set(item.instanceId,c)}}
 nearest(x:number,y:number){return this.items.filter(g=>Math.hypot(g.x-x,g.y-y)<=70).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0]}
 get count(){return this.items.length}destroy(){for(const s of this.sprites.values())s.destroy();this.sprites.clear()}}
