// Real local workerd test. Uses an isolated room and never connects to a public server.
const assert=require('node:assert/strict');
const {WebSocket}=require('ws');
const {randomBytes}=require('node:crypto');
const nonce=randomBytes(8).toString('hex');
const url=`ws://127.0.0.1:8787/?room=death_${nonce}`;
const appearance={bodyType:'standard',skinVariant:13214078,hairStyle:'short',hairColor:4937773,clothesVariant:0,primaryColor:5860192,secondaryColor:9993303};
class Peer{
 constructor(id,x,y){this.id=id;this.position={x,y};this.messages=[];this.waiters=[];this.socket=new WebSocket(url,{handshakeTimeout:4000});this.socket.on('message',data=>{let message;try{message=JSON.parse(data.toString())}catch{return}const i=this.waiters.findIndex(w=>w.predicate(message));if(i<0)this.messages.push(message);else{const [w]=this.waiters.splice(i,1);clearTimeout(w.timer);w.resolve(message)}});this.socket.on('error',()=>{})}
 async join(){if(this.socket.readyState===WebSocket.CONNECTING)await new Promise((resolve,reject)=>{this.socket.once('open',resolve);this.socket.once('error',reject)});if(this.socket.readyState!==WebSocket.OPEN)throw new Error('接続が閉じられました');const {x,y}=this.position;this.socket.send(JSON.stringify({type:'JOIN',player:{id:this.id,name:'検証者',x,y,direction:'down',movementState:'idle',race:'Human',profession:'Warrior',appearance,timestamp:Date.now()}}));await this.wait(m=>m.type==='PLAYER_SNAPSHOT')}
 wait(predicate,timeout=5000){const index=this.messages.findIndex(predicate);if(index>=0)return Promise.resolve(this.messages.splice(index,1)[0]);return new Promise((resolve,reject)=>{const waiter={predicate,resolve,timer:null};waiter.timer=setTimeout(()=>{const i=this.waiters.indexOf(waiter);if(i>=0)this.waiters.splice(i,1);reject(new Error(`期待した応答が届きませんでした。直近メッセージ: ${JSON.stringify(this.messages.slice(-4))}`))},timeout);this.waiters.push(waiter)})}
 destroy(){this.socket.terminate();for(const waiter of this.waiters)clearTimeout(waiter.timer);this.waiters=[]}
}
(async()=>{const id=`dead-${nonce}`,observer=new Peer(`watch-${nonce}`,1415,480);let player=new Peer(id,180,495);try{
 await observer.join();await player.join();
 const death=await player.wait(m=>m.type==='COMBAT_SNAPSHOT'&&m.fighters.some(f=>f.id===id&&f.deadUntil>0),25000);const original=death.fighters.find(f=>f.id===id);assert.equal(original.hp,0);console.log('PASS: モンスターの攻撃でプレイヤーが死亡');
 player.socket.close();await observer.wait(m=>m.type==='PLAYER_LEAVE'&&m.id===id);player.destroy();player=new Peer(id,180,495);await player.join();
 const restored=await player.wait(m=>m.type==='COMBAT_SNAPSHOT'&&m.fighters.some(f=>f.id===id),4000);const fighter=restored.fighters.find(f=>f.id===id);assert.equal(fighter.hp,0);assert.equal(fighter.deadUntil,original.deadUntil);console.log('PASS: 再接続後も死亡状態を維持');
 const respawn=await observer.wait(m=>m.type==='PLAYER_MOVE'&&m.id===id&&m.move.x===1415&&m.move.y===480,8000);assert.ok(respawn);const alive=await player.wait(m=>m.type==='COMBAT_SNAPSHOT'&&m.fighters.some(f=>f.id===id&&!f.deadUntil&&f.hp===100),4000);assert.ok(alive);console.log('PASS: 復活地点への移動と HP 回復を両接続で確認');
 }finally{player.destroy();observer.destroy()}})().catch(error=>{console.error('FAIL:',error.message);process.exitCode=1});
