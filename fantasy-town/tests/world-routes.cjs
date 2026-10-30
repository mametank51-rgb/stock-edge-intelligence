const assert=require('node:assert/strict'),esbuild=require('esbuild'),Module=require('node:module');
const code=esbuild.buildSync({entryPoints:['src/game/world/collision.ts'],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
const mod=new Module('world-routes',module);mod._compile(code,__filename);const {WORLD_BLOCKS}=mod.exports;
const blocked=(x,y)=>WORLD_BLOCKS.some(([a,b,w,h])=>x+6>a&&x-6<a+w&&y+6>b&&y-6<b+h);
// Central copy of the river: water is blocked, bridge and woodland bank are open.
assert.equal(blocked(735+250,570),true);assert.equal(blocked(735+150,570),false);assert.equal(blocked(735+170,365),false);
assert.equal(blocked(735+140,180),false,'wooden pier should be walkable');
assert.equal(blocked(735+120,280),true,'harbour water should be blocked');
const step=10,cols=275,rows=171,start=[141,48],queue=[start],seen=new Set([start.join(',')]);
for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0]]){const xx=x+dx,yy=y+dy,key=`${xx},${yy}`;if(xx<0||yy<0||xx>=cols||yy>=rows||seen.has(key)||blocked(xx*step+5,yy*step+5))continue;seen.add(key);queue.push([xx,yy])}}
for(const [name,x,y] of [['inn',1301,250],['smith',1615,695],['market',1679,405],['pier',875,180],['riverbank',1100,580],['west',200,500],['east',2500,500],['south',1400,1450]])assert.ok(seen.has(`${Math.floor(x/step)},${Math.floor(y/step)}`),`${name} is unreachable`);
console.log('PASS: river, bridge, bank and routes to town districts');
