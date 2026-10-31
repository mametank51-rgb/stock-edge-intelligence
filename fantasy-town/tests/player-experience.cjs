const assert=require('node:assert/strict'),Module=require('node:module'),esbuild=require('esbuild');
function load(file){const m=new Module(file,module);m._compile(esbuild.buildSync({entryPoints:[file],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text,__filename);return m.exports}
const {parseCharacterProfile}=load('src/game/persistence/CharacterProfile.ts');
assert.deepEqual(parseCharacterProfile('{"version":1,"race":"Elf","profession":"Mage","preset":2}'),{version:1,race:'Elf',profession:'Mage',preset:2});
for(const v of [null,[],{}, {version:1,race:'Dragon',profession:'Mage',preset:0},{version:1,race:'Human',profession:'Mage',preset:-1},{version:1,race:'Human',profession:'Mage',preset:1.2}])assert.equal(parseCharacterProfile(JSON.stringify(v)),null);
const {attackUnavailable,cycleTarget}=load('src/game/combat/attackAvailability.ts');
const ready={dead:false,hasTarget:true,targetDead:false,distance:40,range:60,mana:65,cost:10,remaining:0,x:180,y:495};
assert.equal(attackUnavailable(ready),null);
assert.match(attackUnavailable({...ready,hasTarget:false}),/選んで/);
assert.match(attackUnavailable({...ready,distance:100}),/届きません/);
assert.match(attackUnavailable({...ready,mana:0}),/MP/);
assert.match(attackUnavailable({...ready,x:1400,y:480}),/安全地帯/);
assert.match(attackUnavailable({...ready,dead:true}),/倒れて/);
assert.match(attackUnavailable({...ready,remaining:300}),/準備/);
assert.equal(cycleTarget([],null),null);assert.equal(cycleTarget(['a','b','c'],'b'),'c');assert.equal(cycleTarget(['a','b','c'],'c'),'a');
const {parseOfflineBackup}=load('src/game/persistence/OfflineStore.ts');
const {ItemEngine}=load('src/game/items/ItemEngine.ts');
const engine=new ItemEngine(),player=engine.join('source-player');
const raw=JSON.stringify({version:1,playerId:'source-player',items:player,skills:{mining:4},ground:[]});
const restored=parseOfflineBackup(raw,'target-player',10000);
assert.equal(restored.playerId,'target-player');assert.equal(restored.skills.mining,4);assert.equal(restored.items.inventory.items.length,player.inventory.items.length);
const bad=JSON.parse(raw);bad.items.inventory.items[0].quantity=99999;assert.equal(parseOfflineBackup(JSON.stringify(bad),'target-player',10000),null);
assert.equal(parseOfflineBackup('{broken','target-player',10000),null);assert.equal(parseOfflineBackup(' '.repeat(1024*1024+1),'target-player',10000),null);
console.log('PASS: profile validation, attack feedback, target cycling and portable validated offline backups');

const previousStorage=global.localStorage,previousWarn=console.warn,warnings=[];
try{
 global.localStorage={getItem(){throw new Error('Storage disabled')},setItem(){throw new Error('Storage disabled')}};
 console.warn=(...args)=>warnings.push(args);
 const identity=load('src/game/network/identity.ts');
 const first=identity.identity(),second=identity.identity();assert.equal(first.id,second.id);
 identity.saveName('Temporary name');assert.equal(identity.identity().id,first.id);assert.equal(identity.identity().name,'Temporary name');
 assert.ok(warnings.length>=1,'Storage failure must be reported');
}finally{global.localStorage=previousStorage;console.warn=previousWarn}
console.log('PASS: stable session identity and name when device storage is blocked');
