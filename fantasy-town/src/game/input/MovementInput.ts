import Phaser from 'phaser';
export class MovementInput {
 private cursors:Phaser.Types.Input.Keyboard.CursorKeys; private keys:Record<string,Phaser.Input.Keyboard.Key>; touch={x:0,y:0}; touchRun=false;
 constructor(scene:Phaser.Scene){this.cursors=scene.input.keyboard!.createCursorKeys();this.keys=scene.input.keyboard!.addKeys('W,A,S,D') as Record<string,Phaser.Input.Keyboard.Key>;}
 vector(){let x=Number(this.cursors.right.isDown||this.keys.D.isDown)-Number(this.cursors.left.isDown||this.keys.A.isDown)+this.touch.x;let y=Number(this.cursors.down.isDown||this.keys.S.isDown)-Number(this.cursors.up.isDown||this.keys.W.isDown)+this.touch.y;const n=Math.hypot(x,y);if(n>1){x/=n;y/=n;}return {x,y};}
 get running(){return this.cursors.shift.isDown||this.touchRun}
}
