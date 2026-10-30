import Phaser from 'phaser';

/** Small, reusable original textures and ground details for a lived-in town. */
export function makeTownDetails(scene:Phaser.Scene){
 const g=scene.make.graphics({x:0,y:0});
 const r=(c:number,x:number,y:number,w:number,h:number)=>{g.fillStyle(c);g.fillRect(x,y,w,h)};
 const texture=(key:string,w:number,h:number,draw:()=>void)=>{g.clear();draw();g.generateTexture(key,w,h)};
 texture('hedge',64,32,()=>{r(0x303b2b,0,17,64,12);for(let i=0;i<16;i++){let x=i*4,y=7+(i*7)%9;r(i%3?0x455b38:0x536945,x,y,7,12);r(0x677750,x+1,y,3,2)}r(0x37472f,0,25,64,4)});
 texture('crate',28,25,()=>{r(0x292b23,1,5,26,19);r(0x735b3e,2,3,24,19);r(0x9a8058,4,5,20,2);r(0x58452f,4,9,20,2);r(0x58452f,4,16,20,2);r(0x443a2d,5,5,3,17);r(0x443a2d,20,5,3,17)});
 texture('barrel',24,30,()=>{r(0x292c25,3,7,18,21);r(0x806746,4,5,16,21);r(0xa0895d,7,6,3,18);r(0x393c35,4,9,16,2);r(0x393c35,4,21,16,2);r(0x554a37,6,3,12,3)});
 texture('bench',54,27,()=>{r(0x30332a,4,20,46,4);r(0x5c4933,7,9,4,15);r(0x5c4933,43,9,4,15);r(0x937952,3,6,48,5);r(0x725a3d,3,12,48,5);r(0xaa8e5f,5,7,44,1)});
 texture('shrub',36,29,()=>{r(0x33402e,2,13,32,12);for(let i=0;i<8;i++){let x=3+i*4,y=6+(i*7)%7;r(i%2?0x546a42:0x465d38,x,y,8,13);r(0x73805a,x+1,y+1,3,2)}});
 texture('rock',32,22,()=>{r(0x354035,2,16,28,5);r(0x70776a,5,9,22,9);r(0x8a8e7c,9,5,14,11);r(0xa5a495,11,6,9,2);r(0x606a5d,20,11,7,6)});
 texture('sign',32,42,()=>{r(0x3b3428,14,9,4,31);r(0x8e7750,15,10,2,28);r(0x3c3228,2,4,28,19);r(0x806a47,4,6,24,15);r(0xb09b71,8,9,16,2);r(0xb09b71,11,13,10,2);r(0xb09b71,14,16,4,2)});
 texture('flowerbed',96,48,()=>{r(0x383e30,1,8,94,32);r(0x6c6852,0,5,96,4);r(0x6c6852,0,38,96,4);r(0x5b6343,3,9,90,29);for(let i=0;i<55;i++){const x=4+(i*37)%87,y=11+(i*17)%24;r([0x83916a,0xb9aa80,0xc29a87,0x737f5b][i%4],x,y,2,2)}});
 texture('stallgoods',90,22,()=>{r(0x493a2c,0,14,90,6);for(let i=0;i<9;i++){const x=3+i*10;r(0x56452f,x,5,8,9);r([0x9b7650,0x72805b,0xb29a68][i%3],x+1,6,6,5);r(0xc0a47b,x+2,6,2,1)}});
 g.destroy();
}

