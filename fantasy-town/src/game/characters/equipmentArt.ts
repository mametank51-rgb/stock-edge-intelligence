import type {EquipmentVisual} from '../items/model';
import type {Direction} from './definitions';

/** One small pixel layer shared by the world and the equipment portrait. */
export function drawEquipment(ctx:CanvasRenderingContext2D,e:EquipmentVisual,direction:Direction,step=0) {
  const rect=(color:string,x:number,y:number,w:number,h:number)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h)};
  ctx.save();ctx.translate(24,36);
  if(direction==='left')ctx.scale(-1,1);
  if(e.cape&&direction==='up'){rect('#32463b',-7,-20,14,20);rect('#61705a',-5,-19,2,17)}
  if(e.chest){
    const color=e.chest==='cloth'?'#716550':e.chest==='leather'?'#71523c':e.chest==='chain'?'#777e76':'#94988d';
    rect('#383c35',-6,-19,12,12);rect(color,-5,-18,10,10);
    rect('#b2a98a',-5,-9,10,1);
    if(e.chest==='chain')for(let x=-4;x<5;x+=3)for(let y=-17;y<-10;y+=3)rect('#484f49',x,y,1,1);
    if(e.chest==='plate'){rect('#b4b8aa',-5,-18,2,7);rect('#525d58',3,-17,2,8)}
  }
  if(e.head){
    const hood=e.head==='hood';
    rect(hood?'#574c3a':'#626c64',-6,-29,12,5);
    rect(hood?'#8d7a55':'#b1b7a7',-4,-30,8,2);
    if(direction==='up')rect(hood?'#635840':'#828c80',-5,-25,10,3);
    else {rect('#444a40',-6,-24,2,3);rect('#444a40',4,-24,2,3)}
  }
  if(e.offHand){
    const kite=e.offHand==='kite_shield',wood=e.offHand==='wood_shield';
    rect('#34392f',-15,-15,8,10);rect(wood?'#796346':'#8e927e',-14,-14,6,8);
    rect('#b5aa84',-12,-12,2,3);if(kite)rect('#727c6b',-13,-5,4,3);
  }
  if(e.mainHand){
    ctx.translate(0,step);
    const id=e.mainHand;
    if(id==='bow'||id==='longbow'){
      rect('#ac9162',11,-24,2,3);rect('#745638',13,-21,2,5);rect('#745638',14,-16,2,8);
      rect('#ac9162',12,-8,2,4);rect('#d0c4a1',10,-22,1,18);
    }else if(id==='staff'||id==='oak_staff'){
      rect('#493a2a',11,-29,3,31);rect('#91734b',12,-27,1,28);
      rect('#7f9a8b',10,-29,5,4);rect('#c1c6a5',11,-29,2,2);
    }else if(id==='axe'||id==='pickaxe'){
      rect('#806143',12,-22,2,23);rect('#9baba0',8,-23,7,6);rect('#58675d',8,-18,5,2);
    }else{
      const spear=id==='spear',dagger=id==='dagger';
      rect('#575d55',11,spear?-32:dagger?-15:-25,3,spear?18:dagger?9:19);
      rect('#c0c5b4',12,spear?-31:dagger?-14:-24,1,spear?16:dagger?7:17);
      rect('#8b7047',9,-8,7,2);rect('#695038',12,-6,2,spear?12:5);
    }
  }
  ctx.restore();
}
