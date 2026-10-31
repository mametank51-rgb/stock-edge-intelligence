import Phaser from 'phaser';
import type {AppearanceData,Direction,MovementState,Profession,Race} from './definitions';

/** Original low-resolution character frames, shared by local players and NPCs. */
export class CharacterAssetRegistry {
 constructor(private scene:Phaser.Scene){}
 frame(race:Race,profession:Profession,a:AppearanceData,direction:Direction,motion:MovementState,frame:number,detailed=false,art?:'townswoman'|'guard'|'blacksmith'|'merchant'|'innkeeper'|'traveler'|'priest'|'fisher'){const standard=detailed&&race==='Human'&&a.clothesVariant===0&&a.bodyType==='standard'&&a.hairStyle==='short'&&a.primaryColor===0x596b60&&a.skinVariant===0xc9a17e&&a.hairColor===0x4b382d&&a.secondaryColor===0x987c57;const asset=art??(standard&&profession==='Warrior'?'adventurer':standard&&profession==='Mage'?'mage':standard&&profession==='Archer'?'archer':null);const key=['character',asset??'drawn',race,profession,a.bodyType,a.skinVariant,a.hairStyle,a.hairColor,a.clothesVariant,a.primaryColor,a.secondaryColor,direction,motion,frame].join('-');if(!this.scene.textures.exists(key)){if(asset)this.generateArt(key,direction,motion,frame,asset);else this.generate(key,race,profession,a,direction,motion,frame)}return key}
 private generateArt(key:string,direction:Direction,motion:MovementState,frame:number,asset:'adventurer'|'mage'|'archer'|'townswoman'|'guard'|'blacksmith'|'merchant'|'innkeeper'|'traveler'|'priest'|'fisher'){const image=this.scene.textures.get(`${asset}-art`).getSourceImage() as HTMLImageElement;const row=direction==='down'?0:direction==='up'?3:2;const column=motion==='idle'?0:frame%4;const texture=this.scene.textures.createCanvas(key,32,40);if(!texture)throw new Error('Could not create character texture');const ctx=texture.getContext();ctx.imageSmoothingEnabled=false;if(asset==='townswoman')ctx.drawImage(image,124+column*248,row*294,248,300,0,0,32,40);else if(asset==='merchant')ctx.drawImage(image,82+column*281,row*295,281,295,0,0,32,40);else if(asset==='innkeeper')ctx.drawImage(image,[95,394,658,937][column],row*294,280,294,0,0,32,40);else if(asset==='traveler')ctx.drawImage(image,53+column*294,row*300,294,300,0,0,32,40);else if(asset==='fisher')ctx.drawImage(image,[54,332,622,908][column],[0,302,612,918][row],280,305,0,0,32,40);else if(asset==='mage')ctx.drawImage(image,[32,296,560,825][column],image.height*row/4,286,image.height/4,0,0,32,40);else if(asset==='archer')ctx.drawImage(image,[27,304,570,843][column],image.height*row/4,270,image.height/4,0,0,32,40);else ctx.drawImage(image,image.width*column/4,image.height*row/4,image.width/4,image.height/4,0,0,32,40);texture.refresh()}
 private generate(key:string,race:Race,profession:Profession,a:AppearanceData,direction:Direction,motion:MovementState,frame:number){
  const g=this.scene.make.graphics({x:0,y:0});
  const rect=(c:number,x:number,y:number,w:number,h:number)=>{g.fillStyle(c);g.fillRect(x,y,w,h)};
  const shade=(c:number,f:number)=>{const v=(n:number)=>Math.max(0,Math.min(255,Math.round(n*f)));return (v(c>>16&255)<<16)|(v(c>>8&255)<<8)|v(c&255)};
  const outline=0x292822,skin=a.skinVariant,cloth=a.primaryColor,trim=a.secondaryColor;
  const step=motion==='idle'?0:[0,1,0,-1][frame%4],bob=motion==='idle'?(frame===1?1:0):Math.abs(step),short=race==='Dwarf'?2:0;
  const top=4+short+bob,bodyTop=17+short+bob,width=a.bodyType==='broad'||race==='Dwarf'?16:a.bodyType==='slim'?12:14,left=16-width/2,side=direction==='left'||direction==='right';
  // Staggered boots and legs give the silhouette a readable stride.
  rect(outline,10,29+step,6,7-step);rect(outline,17,29-step,6,7+step);
  rect(0x62513e,11,29+step,4,4);rect(0x62513e,18,29-step,4,4);
  rect(0x3a3028,9,34+step,7,3);rect(0x3a3028,17,34-step,7,3);
  rect(0x806a4f,10,34+step,4,1);rect(0x806a4f,18,34-step,4,1);
  // Tunic, sleeves and belt use shaped edges and muted highlights.
  rect(outline,left,bodyTop-1,width,12-short);rect(outline,left-2,bodyTop+2,2,8);rect(outline,left+width,bodyTop+2,2,8);
  rect(shade(cloth,.65),left,bodyTop+1,width,10-short);rect(cloth,left+1,bodyTop,width-2,9-short);
  rect(shade(cloth,1.22),left+2,bodyTop+1,3,5);rect(shade(cloth,.82),left+width-4,bodyTop+2,2,6);
  rect(shade(cloth,.72),left-1,bodyTop+3+step,3,6);rect(shade(cloth,.72),left+width-2,bodyTop+3-step,3,6);
  rect(shade(skin,.78),left-1,bodyTop+8+step,3,3);rect(shade(skin,.78),left+width-2,bodyTop+8-step,3,3);
  rect(shade(trim,.62),left+1,bodyTop+8,width-2,3);rect(trim,left+2,bodyTop+8,width-4,1);rect(0xc2ad7c,15,bodyTop+8,2,2);
  if(profession==='Mage'||profession==='Priest'){rect(shade(cloth,.72),left+2,bodyTop+10,width-4,5-short);rect(shade(trim,.8),15,bodyTop+1,2,12-short)}
  // Hair and face are built as a stepped outline, not a flat square.
  rect(outline,11,top,10,2);rect(outline,9,top+2,14,7);rect(outline,10,top+9,12,3);
  rect(shade(skin,.72),11,top+3,10,8);rect(skin,11,top+2,9,7);rect(shade(skin,1.12),12,top+4,5,2);
  rect(shade(a.hairColor,.7),10,top+2,12,3);rect(a.hairColor,11,top,10,4);rect(shade(a.hairColor,1.3),12,top+1,4,1);
  if(a.hairStyle==='long'){rect(a.hairColor,9,top+4,3,8);rect(shade(a.hairColor,.8),21,top+3,3,9)}
  if(a.hairStyle==='hood'){rect(shade(trim,.65),9,top,14,3);rect(trim,10,top-1,12,2);rect(shade(trim,.7),9,top+3,2,7);rect(shade(trim,.7),21,top+3,2,7)}
  if(a.hairStyle==='bald'){rect(skin,11,top+1,10,3);rect(shade(skin,1.1),13,top+1,5,1)}
  if(direction==='up'){rect(a.hairColor,11,top+3,10,7);rect(shade(a.hairColor,1.2),12,top+4,2,4)}
  else if(side){rect(0x342c27,19,top+6,2,1);rect(shade(skin,.72),20,top+8,2,2)}
  else{rect(0x342c27,12,top+6,2,1);rect(0x342c27,18,top+6,2,1);rect(shade(skin,.7),14,top+9,4,1)}
  if(race==='Elf'){rect(skin,8,top+5,3,2);rect(skin,21,top+5,3,2)}
  if(race==='Dwarf'&&direction!=='up'){rect(a.hairColor,11,top+9,10,3);rect(shade(a.hairColor,.75),13,top+12,6,2)}
  // Small role-specific details are part of the temporary art, not stats.
  if(profession==='Warrior'){rect(0x555b56,left,bodyTop,4,3);rect(0xa4aaa0,left+1,bodyTop,3,1);rect(0x555b56,left+width-4,bodyTop,4,3);rect(0xa4aaa0,left+width-4,bodyTop,3,1);rect(0xb5b4a3,26,14+bob,2,15);rect(0x6c5438,24,26+bob,5,2)}
  if(profession==='Archer'){rect(0x70553b,26,13+bob,2,17);rect(0xc0aa80,28,16+bob,1,11)}
  if(profession==='Rogue'){rect(0x999c8e,26,22+bob,2,8);rect(0x514030,25,28+bob,4,2)}
  if(profession==='Merchant'){rect(0x806342,19,bodyTop+8,5,5);rect(0xc1a77b,20,bodyTop+9,2,1)}
  if(profession==='Craftsman'){rect(0x957c58,12,bodyTop+4,8,7);rect(0x604b38,13,bodyTop+6,6,2)}
  if(profession==='Mage'){rect(0x735b3f,26,11+bob,2,23);rect(0xa3b2a2,25,10+bob,3,3)}
  g.generateTexture(key,32,40);g.destroy();
 }
}
