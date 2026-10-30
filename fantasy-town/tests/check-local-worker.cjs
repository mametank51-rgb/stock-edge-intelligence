// A bounded, read-only handshake check against the local development Worker.
// It deliberately does not connect to public or user-configured endpoints.
const {WebSocket}=require('ws');
const id=`probe-${require('crypto').randomBytes(8).toString('hex')}`;
const socket=new WebSocket('ws://127.0.0.1:8787/?room=town_01',{handshakeTimeout:4000});
let done=false;
function finish(ok,message){if(done)return;done=true;clearTimeout(deadline);if(socket.readyState===WebSocket.OPEN)socket.close();else socket.terminate();console.log(message);process.exitCode=ok?0:1}
const deadline=setTimeout(()=>finish(false,'Worker が入室応答を返しませんでした。npm run worker:dev の起動状態を確認してください。'),6000);
socket.on('open',()=>socket.send(JSON.stringify({type:'JOIN',player:{id,name:'接続確認',x:1415,y:480,direction:'down',movementState:'idle',race:'Human',profession:'Warrior',appearance:{bodyType:'standard',skinVariant:13214078,hairStyle:'short',hairColor:4937773,clothesVariant:0,primaryColor:5860192,secondaryColor:9993303},timestamp:Date.now()}})));
socket.on('message',data=>{let m;try{m=JSON.parse(data.toString())}catch{return}if(m.type==='PLAYER_SNAPSHOT'&&Array.isArray(m.players))finish(true,'ローカル Worker の WebSocket 接続と入室応答を確認しました。');else if(m.type==='ERROR')finish(false,'Worker が入室を拒否しました。')});
socket.on('error',e=>finish(false,`ローカル Worker に接続できませんでした (${e.code??'connection error'})。npm run worker:dev の起動状態を確認してください。`));
socket.on('close',()=>{if(!done)finish(false,'入室応答の前に接続が閉じました。')});
