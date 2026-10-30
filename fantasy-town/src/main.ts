import Phaser from 'phaser';
import {TownScene} from './game/scenes/TownScene';
import {createUI} from './game/ui/interface';
import './style.css';
createUI(document.querySelector<HTMLElement>('#ui')!);
new Phaser.Game({type:Phaser.AUTO,parent:'game',backgroundColor:'#26352b',pixelArt:true,scale:{mode:Phaser.Scale.RESIZE,width:innerWidth,height:innerHeight},physics:{default:'arcade',arcade:{debug:false}},scene:[TownScene]});
