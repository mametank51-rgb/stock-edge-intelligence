// Verify a deployed endpoint in a newly generated room, separate from real players.
const assert=require('node:assert/strict');
const {WebSocket}=require('ws');
const {randomBytes}=require('node:crypto');
const endpoint=process.env.TEST_WS_URL;
if(!endpoint)throw new Error('Set TEST_WS_URL to the deployed wss:// endpoint');
const target=new URL(endpoint);
if(target.protocol!=='wss:')throw new Error('Public endpoint must use wss://');
target.searchParams.set('room','check_'+randomBytes(8).toString('hex'));
const appearance={bodyType:'standard',skinVariant:13214078,hairStyle:'short',hairColor:4937773,clothesVariant:0,primaryColor:5860192,secondaryColor:9993303};
class Peer {
 constructor(name){
  this.id='check-'+randomBytes(8).toString('hex');this.name=name;this.messages=[];this.waiters=[];
  this.ws=new WebSocket(target,{handshakeTimeout:10000});
  this.ws.on('error',()=>{});
  this.ws.on('message',data=>{
   let value;try{value=JSON.parse(data.toString())}catch{return}
   const i=this.waiters.findIndex(w=>w.test(value));
   if(i<0)this.messages.push(value);
   else{const [w]=this.waiters.splice(i,1);clearTimeout(w.timer);w.resolve(value)}
  });
 }
 wait(test){
  const i=this.messages.findIndex(test);if(i>=0)return Promise.resolve(this.messages.splice(i,1)[0]);
  return new Promise((resolve,reject)=>{const w={test,resolve,timer:null};w.timer=setTimeout(()=>{this.waiters.splice(this.waiters.indexOf(w),1);reject(Error('Server response timed out'))},10000);this.waiters.push(w)});
 }
 send(message){this.ws.send(JSON.stringify(message))}
 async join(x){
  if(this.ws.readyState===WebSocket.CLOSED)throw new Error('Connection failed');
  if(this.ws.readyState!==WebSocket.OPEN)await new Promise((resolve,reject)=>{this.ws.once('open',resolve);this.ws.once('error',reject)});
  this.send({type:'JOIN',player:{id:this.id,name:this.name,x,y:480,direction:'down',movementState:'idle',race:'Human',profession:'Warrior',appearance,timestamp:Date.now()}});
  return this.wait(m=>m.type==='PLAYER_SNAPSHOT');
 }
 close(){this.ws.terminate()}
}
async function main(){
 const a=new Peer('確認A'),b=new Peer('確認B');
 try{
  assert.equal((await a.join(1400)).players.length,0);
  assert.equal((await b.join(1410)).players[0].id,a.id);
  await a.wait(m=>m.type==='PLAYER_JOIN'&&m.player.id===b.id);
  await new Promise(resolve=>setTimeout(resolve,150));
  b.send({type:'PLAYER_MOVE',move:{x:1420,y:480,direction:'right',movementState:'walk'}});
  await a.wait(m=>m.type==='PLAYER_MOVE'&&m.id===b.id&&m.move.x===1420);
  b.send({type:'CHAT',message:'接続確認'});
  await a.wait(m=>m.type==='CHAT'&&m.playerId===b.id&&m.message==='接続確認');
  b.close();await a.wait(m=>m.type==='PLAYER_LEAVE'&&m.id===b.id);
  console.log('PASS: deployed endpoint, isolated room, join, movement, chat and leave');
 }finally{a.close();b.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
