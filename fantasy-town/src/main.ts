import {installJourneyUI} from './game/ui/JourneyUI';
import Phaser from 'phaser';
import {TownScene} from './game/scenes/TownScene';
import {createUI} from './game/ui/interface';
import './style.css';
const root=document.querySelector<HTMLElement>('#ui')!;createUI(root);installJourneyUI(root);
new Phaser.Game({type:Phaser.AUTO,parent:'game',backgroundColor:'#26352b',pixelArt:true,scale:{mode:Phaser.Scale.RESIZE,width:innerWidth,height:innerHeight},physics:{default:'arcade',arcade:{debug:false}},scene:[TownScene]});
