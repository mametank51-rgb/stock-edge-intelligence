const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const S=require('./chart-snapshot'),R=require('./refresh-runtime'),Names=require('./stock-names'),I=require('./market-integrity');
const html=fs.readFileSync('index.html','utf8');
const snapshot=JSON.parse(fs.readFileSync('chart-data/7453.json','utf8')),parsed=S.parse(snapshot,{code:'7453'});
assert.equal(parsed.meta.symbol,'7453.T');assert.ok(parsed.rows.length>=20);assert.equal(parsed.fetchedAt,snapshot.fetchedAt);assert.equal(parsed.integrity.dataAsOf,snapshot.asOf);
for(const code of Object.keys(Names.catalog))assert.ok(S.parse(JSON.parse(fs.readFileSync('chart-data/'+code+'.json','utf8')),{code}).rows.length>=20);
assert.throws(()=>S.parse(snapshot,{code:'7203'}));assert.throws(()=>S.parse({...snapshot,meta:{symbol:'7453.T',currency:'USD'}},{code:'7453'}));assert.throws(()=>S.parse({...snapshot,asOf:'2000-01-01'},{code:'7453'}));assert.throws(()=>S.parse({...snapshot,sourceUrl:'https://example.com/7453.T'},{code:'7453'}));
assert.equal(S.url('7453',{protocol:'https:',href:'https://example.com/app/?v=1#/stock/74530'}),'https://example.com/app/chart-data/7453.json');
const longSnapshot=JSON.parse(fs.readFileSync('chart-long-data/7453.json','utf8'));
assert.ok(S.parse(longSnapshot,{code:'7453'}).rows.length>1000);
assert.throws(()=>S.parse({...longSnapshot,sourceUrl:longSnapshot.sourceUrl.replace('range=10y','range=2y')},{code:'7453'}));
assert.equal(S.url('7453',{protocol:'https:',href:'https://example.com/app/'},{longHistory:true}),'https://example.com/app/chart-long-data/7453.json');
function source(name){const start=html.indexOf('__modules.'+name+' = (() => {');return html.slice(start,html.indexOf('\n})();',start)+6);}
(async()=>{
 const calls=[],memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
 const ctx={__modules:{},HTML_CONTEXT:{storage},StockNames:Names,ChartSnapshot:S,MarketIntegrity:I,location:{href:'https://example.com/app/',protocol:'https:'},URL,Date,Intl,JSON,Map,Set,AbortController,setTimeout,clearTimeout,window:{stockEdgeRequest:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>snapshot};}}};vm.createContext(ctx);vm.runInContext(source('dataEvidence'),ctx);ctx.workspace=ctx.__modules.dataEvidence.createWorkspace(async()=>({}),storage);vm.runInContext(source('builtinMarket'),ctx);
 const record=await ctx.__modules.builtinMarket.fetchAndSave('74530');assert.equal(calls.length,1);assert.equal(calls[0].url,'https://example.com/app/chart-data/7453.json');assert.equal(calls[0].options.edgePriority,true);assert.equal(record.stock.company,'良品計画');assert.equal(record.provenance.acquired_at,snapshot.fetchedAt);
 const key='stock-edge-html-imports-v1',full={version:1,mode:'imported',watch:[],records:{}};for(let i=1000;i<1020;i++)full.records[i+'0']={...record,stock:{...record.stock,ticker:i+'0'}};storage.setItem(key,JSON.stringify(full));const before=storage.getItem(key);
 await ctx.__modules.builtinMarket.fetchAndSave('74530');assert.equal(storage.getItem(key),before);const temporary=await ctx.workspace.request('/stocks/74530/prices?basis=adjusted&interval=1wk');assert.ok(temporary.candles.length);assert.ok(temporary.warnings.some(x=>x.includes('一時表示')));
 const denied={getItem:()=>null,setItem:()=>{throw Error('quota');}};ctx.workspace=ctx.__modules.dataEvidence.createWorkspace(async()=>({}),denied);await ctx.__modules.builtinMarket.fetchAndSave('74530');assert.ok((await ctx.workspace.request('/stocks/74530/prices?basis=adjusted&interval=1d')).candles.length);
 let release;const order=[],gate=R.createGate({getPolicy:()=>({active:true,limit:1}),fetch:async(url,options)=>{order.push(url);assert.equal('edgePriority' in options,false);if(url.endsWith('first'))await new Promise(r=>release=r);return new Response('ok');}});
 const first=gate.request('https://example.com/first');await new Promise(r=>setTimeout(r,0));const background=gate.request('https://example.com/background'),manual=gate.request('https://example.com/manual',{edgePriority:true,edgeTimeoutMs:10});await new Promise(r=>setTimeout(r,20));release();await Promise.all([first,background,manual]);assert.deepEqual(order,['https://example.com/first','https://example.com/manual','https://example.com/background']);assert.equal(gate.stats().peak,1);
 console.log('PASS: 225 validated snapshots, same-origin mobile path, real acquisition dates, identity rejection, full/quota storage temporary charts, manual priority and timeout after dispatch.');
})().catch(e=>{console.error(e);process.exitCode=1;});
