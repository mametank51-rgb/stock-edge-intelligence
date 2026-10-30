import Phaser from 'phaser';
// Original placeholder textures, generated once at scene startup.
export function makeArt(scene:Phaser.Scene){
 const g=scene.make.graphics({x:0,y:0});
 const r=(c:number,x:number,y:number,w:number,h:number)=>{g.fillStyle(c);g.fillRect(x,y,w,h)};
 const t=(key:string,w:number,h:number,fn:()=>void)=>{g.clear();fn();g.generateTexture(key,w,h)};
 t('grass',64,64,()=>{r(0x40503a,0,0,64,64);for(let i=0;i<110;i++){let x=(i*37+13)%64,y=(i*23+Math.floor(i/4)*11+7)%64;r([0x4e6043,0x536044,0x354933,0x657052][i%4],x,y,i%3===0?3:1,1);if(i%7===0)r(0x75805b,x+1,y-2,1,2)}});
 t('stone',64,64,()=>{r(0x595c51,0,0,64,64);for(let y=0;y<64;y+=8)for(let x=-8;x<64;x+=12){let xx=x+(y%16?6:0);const shade=[0x77796b,0x6e7164,0x808071,0x686d60][Math.abs((Math.floor(x/12)*3+y/8*7)%4)];r(shade,xx+1,y+1,10,6);r(0x929183,xx+2,y+1,7,1);r(0x51584e,xx+2,y+6,8,1);if((x+y)%3===0)r(0x626756,xx+4,y+3,2,1)}});
 t('water',64,64,()=>{r(0x2a4647,0,0,64,64);for(let i=0;i<28;i++){let x=(i*29)%64,y=(i*17+Math.floor(i/5)*3)%64;r(i%3?0x385a5b:0x4f6d68,x,y,5+(i%4)*4,1);if(i%4===0)r(0x68817b,x+2,y+2,4,1)}});
 t('tree',96,112,()=>{r(0x493e2d,43,65,12,38);r(0x6c5940,47,70,4,29);g.fillStyle(0x293c2c);g.fillCircle(48,50,38);g.fillCircle(25,57,21);g.fillCircle(70,59,23);g.fillStyle(0x3c553a);g.fillCircle(45,42,31);g.fillCircle(23,52,15);g.fillCircle(68,49,17);g.fillStyle(0x52694a);g.fillCircle(35,27,15);g.fillCircle(60,38,13);r(0x647858,27,29,9,3)});
 t('house',192,160,()=>{r(0x292b25,5,145,182,12);r(0x83745e,14,59,164,87);r(0xa4967b,19,64,154,71);r(0x594d3f,17,68,5,67);r(0x594d3f,170,68,5,67);r(0x594d3f,18,100,156,5);r(0x3c3029,2,44,188,20);r(0x55443a,13,19,166,36);r(0x705547,21,12,150,36);for(let y=18;y<53;y+=8)for(let x=20+(y%16?5:0);x<170;x+=22)r(0x806253,x,y,17,2);r(0x46382d,82,105,29,40);r(0x765844,86,109,21,36);r(0xb69b68,101,126,3,3);for(const x of [38,132]){r(0x463c32,x,79,23,20);r(0xb4a170,x+3,82,17,13);r(0x5b4a39,x+10,82,2,14)}r(0x70695e,125,0,20,23)});
 t('player',32,40,()=>{r(0x272b26,7,31,19,5);r(0x3c302a,10,27,5,8);r(0x3c302a,18,27,5,8);r(0x665440,8,16,17,14);r(0x8b7756,10,17,13,10);r(0x423d32,8,23,17,3);r(0xb09571,10,7,12,11);r(0x44392c,9,5,14,6);r(0xd0b18b,13,11,6,5);r(0x34342c,7,17,3,10);r(0x34342c,23,17,3,10)});
 t('fountain',120,100,()=>{g.fillStyle(0x464b43);g.fillEllipse(60,76,116,45);g.fillStyle(0x999789);g.fillEllipse(60,69,110,48);g.fillStyle(0x4d6665);g.fillEllipse(60,67,91,34);g.fillStyle(0x718885);g.fillEllipse(60,65,65,18);r(0x999789,52,38,16,28);g.fillStyle(0xb0ab99);g.fillEllipse(60,37,34,12);r(0x899f98,58,20,4,15)});
 t('lamp',24,76,()=>{r(0x3b3830,11,22,4,48);r(0x302f29,6,7,14,18);r(0xb4a36c,8,10,10,11);r(0xd4c28a,10,12,5,7);r(0x403c31,5,5,16,3)});
 t('market',120,92,()=>{r(0x3d3329,8,63,104,18);r(0x6d503a,12,60,96,13);r(0x514034,15,34,5,53);r(0x514034,100,34,5,53);r(0x6d4638,5,19,110,35);for(let x=5;x<115;x+=22)r(0xc0a782,x,19,11,35);r(0x4e3e33,5,52,110,5);r(0x8c744b,30,58,16,9)});
 t('fence',64,30,()=>{r(0x554a36,0,8,64,4);r(0x78664b,0,19,64,4);for(let x=3;x<64;x+=24){r(0x483e30,x,2,5,27);r(0x927b57,x+1,3,2,24)}});
 t('flower',16,16,()=>{r(0x769060,7,8,2,7);r(0xb9aa8a,5,5,3,3);r(0xc29a81,9,7,3,3);r(0xd4c29a,7,6,2,2)});g.destroy();
}
