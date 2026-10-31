import Phaser from 'phaser';

/** The first independently rendered part of the square; coordinates are world pixels. */
export const CENTRAL_SQUARE={x:1360,y:450,width:112,height:72} as const;

/**
 * The original background remains underneath while the town is rebuilt in sections.
 * Ground and decoration are separate so they can be replaced without changing
 * player, NPC, combat or collision data. This patch contains no obstacles.
 */
export function buildCentralSquare(scene:Phaser.Scene){
 const {x,y,width,height}=CENTRAL_SQUARE;
 if(!scene.textures.exists('central-square-floor')){
  const texture=scene.textures.createCanvas('central-square-floor',width,height);
  if(!texture)throw new Error('Could not create square floor texture');
  const ctx=texture.getContext(),source=scene.textures.get('square-stone-art').getSourceImage() as HTMLImageElement;
  ctx.imageSmoothingEnabled=false;ctx.filter='brightness(1.25) saturate(0.65)';
  ctx.drawImage(source,0,0,source.width,source.height*height/width,0,0,width,height);
  ctx.filter='none';
  // A soft edge blends this first independent patch into the existing map.
  ctx.globalCompositeOperation='destination-in';ctx.save();ctx.translate(width/2,height/2);ctx.scale(width/2,height/2);
  const fade=ctx.createRadialGradient(0,0,.2,0,0,1);fade.addColorStop(0,'rgba(255,255,255,0.85)');fade.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=fade;ctx.fillRect(-1,-1,2,2);ctx.restore();ctx.globalCompositeOperation='source-over';texture.refresh();
 }
 const floor=scene.add.image(x,y,'central-square-floor').setOrigin(0).setDepth(-999);
 // A flush stone inlay is decorative ground: it never blocks movement.
 const decoration=scene.add.graphics().setDepth(-998);
 const cx=x+width/2,cy=y+height/2;
 decoration.fillStyle(0xa49b7d,.45).fillRect(cx-1,cy-5,2,10).fillRect(cx-5,cy-1,10,2);
 decoration.fillStyle(0x4b5045,.55).fillRect(cx-1,cy-1,2,2);
 return {floor,decoration};
}
