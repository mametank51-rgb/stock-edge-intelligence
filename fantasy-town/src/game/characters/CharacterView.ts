import Phaser from 'phaser';
import {CharacterAssetRegistry} from './CharacterAssetRegistry';
import type {AppearanceData,Direction,MovementState,Profession,Race} from './definitions';
import type {NpcArt} from './art';
import type {EquipmentVisual} from '../items/model';
import {drawEquipment} from './equipmentArt';
export interface CharacterVisualState {x:number;y:number;name:string;race:Race;profession:Profession;appearance:AppearanceData;direction:Direction;movementState:MovementState}
let nextLayerId=0;
export class CharacterView {
 readonly sprite:Phaser.Physics.Arcade.Sprite;
 private shadow:Phaser.GameObjects.Ellipse;
 private ring:Phaser.GameObjects.Ellipse;
 private label:Phaser.GameObjects.Text;
 private equipment:EquipmentVisual={};
 private equipmentArt:Phaser.GameObjects.Image;
 private equipmentTexture:Phaser.Textures.CanvasTexture;
 private equipmentSignature='';
 private previewSignature='';
 private elapsed=0;private frame=0;private animation='';
 constructor(private scene:Phaser.Scene,private registry:CharacterAssetRegistry,public state:CharacterVisualState,
   alwaysName=false,private detailed=false,private art?:NpcArt,private preview=false){
  this.shadow=scene.add.ellipse(state.x,state.y+7,23,7,0x101510,.34);
  this.ring=scene.add.ellipse(state.x,state.y+7,27,10).setStrokeStyle(1,0xcab581,.8).setVisible(false);
  this.sprite=scene.physics.add.sprite(state.x,state.y,registry.frame(state.race,state.profession,state.appearance,state.direction,'idle',0,detailed,art)).setOrigin(.5,.8);
  this.sprite.body!.setSize(12,10).setOffset(10,25);this.sprite.setCollideWorldBounds(true);
  const texture=scene.textures.createCanvas('equipment-layer-'+nextLayerId++,48,48);
  if(!texture)throw new Error('Could not create equipment layer');
  this.equipmentTexture=texture;
  this.equipmentArt=scene.add.image(state.x,state.y,texture.key).setOrigin(.5,.75);
  this.label=scene.add.text(state.x,state.y-36,state.name,{fontFamily:'serif',fontSize:'11px',color:'#eadbb7',stroke:'#22271f',strokeThickness:3}).setOrigin(.5,1).setVisible(alwaysName);
 }
 update(delta:number){
  const s=this.state,anim=s.direction+'-'+s.movementState;
  if(anim!==this.animation){this.animation=anim;this.frame=0;this.elapsed=0}
  this.elapsed+=delta;
  const duration=s.movementState==='run'?105:s.movementState==='walk'?180:650;
  if(this.elapsed>=duration){this.elapsed%=duration;this.frame=(this.frame+1)%(s.movementState==='idle'?2:4)}
  this.sprite.setTexture(this.registry.frame(s.race,s.profession,s.appearance,s.direction,s.movementState,this.frame,this.detailed,this.art)).setFlipX(s.direction==='left').setDepth(s.y);
  this.shadow.setPosition(s.x,s.y+7).setDepth(s.y-.2);
  this.ring.setPosition(s.x,s.y+7).setDepth(s.y-.1);
  this.label.setPosition(s.x,s.y-35).setDepth(s.y+1);
  const step=s.movementState==='idle'?0:[0,1,0,-1][this.frame];
  const signature=JSON.stringify([this.equipment,s.direction,step]);
  if(signature!==this.equipmentSignature){
   this.equipmentSignature=signature;
   const ctx=this.equipmentTexture.getContext();ctx.clearRect(0,0,48,48);
   drawEquipment(ctx,this.equipment,s.direction,step);this.equipmentTexture.refresh();
  }
  this.equipmentArt.setPosition(s.x,s.y).setDepth(s.y+.2).setAngle(this.sprite.angle).setAlpha(this.sprite.alpha);
  const profile=this.preview?JSON.stringify([s.race,s.profession,s.appearance,this.equipment]):'';
  if(this.preview&&profile!==this.previewSignature){
   this.previewSignature=profile;
   const canvas=document.createElement('canvas');canvas.width=48;canvas.height=48;
   const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;
   const texture=this.registry.frame(s.race,s.profession,s.appearance,'down','idle',0,this.detailed,this.art);
   ctx.drawImage(this.scene.textures.get(texture).getSourceImage() as HTMLCanvasElement,8,4);
   drawEquipment(ctx,this.equipment,'down');
   window.dispatchEvent(new CustomEvent('town-character-preview',{detail:canvas.toDataURL()}));
  }
 }
 showName(show:boolean){this.label.setVisible(show)}
 select(selected:boolean){this.ring.setVisible(selected)}
 setName(name:string){this.label.setText(name)}
 setEquipment(equipment:EquipmentVisual){this.equipment={...equipment}}
 destroy(){this.sprite.destroy();this.shadow.destroy();this.ring.destroy();this.label.destroy();this.equipmentArt.destroy();this.scene.textures.remove(this.equipmentTexture.key)}
}
