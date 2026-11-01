// Run setup, restart local Wrangler with the same --persist-to path, then verify.
const assert=require('node:assert/strict'),fs=require('node:fs'),{WebSocket}=require('ws');
const [mode,room,id,file]=process.argv.slice(2);
if(!['setup','verify'].includes(mode)||!room||!id||!file)throw Error('Expected: setup|verify room player-id result-file');
const target=new URL(process.env.TEST_WS_URL||'ws://127.0.0.1:8787');target.searchParams.set('room',room);
const ws=new WebSocket(target,{handshakeTimeout:10000});
const messages=[],waiters=[];ws.on('error',()=>{});ws.on('message',data=>{const m=JSON.parse(data.toString()),i=waiters.findIndex(w=>w.test(m));if(i<0)messages.push(m);else{const [w]=waiters.splice(i,1);clearTimeout(w.timer);w.resolve(m)}});
const wait=test=>{const i=messages.findIndex(test);if(i>=0)return Promise.resolve(messages.splice(i,1)[0]);return new Promise((resolve,reject)=>{const w={test,resolve,timer:null};w.timer=setTimeout(()=>{const i=waiters.indexOf(w);if(i>=0)waiters.splice(i,1);reject(Error('Server response timed out'))},8000);waiters.push(w)})};
const send=m=>ws.send(JSON.stringify(m));
async function main(){
 try{
  if(ws.readyState!==WebSocket.OPEN)await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject)});
  const appearance={bodyType:'standard',skinVariant:13214078,hairStyle:'short',hairColor:4937773,clothesVariant:0,primaryColor:5860192,secondaryColor:9993303};
  send({type:'JOIN',player:{id,name:mode==='setup'?'保存テスト':'異なる名前',x:mode==='setup'?1400:1000,y:480,direction:'down',movementState:'idle',race:'Human',profession:'Warrior',appearance,timestamp:Date.now()}});
  await wait(m=>m.type==='PLAYER_SNAPSHOT');const inventory=(await wait(m=>m.type==='INVENTORY_UPDATE')).player;
  if(mode==='setup'){
   const sword=inventory.inventory.items.find(x=>x.definitionId==='sword'),shield=inventory.inventory.items.find(x=>x.definitionId==='wood_shield');
   send({type:'ITEM_ACTION',itemAction:{action:'EQUIP',id:sword.instanceId}});await wait(m=>m.type==='INVENTORY_UPDATE'&&m.player.equipment.mainHand?.instanceId===sword.instanceId);
   send({type:'MARKET_ACTION',marketAction:{action:'LIST',itemId:shield.instanceId,price:5}});await wait(m=>m.type==='MARKET_SNAPSHOT'&&m.listings.some(l=>l.id===shield.instanceId));
   fs.writeFileSync(file,JSON.stringify({sword:sword.instanceId,shield:shield.instanceId}));console.log('PASS: saved equipment and escrow before Worker restart');
  }else{
   const expected=JSON.parse(fs.readFileSync(file,'utf8')),profile=await wait(m=>m.type==='PLAYER_RESTORE');
   assert.equal(profile.player.name,'保存テスト');assert.equal(profile.player.x,1400);assert.equal(inventory.equipment.mainHand.instanceId,expected.sword);
   assert.ok(!inventory.inventory.items.some(i=>i.instanceId===expected.shield));const listing=await wait(m=>m.type==='MARKET_SNAPSHOT');assert.ok(listing.listings.some(l=>l.id===expected.shield));
   console.log('PASS: profile, position, equipment and escrow restored on reconnect');
  }
 }finally{ws.close();await new Promise(resolve=>{if(ws.readyState===WebSocket.CLOSED)return resolve();ws.once('close',resolve);setTimeout(()=>{ws.terminate();resolve()},1500)})}
}
main().catch(error=>{console.error(error);process.exitCode=1});
