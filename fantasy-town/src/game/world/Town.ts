import Phaser from 'phaser';

// Coordinates correspond to the supplied 1280 × 853 image, in image pixels.
export const WORLD_WIDTH=2750, WORLD_HEIGHT=1706;
export const ORIGINAL_OFFSET_X=735;
import {BLOCKS,segments} from './collision';
export class Town {
 readonly obstacles:Phaser.Physics.Arcade.StaticGroup;
 constructor(scene:Phaser.Scene){
  this.obstacles=scene.physics.add.staticGroup();
  scene.add.image(0,0,'town-expanded').setOrigin(0).setDepth(-1000);
  // Each extension uses a crop of the supplied image. Transform and clip its
  // collision rectangles by the same amount so paths remain consistent.
  for(const [destX,destY,sourceX,width] of segments)for(const [x,y,w,h] of BLOCKS){
   const left=Math.max(x,sourceX),right=Math.min(x+w,sourceX+width);
   if(right<=left)continue;
   const zone=scene.add.zone(destX+left-sourceX+(right-left)/2,destY+y+h/2,right-left,h);
   scene.physics.add.existing(zone,true);this.obstacles.add(zone);
  }
 }
}
