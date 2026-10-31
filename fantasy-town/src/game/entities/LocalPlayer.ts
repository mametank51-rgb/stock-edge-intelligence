import Phaser from 'phaser';
import type {PlayerState} from '../state/GameState';
import {CharacterView} from '../characters/CharacterView';import {CharacterAssetRegistry} from '../characters/CharacterAssetRegistry';
export class LocalPlayer {
 view:CharacterView;get sprite(){return this.view.sprite}
 constructor(scene:Phaser.Scene,public state:PlayerState,registry:CharacterAssetRegistry){this.view=new CharacterView(scene,registry,state,true,true);this.view.select(true)}
 update(x:number,y:number,run:boolean,delta:number,weightFactor=1){const s=this.state;s.x=this.sprite.x;s.y=this.sprite.y;const moving=Math.hypot(x,y)>.03;s.movementState=moving?(run?'run':'walk'):'idle';if(moving)s.direction=Math.abs(x)>Math.abs(y)?(x<0?'left':'right'):(y<0?'up':'down');this.sprite.setVelocity(x*(run?210:135)*weightFactor,y*(run?210:135)*weightFactor);this.view.update(delta)}
}
