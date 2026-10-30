import type {PlayerState} from '../state/GameState';import {ROOM_ID,MAX_CHAT,parseMessage,isRecord} from './protocol';import type {ClientMessage,ServerMessage,NetworkPlayerState} from './protocol';
import type {ItemAction} from '../items/model';
import type {MarketAction} from '../market/MarketEngine';
export type ConnectionState='CONNECTING'|'CONNECTED'|'DISCONNECTED'|'RECONNECTING'|'ERROR';
const SEND_INTERVAL=100,PING_INTERVAL=10000,PONG_TIMEOUT=30000;
export class NetworkManager {
 state:ConnectionState='DISCONNECTED';ping:number|null=null;sent=0;received=0;readonly roomId=ROOM_ID;private socket:WebSocket|null=null;private retry=0;private retryTimer:number|null=null;private pingTimer:number|null=null;private joinTimer:number|null=null;private lastPong=0;private lastMove='';private lastSent=0;private disposed=false;private lastChat=0;
 constructor(private url:string,private player:PlayerState,private onMessage:(m:ServerMessage)=>void,private onState:(s:ConnectionState)=>void){}
 connect(){if(this.disposed||this.socket||!this.url)return;let url:URL;try{url=new URL(this.url);if(url.protocol!=='ws:'&&url.protocol!=='wss:')throw Error('invalid protocol');url.searchParams.set('room',this.roomId)}catch{this.setState('ERROR');return}this.setState(this.retry?'RECONNECTING':'CONNECTING');let socket:WebSocket;try{socket=new WebSocket(url)}catch{this.setState('ERROR');this.schedule();return}this.socket=socket;
  socket.onopen=()=>{if(this.socket!==socket)return;this.lastPong=Date.now();this.lastMove='';this.send({type:'JOIN',player:this.snapshot()});this.joinTimer=window.setTimeout(()=>{if(this.socket===socket&&this.state!=='CONNECTED')socket.close()},10000);this.pingTimer=window.setInterval(()=>{if(Date.now()-this.lastPong>PONG_TIMEOUT){socket.close();return}this.send({type:'PING',nonce:Date.now()})},PING_INTERVAL)};
  socket.onmessage=e=>{if(typeof e.data!=='string')return;const value=parseMessage(e.data);if(!isRecord(value)||typeof value.type!=='string')return;this.received++;const m=value as unknown as ServerMessage;if(m.type==='PONG'&&typeof m.nonce==='number'){this.ping=Math.max(0,Date.now()-m.nonce);this.lastPong=Date.now();this.retry=0;return}if(m.type==='PLAYER_SNAPSHOT'&&Array.isArray(m.players)&&this.state!=='CONNECTED'){this.clearJoin();this.setState('CONNECTED')}this.onMessage(m)};
  socket.onerror=()=>{if(this.socket===socket)this.setState('ERROR')};socket.onclose=event=>{if(this.socket!==socket)return;this.socket=null;this.clearJoin();this.clearPing();this.onMessage({type:'PLAYER_SNAPSHOT',players:[]});if(!this.disposed){this.setState('DISCONNECTED');if(event.code!==4001)this.schedule()}};
 }
 private schedule(){if(this.disposed||this.retryTimer!==null)return;const delay=Math.min(30000,1000*2**Math.min(this.retry++,5));this.setState('RECONNECTING');this.retryTimer=window.setTimeout(()=>{this.retryTimer=null;this.connect()},delay)}
 private setState(s:ConnectionState){this.state=s;this.onState(s)}
 private clearPing(){if(this.pingTimer!==null)window.clearInterval(this.pingTimer);this.pingTimer=null;this.ping=null}
 private clearJoin(){if(this.joinTimer!==null)window.clearTimeout(this.joinTimer);this.joinTimer=null}
 private send(m:ClientMessage){if(this.socket?.readyState!==WebSocket.OPEN)return false;this.socket.send(JSON.stringify(m));this.sent++;return true}
 snapshot():NetworkPlayerState{const p=this.player;return {id:p.id,name:p.name,x:p.x,y:p.y,direction:p.direction,movementState:p.movementState,race:p.race,profession:p.profession,appearance:p.appearance,timestamp:Date.now()}}
 update(now:number){if(this.state!=='CONNECTED'||now-this.lastSent<SEND_INTERVAL)return;this.lastSent=now;const p=this.player;const move={x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10,direction:p.direction,movementState:p.movementState};const serialized=JSON.stringify(move);if(serialized!==this.lastMove&&this.send({type:'PLAYER_MOVE',move}))this.lastMove=serialized}
 profile(){const p=this.player;this.send({type:'PROFILE',name:p.name,race:p.race,profession:p.profession,appearance:p.appearance})}
 chat(text:string){const message=text.trim();if(!message||message.length>MAX_CHAT||Date.now()-this.lastChat<1000)return false;if(!this.send({type:'CHAT',message}))return false;this.lastChat=Date.now();return true}
 attack(targetId:string){return this.send({type:'ATTACK_REQUEST',targetId})}
 itemAction(itemAction:ItemAction){return this.send({type:'ITEM_ACTION',itemAction})}
 gather(nodeId:string){return this.send({type:'GATHER',nodeId})}
 craft(recipeId:string){return this.send({type:'CRAFT',recipeId})}
 market(marketAction:MarketAction){return this.send({type:'MARKET_ACTION',marketAction})}
 destroy(){this.disposed=true;if(this.retryTimer!==null)window.clearTimeout(this.retryTimer);this.retryTimer=null;this.clearJoin();this.clearPing();const socket=this.socket;this.socket=null;socket?.close();this.setState('DISCONNECTED')}
}
