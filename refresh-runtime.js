/* Shared network budget and pure refresh policy. No external dependencies. */
(function(root){
'use strict';
function policy({mode='auto',type='',effectiveType='',saveData=false,online=true,hidden=false}={}){
 const stopped=hidden||!online||mode==='paused';
 const lite=saveData||mode==='lite'||type==='cellular'||['slow-2g','2g','3g'].includes(effectiveType);
 const fast=!lite&&(mode==='continuous'||['wifi','ethernet'].includes(type));
 return {active:!stopped,fast,lite,limit:lite?2:fast?6:4,stockWorkers:lite?1:fast?4:2,stockBatch:lite?6:fast?24:12,voiceBatch:lite?3:fast?16:8,voiceWorkers:lite?1:fast?3:2,gap:lite?15000:fast?1500:3000,voiceTtl:lite?3600000:fast?600000:1800000,stockTtl:lite?3600000:fast?300000:900000,label:stopped?(hidden?'画面非表示・休止':!online?'オフライン':'自動更新停止'):lite?'省通信':fast?'常時更新': '自動・標準（回線種別不明）'};
}
function retryDelay(failures){return Math.min(600000,15000*2**Math.min(6,Math.max(0,failures-1)));}
function createGate({fetch:fetcher,getPolicy,now=Date.now}){
 let active=0,peak=0;const queue=[],cooldowns=new Map(),inflight=new Set();
 function drain(){
  const p=getPolicy();
  if(!p.active){while(queue.length)queue.shift().reject(Object.assign(Error('更新を休止しました'),{name:'AbortError'}));return;}
  while(queue.length&&active<p.limit){
   const job=queue.shift();if(job.options.signal?.aborted){job.reject(Object.assign(Error('Aborted'),{name:'AbortError'}));continue;}
   const host=new URL(job.url,'http://localhost').host;
   if((cooldowns.get(host)||0)>now()){job.reject(Error('取得先の再試行待ち'));continue;}
   active++;peak=Math.max(peak,active);const ctrl=new AbortController();inflight.add(ctrl);
   const {edgePriority,edgeTimeoutMs,...fetchOptions}=job.options,timer=Number.isFinite(edgeTimeoutMs)&&edgeTimeoutMs>0?setTimeout(()=>ctrl.abort(),edgeTimeoutMs):null;
   const abort=()=>ctrl.abort();job.options.signal?.addEventListener('abort',abort,{once:true});
   Promise.resolve().then(()=>fetcher(job.url,{...fetchOptions,signal:ctrl.signal})).then(async response=>{
    if(response.status===429||response.status===503){const h=response.headers.get('retry-after'),seconds=Number(h);const ms=h?(Number.isFinite(seconds)?seconds*1000:Date.parse(h)-now()):60000;cooldowns.set(host,now()+Math.max(15000,Math.min(600000,ms||60000)));}
    // Hold the slot until the body arrives, rather than releasing at response headers.
    const body=await response.arrayBuffer();return new Response([204,205,304].includes(response.status)?null:body,{status:response.status,statusText:response.statusText,headers:response.headers});
   }).then(job.resolve,job.reject).finally(()=>{if(timer)clearTimeout(timer);job.options.signal?.removeEventListener('abort',abort);inflight.delete(ctrl);active--;drain();});
  }
 }
 function request(url,options={}){return new Promise((resolve,reject)=>{const job={url,options,resolve,reject},next=options.edgePriority?queue.findIndex(j=>!j.options.edgePriority):-1;if(next>=0)queue.splice(next,0,job);else queue.push(job);drain();});}
 function pause(){while(queue.length)queue.shift().reject(Object.assign(Error('更新を休止しました'),{name:'AbortError'}));for(const ctrl of inflight)ctrl.abort();}
 return {request,pause,resume:drain,stats:()=>({active,queued:queue.length,peak})};
}
async function pool(items,limit,worker,{shouldContinue=()=>true,onStep=()=>{}}={}){
 let cursor=0,done=0;const out=[];
 async function run(){while(shouldContinue()){const i=cursor++;if(i>=items.length)return;try{out[i]=await worker(items[i],i);}catch(error){out[i]={ok:false,error};}onStep(++done,items.length,out[i]);await new Promise(r=>setTimeout(r,0));}}
 await Promise.all(Array.from({length:Math.min(limit,items.length)},run));return out;
}
const api={policy,retryDelay,createGate,pool};
if(typeof module!=='undefined')module.exports=api;else root.EdgeRefresh=api;
})(typeof globalThis!=='undefined'?globalThis:this);
