/* Selected-symbol data only. No daily workspace writes or all-market scans. */
(function(root){'use strict';
const P=typeof module!=='undefined'&&module.exports?require('./performance-core'):root.EdgePerformance;
const C=typeof module!=='undefined'&&module.exports?require('./market-clock'):root.MarketClock;
const ranges={'5m':'5d','15m':'5d','60m':'1mo','1d':'6mo'};
const symbolOf=value=>{const s=String(value).toUpperCase().replace(/\.T$/,'');const code=P.codeOf(s);if(!code)throw Error('東証の4桁銘柄コードを指定してください');return code+'.T';};
function error(message,kind='network',status){return Object.assign(Error(message),{kind,status});}
function normalize(payload,{symbol,interval,range=ranges[interval],source='外部API',sourceUrl='',now=Date.now()}={}){
 symbol=symbolOf(symbol);if(!ranges[interval])throw error('未対応の時間足','format');let rows;
 if(payload?.chart){if(payload.chart.error)throw error('no data: '+(payload.chart.error.description||'取得元エラー'),'empty',404);const r=payload.chart.result?.[0],m=r?.meta,q=r?.indicators?.quote?.[0];if(!r||!q)throw error('no data: OHLCVがありません','empty',404);if(m.symbol!==symbol||m.currency!=='JPY'||(m.dataGranularity!==interval&&!(interval==='60m'&&m.dataGranularity==='1h')))throw error('銘柄・通貨・時間足が一致しません','format');rows=(r.timestamp||[]).map((t,i)=>({timestamp:t,open:q.open[i],high:q.high[i],low:q.low[i],close:q.close[i],volume:q.volume[i]}));
 }else{if(payload?.symbol!==symbol||payload?.interval!==interval||!Array.isArray(payload.rows))throw error('銘柄・時間足を含む正規化JSONが必要です','format');rows=payload.rows;}
 const unique=new Map(),closingQuotes={};let dropped=0,closingQuote=null;
 for(const r of rows){const timestamp=typeof r.timestamp==='number'?r.timestamp:Date.parse(r.time)/1000,t=timestamp*1000;const values=[r.open,r.high,r.low,r.close,r.volume];if(!Number.isFinite(t)||t>now+60000||!values.every(v=>typeof v==='number'&&Number.isFinite(v))||r.low<=0||r.high<Math.max(r.open,r.close,r.low)||r.low>Math.min(r.open,r.close)||r.volume<0){dropped++;continue;}if(interval!=='1d'){const min=C.minute(t);if(min<540||min>930||min>=690&&min<750&&!(interval==='60m'&&min===720)){dropped++;continue;}}
 if(interval!=='1d'&&C.minute(t)===930&&r.volume===0&&r.open===r.close&&r.high===r.low){const day=C.date(t),prior=closingQuotes[day],quote={time:new Date(t).toISOString(),timestamp,price:r.close};if(prior&&prior.price!==quote.price)throw error('同一時刻の終値が矛盾しています','format');closingQuotes[day]=quote;if(!closingQuote||timestamp>closingQuote.timestamp)closingQuote=quote;dropped++;continue;}
 const next={time:new Date(t).toISOString(),timestamp,open:r.open,high:r.high,low:r.low,close:r.close,volume:r.volume},old=unique.get(timestamp);if(old&&JSON.stringify(old)!==JSON.stringify(next))throw error('同一時刻のOHLCVが矛盾しています','format');unique.set(timestamp,next);}
 const clean=[...unique.values()].sort((a,b)=>a.timestamp-b.timestamp).slice(-1600);if(!clean.length)throw error('no data: 有効なローソク足がありません','empty',404);
 return {schema:'stock-edge-intraday-v1',symbol,interval,range,source,sourceUrl,fetchedAt:now,rows:clean,dropped,closingQuotes,closingQuote:closingQuote&&closingQuote.timestamp>=clean.at(-1).timestamp?closingQuote:null};
}
class IntradayProvider{
 constructor({fetch:fetcher,requests=new P.Requests(),now=()=>Date.now(),providers=[]}={}){this.fetch=fetcher||((...a)=>root.fetch(...a));this.requests=requests;this.now=now;this.providers=providers;this.cache=new P.LRU(8);this.inflight=new Map();}
 key(symbol,interval,range=ranges[interval]){return 'intraday:'+symbolOf(symbol)+':'+interval+':'+range;}
 ttl(){return C.status(this.now()).open?180000:2700000;}
 peek(symbol,interval,range){return this.cache.get(this.key(symbol,interval,range));}
 async load(symbol,interval='5m',range=ranges[interval],{signal,force=false}={}){
  symbol=symbolOf(symbol);if(!ranges[interval])throw error('未対応の時間足','format');const key=this.key(symbol,interval,range),old=this.cache.get(key);if(!force&&old&&this.now()-old.fetchedAt<this.ttl())return {...old,cacheHit:true};
  if(this.inflight.has(key)){const pending=this.inflight.get(key);if(!pending.signal?.aborted)return pending.promise;try{await pending.promise;}catch{}if(signal?.aborted)throw new DOMException('中止','AbortError');}
  const began=this.now(),task=()=>this.download(symbol,interval,range,signal).then(record=>{record.elapsed=this.now()-began;this.cache.set(key,record);return {...record,cacheHit:false};});const promise=this.requests.run(key,task);this.inflight.set(key,{promise,signal});try{return await promise;}finally{if(this.inflight.get(key)?.promise===promise)this.inflight.delete(key);}
 }
 async download(symbol,interval,range,signal){
  const yahoo='https://query1.finance.yahoo.com/v8/finance/chart/'+symbol+'?interval='+interval+'&range='+range+'&includePrePost=false';
  // A configured endpoint receives encoded symbol/interval/range; it must return Yahoo JSON or the normalized schema.
  const routes=[...this.providers.map(p=>({name:p.name||'設定済みProvider',url:p.url.replace('{symbol}',encodeURIComponent(symbol)).replace('{interval}',interval).replace('{range}',range)})),{name:'Yahoo Finance',url:yahoo},{name:'Yahoo Finance / CORS relay',url:'https://proxy.cors.dev/'+yahoo}];let last;
  for(const route of routes){if(signal?.aborted)throw new DOMException('中止','AbortError');const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});let timedOut=false;const timer=setTimeout(()=>{timedOut=true;controller.abort();},16000);try{
   const response=await this.fetch(route.url,{signal:controller.signal,credentials:'omit',cache:'no-store',edgePriority:true,edgeTimeoutMs:15000});if(!response.ok)throw P.httpError(response);const text=await response.text();if(text.length>2500000)throw error('応答サイズが大きすぎます','format');return normalize(JSON.parse(text),{symbol,interval,range,source:route.name,sourceUrl:route.url,now:this.now()});
  }catch(e){if(signal?.aborted)throw new DOMException('中止','AbortError');if(timedOut||e.name==='AbortError')e=error('データ取得がタイムアウトしました');last=e;if([429,503,404,422].includes(e.status)||e.kind==='empty')throw e;}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}}
  throw last||error('データ取得失敗');
 }
}
let instance;function configure(options){instance=new IntradayProvider(options);return instance;}
function fetchIntradayData(symbol,interval,range,options){if(!instance)configure({fetch:(...args)=>(root.stockEdgeRequest||root.fetch)(...args),requests:root.stockEdgeRequests,providers:root.STOCK_EDGE_INTRADAY_PROVIDERS||[]});return instance.load(symbol,interval,range,options);}
const api={IntradayProvider,normalize,symbolOf,ranges,configure,fetchIntradayData,get provider(){return instance;}};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.IntradayData=api;
})(typeof globalThis!=='undefined'?globalThis:this);
