const ID_KEY='ashenvale.playerId',NAME_KEY='ashenvale.playerName';
let sessionIdentity:{id:string;name:string}|null=null;
function storageFailed(error:unknown){
 console.warn('Player identity could not be saved to this device.',error);
 if(typeof window!=='undefined')queueMicrotask(()=>window.dispatchEvent(new CustomEvent('town-save-error',{detail:'名前・IDを端末に保存できません。この画面内では同じIDを使って遊べます。'})));
}
function validName(name:string|null):name is string{return !!name&&name.trim().length>0&&name.length<=24&&!/[\u0000-\u001f\u007f]/.test(name)}
export function identity(){
 if(sessionIdentity)return {...sessionIdentity};
 let id:string|null=null,name:string|null=null;
 try{id=localStorage.getItem(ID_KEY);name=localStorage.getItem(NAME_KEY)}catch(error){storageFailed(error)}
 if(!id||!/^[-\w]{8,64}$/.test(id)){
  const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);id=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  try{localStorage.setItem(ID_KEY,id)}catch(error){storageFailed(error)}
 }
 if(!validName(name))name='Adventurer'+id.replace(/\D/g,'').slice(0,4).padEnd(4,'0');
 sessionIdentity={id,name:name.trim()};return {...sessionIdentity};
}
export function saveName(name:string){
 if(!validName(name))return;
 const current=identity();sessionIdentity={...current,name:name.trim()};
 try{localStorage.setItem(NAME_KEY,name.trim())}catch(error){storageFailed(error)}
}
export function spawnOffset(id:string){let hash=0;for(const c of id)hash=(hash*31+c.charCodeAt(0))>>>0;return {x:(hash%5-2)*12,y:(Math.floor(hash/5)%5-2)*12}}
