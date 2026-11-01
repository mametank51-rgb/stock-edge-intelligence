import Phaser from 'phaser';

// Coordinates correspond to the supplied 1280 × 853 image, in image pixels.
export const WORLD_WIDTH=2750, WORLD_HEIGHT=1706;
export {ORIGINAL_OFFSET_X} from './collision';
import {WORLD_BLOCKS} from './collision';
import {buildCentralSquare} from './CentralSquare';
import {addWaymarks} from './Waymarks';
import {MAP_TILES} from './MapTiles';
export class Town {
 readonly obstacles:Phaser.Physics.Arcade.StaticGroup;
 constructor(scene:Phaser.Scene){
  this.obstacles=scene.physics.add.staticGroup();
  for(const tile of MAP_TILES)scene.add.image(tile.x,tile.y,tile.key).setOrigin(0).setDepth(-1000);
  buildCentralSquare(scene);
  addWaymarks(scene);
  // Each extension uses a crop of the supplied image. Transform and clip its
  // collision rectangles by the same amount so paths remain consistent.
  for(const [x,y,w,h] of WORLD_BLOCKS){
   const zone=scene.add.zone(x+w/2,y+h/2,w,h);
   scene.physics.add.existing(zone,true);this.obstacles.add(zone);
  }
 }
}
