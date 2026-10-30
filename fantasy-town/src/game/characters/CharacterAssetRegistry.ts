import Phaser from 'phaser';
import type {AppearanceData,Direction,MovementState,Profession,Race} from './definitions';
/** Generated original artwork is cached by appearance and animation frame. */
export class CharacterAssetRegistry {
 constructor(private scene:Phaser.Scene){}
 frame(race:Race,profession:Profession,a:AppearanceData,direction:Direction,motion:MovementState,frame:number){const key=['character',race,profession,a.bodyType,a.skinVariant,a.hairStyle,a.hairColor,a.clothesVariant,a.primaryColor,a.secondaryColor,direction,motion,frame].join('-');if(!this.scene.textures.exists(key))this.generate(key,race,profession,a,direction,motion,frame);return key}
 private generate(key:string,race:Race,profession:Profession,a:AppearanceData,direction:Direction,motion:MovementState,frame:number){
  const g=this.scene.make.graphics({x:0,y:0});const rect=(c:number,x:number,y:number,w:number,h:number)=>{g.fillStyle(c);g.fillRect(x,y,w,h)};
  const step=motion==='idle'?0:[0,1,0,-1][frame%4];const bob=motion==='idle'?(frame===1?1:0):Math.abs(step);const short=race==='Dwarf'?3:0;const top=4+short+bob;const side=direction==='left'||direction==='right';
  rect(0x282c28,9,31,6,5);rect(0x282c28,18,31,6,5);rect(0x3c302b,10,28+step,5,7-step);rect(0x3c302b,18,28-step,5,7+step);
  const width=a.bodyType==='broad'||race==='Dwarf'?18:a.bodyType==='slim'?14:16;const left=16-width/2;rect(0x292d2a,left-1,16+short+bob,width+2,14-short);rect(a.primaryColor,left,17+short+bob,width,12-short);rect(a.secondaryColor,left,24+short+bob,width,3);rect(0x39362d,left+6,24+short+bob,4,3);rect(a.skinVariant,left-2,20+short+bob,3,6);rect(a.skinVariant,left+width-1,20+short+bob,3,6);
  rect(0x352e29,10,top,12,12);rect(a.skinVariant,11,top+2,10,10);rect(a.hairColor,10,top,12,4);
  if(a.hairStyle==='long'){rect(a.hairColor,9,top+3,3,11);rect(a.hairColor,21,top+3,3,11)}if(a.hairStyle==='hood'){rect(a.secondaryColor,8,top-1,16,4);rect(a.secondaryColor,8,top+2,3,8);rect(a.secondaryColor,21,top+2,3,8)}if(a.hairStyle==='bald')rect(a.skinVariant,11,top,10,3);
  if(race==='Elf'){rect(a.skinVariant,8,top+5,3,3);rect(a.skinVariant,21,top+5,3,3)}if(race==='Dwarf'&&direction!=='up'){rect(a.hairColor,11,top+9,10,5);rect(a.secondaryColor,14,top+12,4,2)}
  if(direction==='down'){rect(0x302c27,12,top+6,2,1);rect(0x302c27,18,top+6,2,1)}if(side){rect(0x302c27,20,top+6,2,1);rect(a.skinVariant,21,top+7,2,2)}if(direction==='up')rect(a.hairColor,11,top+3,10,8);
  if(profession==='Mage'||profession==='Priest'){rect(a.secondaryColor,14,18+short+bob,4,10-short);rect(0xc6b485,15,20+short+bob,2,2)}
  if(profession==='Warrior'){rect(0x999a8c,left-1,17+short+bob,4,4);rect(0x999a8c,left+width-3,17+short+bob,4,4);rect(0xaaa99b,26,14+bob,2,16);rect(0x69553e,24,25+bob,5,2)}
  if(profession==='Archer'){rect(0x6d5339,25,13+bob,2,18);rect(0xb2a17b,27,16+bob,1,12)}if(profession==='Rogue'){rect(0x777e77,25,22+bob,2,9);rect(0x4d3d30,24,28+bob,4,2)}if(profession==='Merchant'){rect(0x9c7a50,19,25+bob,6,6);rect(0xc3ab77,21,26+bob,2,2)}if(profession==='Craftsman'){rect(0x927554,12,21+bob,9,9);rect(0x514133,14,24+bob,5,2)}if(profession==='Mage'){rect(0x6c573c,25,11+bob,2,23);rect(0x899b91,24,10+bob,4,3)}
  g.generateTexture(key,32,40);g.destroy();
 }
}
