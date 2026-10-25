/* Original-blog metadata cache. Shared request gate is supplied by the app. */
(function(root){
'use strict';
const KEY='stock-edge-original-blogs-v1',PREF='stock-edge-blog-muted-v1';
let seed={sources:[],items:[]},version=0,inflight=null,lastAttempt=0,lastError='',cachedText='',cachedSnapshot=null;
const store=()=>root.HTML_CONTEXT?.storage||root.localStorage;
function read(key,fallback){try{return JSON.parse(store().getItem(key))||fallback;}catch{return fallback;}}
function safeUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
function clean(value){return String(value||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();}
function valid(payload){
 if(payload?.schema!=='stock-edge-community-v1'||!Array.isArray(payload.sources)||!Array.isArray(payload.items)||payload.sources.length>60||payload.items.length>1000)throw Error('ブログ配信データの形式が違います');
 const sources=payload.sources.filter(s=>/^[a-z0-9-]+$/.test(s.id)&&safeUrl(s.home)&&safeUrl(s.feed)).map(s=>({...s,name:clean(s.name),style:clean(s.style)})),known=new Map(sources.map(s=>[s.id,s]));
 const items=payload.items.flatMap(p=>{const s=known.get(p.sourceId),url=safeUrl(p.url);if(!s||!url||!p.communityFeed)return [];const code=/^[0-9A-Z]{4}$/.test(p.code||'')?p.code:'';return [{...p,code,scope:code?'stock':'market',company:code?clean(p.company):'市場全体・225以外／銘柄未特定',sourceId:s.id,sourceGroup:s.owner,publisher:s.name,author:s.name,feedAuthor:s.name,headline:clean(p.headline).slice(0,300),summary:clean(p.summary).slice(0,160),url,sourceStyle:s.style,sourceCategory:'voice',opinionChannel:'community',browserAuto:true,extractionVersion:2,communityFeed:true,stance:root.EdgeModel.classify(clean(p.headline)),reasons:[clean(p.topic),s.style].filter(Boolean),targetPrice:null}];});
 return {schema:payload.schema,generatedAt:payload.generatedAt,sources,items};
}
function snapshot(){try{const raw=store().getItem(KEY)||'';if(raw===cachedText&&cachedSnapshot)return cachedSnapshot;cachedText=raw;const saved=JSON.parse(raw||'null');cachedSnapshot=saved?.generatedAt>seed.generatedAt?valid(saved):seed;return cachedSnapshot;}catch{return seed;}}
function muted(){const value=read(PREF,[]);return new Set(Array.isArray(value)?value:[]);}
function items(){const off=muted();return snapshot().items.filter(p=>!off.has(p.sourceId));}
function toggle(id,enabled){const off=muted();enabled?off.delete(id):off.add(id);store().setItem(PREF,JSON.stringify([...off]));version++;}
async function sync(force=false){
 if(inflight)return inflight;
 if(root.document?.hidden||root.navigator?.onLine===false||root.location?.protocol==='file:')return snapshot();
 if(!force&&Date.now()-lastAttempt<30*60000)return snapshot();
 lastAttempt=Date.now();
 inflight=(async()=>{try{const response=await root.stockEdgeRequest('community-data.json?v='+Math.floor(Date.now()/600000),{cache:'no-cache',credentials:'omit'});if(!response.ok)throw Error('HTTP '+response.status);const body=await response.text();if(body.length>2000000)throw Error('配信サイズ超過');const next=valid(JSON.parse(body));if(next.generatedAt>=snapshot().generatedAt){store().setItem(KEY,JSON.stringify(next));version++;}lastError='';return snapshot();}catch(e){lastError=e.message||'取得失敗';return snapshot();}finally{inflight=null;}})();return inflight;
}
const api={setSeed:value=>{seed=valid(value);cachedSnapshot=null;version++;},snapshot,items,muted,toggle,sync,get version(){return version;},get busy(){return !!inflight;},get error(){return lastError;},valid};
if(typeof module!=='undefined')module.exports=api;else root.StockEdgeCommunity=api;
})(typeof globalThis!=='undefined'?globalThis:this);