export function dressTown(scene:Phaser.Scene,obstacles:Phaser.Physics.Arcade.StaticGroup){
 const ground=scene.add.graphics().setDepth(-670);
 // Paved side streets connect neighborhoods without turning the whole town into a rectangle.
 const street=(x:number,y:number,w:number,h:number)=>scene.add.tileSprite(x+w/2,y+h/2,w,h,'stone').setDepth(-790);
 street(440,600,330,100);street(1270,600,340,100);street(480,990,285,90);street(1280,990,320,90);street(570,1320,300,90);street(1180,1330,340,90);
 // Irregular banks, paths, and a planted central garden soften the rigid paving.
 ground.fillStyle(0x59664a);ground.fillRect(0,198,880,22);ground.fillRect(1168,198,880,22);ground.fillRect(0,380,880,17);ground.fillRect(1168,380,880,17);
 ground.fillStyle(0x6c6952);ground.fillRect(470,1390,260,55);ground.fillRect(1510,1030,190,45);
 ground.fillStyle(0x4b5940);ground.fillRect(790,615,115,95);ground.fillRect(1155,620,105,85);ground.fillRect(795,1035,115,60);ground.fillRect(1135,1040,115,60);
 // Border stones and paving highlights.
 ground.fillStyle(0x9b9884);for(let x=790;x<910;x+=12){ground.fillRect(x,613,9,3);ground.fillRect(x,708,9,3)}for(let x=1145;x<1260;x+=12){ground.fillRect(x,613,9,3);ground.fillRect(x,708,9,3)}
 const prop=(key:string,x:number,y:number,w:number,h:number)=>{scene.add.image(x,y,key).setOrigin(.5,.8).setDepth(y);const z=scene.add.zone(x,y+4,w,h);scene.physics.add.existing(z,true);obstacles.add(z)};
 // Planting is arranged around, not on, the established routes and NPC starting points.
 for(const [x,y] of [[845,647],[1207,654],[850,1060],[1190,1070]])scene.add.image(x,y,'flowerbed').setDepth(-600);
 for(const [x,y] of [[820,730],[1180,730],[825,1110],[1220,1110],[480,720],[1560,720]])prop('shrub',x,y,22,10);
 for(const [x,y] of [[610,720],[1430,720],[600,935],[1450,935],[970,1030],[1080,1030]])prop('bench',x,y,44,10);
 for(const [x,y] of [[670,700],[1380,700],[675,1120],[1490,1120],[760,855],[1330,855],[1470,670]])prop('barrel',x,y,17,12);
 for(const [x,y] of [[690,700],[1360,700],[690,1120],[1510,1120],[780,855],[1350,855],[1490,670]])prop('crate',x,y,22,12);
 for(const [x,y] of [[470,900],[1560,900],[500,1200],[1550,1200]])prop('sign',x,y,9,9);
 for(const [x,y] of [[300,660],[360,1000],[530,1500],[1550,1450],[1700,1080],[1800,500],[250,1200]])prop('rock',x,y,21,10);
 for(const [x,y] of [[530,850],[1515,850],[850,1150],[1200,1150]])prop('hedge',x,y,58,11);
 for(const [x,y] of [[740,796],[1308,796]])scene.add.image(x,y,'stallgoods').setDepth(y);
 // Distinct landmarks are part of the buildings rather than separate colliders.
 const landmarks=scene.add.graphics().setDepth(1161);
 landmarks.fillStyle(0x5e5d50);landmarks.fillRect(1009,1030,30,40);landmarks.fillStyle(0x9c9a83);landmarks.fillRect(1013,1034,22,30);landmarks.fillStyle(0x5a594b);landmarks.fillRect(1021,1019,6,30);landmarks.fillRect(1015,1028,18,5);
 const forge=scene.add.graphics().setDepth(536);forge.fillStyle(0x45443a);forge.fillRect(1460,402,22,27);forge.fillStyle(0x8a8070);forge.fillRect(1457,400,28,6);forge.fillStyle(0xbb7647);forge.fillRect(1466,425,10,3);
 // More varied understory; deterministic positions keep the map stable on reload.
 for(let i=0;i<120;i++){const x=55+(i*173)%1940,y=420+(i*227)%1280;if(x>470&&x<1580&&y<1270)continue;scene.add.image(x,y,i%4?'flower':'shrub').setScale(i%4?0.7:0.45).setDepth(-590)}
}
