const ID_KEY='ashenvale.playerId',NAME_KEY='ashenvale.playerName';
export function identity(){let id:string|null=null,name:string|null=null;try{id=localStorage.getItem(ID_KEY);name=localStorage.getItem(NAME_KEY)}catch{}if(!id||!/^[-\w]{8,64}$/.test(id)){const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);id=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');try{localStorage.setItem(ID_KEY,id)}catch{}}if(!name)name=`Adventurer${id.replace(/\D/g,'').slice(0,4).padEnd(4,'0')}`;return {id,name:name.slice(0,24)}}
export function saveName(name:string){try{localStorage.setItem(NAME_KEY,name)}catch{}}
export function spawnOffset(id:string){let hash=0;for(const c of id)hash=(hash*31+c.charCodeAt(0))>>>0;return {x:(hash%5-2)*12,y:(Math.floor(hash/5)%5-2)*12}}
