import type Phaser from 'phaser';
import {destinations,findRoute} from './routes';
import {isSafe} from '../combat/model';
import {WORLD_BLOCKS} from './collision';

// Choose a point on the verified path with room on both sides, rather than
// treating the invisible safe-zone boundary as the centre of the road.
export function roadWaymark(route:{x:number;y:number}[]) {
 const crossing=route.findIndex(point=>!isSafe(point.x,point.y));
 if(crossing<0)return undefined;
 const clearance=(p:{x:number;y:number})=>Math.min(...WORLD_BLOCKS.map(([x,y,w,h])=>Math.hypot(Math.max(x-p.x,0,p.x-x-w),Math.max(y-p.y,0,p.y-y-h))));
 let best=route[crossing],score=clearance(best);
 for(const p of route.slice(Math.max(0,crossing-8),crossing+9)){const value=clearance(p);if(value>score){best=p;score=value}}
 return best;
}

const gateCache=new Map<string,{x:number;y:number}>();
export function townGate(id:string){const cached=gateCache.get(id);if(cached)return cached;const d=destinations.find(x=>x.id===id);const point=d?roadWaymark(findRoute(1415,480,d.x,d.y)):undefined;if(point)gateCache.set(id,point);return point}
/** Mark the walkable exit from the town centre and the destination on the same map. */
export function addWaymarks(scene:Phaser.Scene) {
 for(const destination of destinations){
  const gate=townGate(destination.id);
  for(const [point,label] of [[gate,`${destination.name}へ`],[destination,destination.name]] as const){
   if(!point)continue;
   const ring=scene.add.ellipse(point.x,point.y+3,54,20,0xd0b477,.16).setStrokeStyle(1,0xe8cd8b,.85).setDepth(point.y-.3);
   const g=scene.add.graphics({x:point.x,y:point.y-10}).setDepth(point.y+1);
   g.fillStyle(0xe9d49e,.95);g.fillRect(-1,-11,2,22);g.fillRect(-7,-5,14,2);
   g.fillStyle(0xffefc3,.8);g.fillRect(-11,-16,2,5);g.fillRect(-13,-14,6,1);g.fillRect(9,-4,2,5);g.fillRect(7,-2,6,1);
   const text=scene.add.text(point.x,point.y-30,label,{fontFamily:'serif',fontSize:'11px',color:'#fff0c5',stroke:'#24251b',strokeThickness:4}).setOrigin(.5,1).setDepth(point.y+2);
   scene.tweens.add({targets:[ring,g],alpha:{from:.55,to:1},duration:1100,yoyo:true,repeat:-1});
   scene.tweens.add({targets:text,alpha:{from:.75,to:1},duration:1600,yoyo:true,repeat:-1});
   // Large touch target, with no physics body: walking over it remains unobstructed.
   scene.add.zone(point.x,point.y,96,96).setDepth(point.y+3).setInteractive({useHandCursor:true}).on('pointerdown',()=>{
    window.dispatchEvent(new CustomEvent('town-route-follow',{detail:{id:destination.id}}));
   });
  }
 }
}
