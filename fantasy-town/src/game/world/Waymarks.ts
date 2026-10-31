import type Phaser from 'phaser';
import {destinations,findRoute} from './routes';
import {isSafe} from '../combat/model';

/** Mark the walkable exit from the town centre and the destination on the same map. */
export function addWaymarks(scene:Phaser.Scene) {
 for(const destination of destinations){
  const route=findRoute(1415,480,destination.x,destination.y);
  const gate=route.find(point=>!isSafe(point.x,point.y));
  for(const [point,label] of [[gate,`${destination.name}へ`],[destination,destination.name]] as const){
   if(!point)continue;
   const ring=scene.add.ellipse(point.x,point.y+3,36,13,0xd0b477,.16).setStrokeStyle(1,0xe8cd8b,.85).setDepth(point.y-.3);
   const g=scene.add.graphics({x:point.x,y:point.y-10}).setDepth(point.y+1);
   g.fillStyle(0xe9d49e,.95);g.fillRect(-1,-11,2,22);g.fillRect(-7,-5,14,2);
   g.fillStyle(0xffefc3,.8);g.fillRect(-11,-16,2,5);g.fillRect(-13,-14,6,1);g.fillRect(9,-4,2,5);g.fillRect(7,-2,6,1);
   const text=scene.add.text(point.x,point.y-30,label,{fontFamily:'serif',fontSize:'11px',color:'#fff0c5',stroke:'#24251b',strokeThickness:4}).setOrigin(.5,1).setDepth(point.y+2);
   scene.tweens.add({targets:[ring,g],alpha:{from:.55,to:1},duration:1100,yoyo:true,repeat:-1});
   scene.tweens.add({targets:text,alpha:{from:.75,to:1},duration:1600,yoyo:true,repeat:-1});
  }
 }
}
