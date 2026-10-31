import type Phaser from 'phaser';
import type {GatheringType} from './data';

/** Original, small scenery markers; never part of the collision map. */
export function resourceTexture(scene:Phaser.Scene,type:GatheringType) {
 const key='resource-'+type;if(scene.textures.exists(key))return key;
 const texture=scene.textures.createCanvas(key,40,44);if(!texture)throw new Error('Could not create resource art');
 const ctx=texture.getContext();
 const rect=(color:string,x:number,y:number,w:number,h:number)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h)};
 ctx.fillStyle='#15211966';ctx.beginPath();ctx.ellipse(20,37,15,4,0,0,Math.PI*2);ctx.fill();
 if(type==='woodcutting'){
  rect('#3c3429',17,13,7,24);rect('#826947',19,19,3,17);rect('#a18a5a',20,28,1,8);
  for(const [x,y,w,h] of [[12,3,16,7],[7,9,25,7],[4,16,31,7],[9,23,24,6]]){
   rect('#263f2e',x,y,w,h);rect('#476047',x+2,y,w-5,3);rect('#6b7a51',x+4,y,5,2);
  }
 }else if(type==='mining'){
  rect('#363d36',6,24,28,13);rect('#676c60',10,18,19,18);rect('#8b8e7e',12,16,12,4);
  rect('#adb09a',12,20,3,9);rect('#4c554c',22,20,6,14);rect('#baaa77',17,27,2,3);rect('#897b54',21,30,3,2);
 }else if(type==='fishing'){
  ctx.strokeStyle='#819d9477';ctx.lineWidth=1;
  for(const [x,y,w] of [[20,25,14],[17,31,9],[24,36,11]]){ctx.beginPath();ctx.ellipse(x,y,w,3,0,0,Math.PI*2);ctx.stroke()}
  rect('#bbb99a',17,27,9,2);rect('#5a766d',25,26,3,4);rect('#c3bea0',14,26,3,4);
  rect('#8b7451',32,10,1,25);rect('#c7b990',29,10,3,1);
 }else{
  for(const [x,y] of [[9,25],[15,20],[23,24],[28,29],[18,30]]){
   rect('#384a30',x+1,y,2,13);rect('#64794b',x-2,y+3,4,2);rect('#849062',x+2,y+6,4,2);
   rect(type==='herbalism'?'#9d8eaf':'#c0b58e',x,y,4,4);
   rect(type==='herbalism'?'#c4acbb':'#e1d3ac',x+1,y,2,1);
  }
 }
 texture.refresh();return key;
}
