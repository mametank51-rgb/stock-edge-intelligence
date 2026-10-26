const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Names=require('./stock-names'),Research=require('./voice-research'),Voice=require('./voice-view'),Integrity=require('./market-integrity');
const html=fs.readFileSync('index.html','utf8'),universe=JSON.parse(html.match(/const UNIVERSE=(\[.*?\]);/)[1]);
assert.equal(Object.keys(Names.catalog).length,225);
for(const row of universe){assert.equal(row.name,Names.display(row.code));assert.ok(row.englishName);}
assert.equal(Names.display('7203'),'トヨタ自動車');assert.equal(Names.display('74530'),'良品計画');assert.equal(Names.display('6532.T'),'ベイカレント');assert.equal(Names.display('NOPE','元の名前'),'元の名前');
const cached={code:'3099',name:'ISETAN MITSUKOSHI HOLDINGS LTD',price:1234,score:70};
const localized=Names.localize(cached);assert.equal(localized.name,'三越伊勢丹ホールディングス');assert.equal(localized.price,1234);assert.equal(cached.name,'ISETAN MITSUKOSHI HOLDINGS LTD');
const now=Date.parse('2026-10-26T03:00:00Z'),article={code:'3099',company:cached.name,headline:'企業分析',publisher:'媒体',url:'https://example.com/article',publishedAt:'2026-10-25T00:00:00Z',sourceCategory:'voice',communityFeed:true,research:{version:6,subjects:[{code:'3099',name:cached.name}],claims:[]}};
const list=Voice.prepare([article],{now});assert.equal(list[0].company,'三越伊勢丹ホールディングス');assert.equal(Voice.select(list,{query:'三越伊勢丹'}).length,1);assert.equal(Voice.select(list,{query:'ISETAN'}).length,1);
assert.equal(Research.build([article],{now})[0].name,'三越伊勢丹ホールディングス');
assert.equal(Research.build([],{now,journal:{'3099':{name:cached.name}}})[0].name,'三越伊勢丹ホールディングス');
assert.ok(html.replace(/\r\n/g,'\n').includes(fs.readFileSync('stock-names.js','utf8').replace(/\r\n/g,'\n')));
function moduleSource(name){const start=html.indexOf('__modules.'+name+' = (() => {');assert.ok(start>=0);const end=html.indexOf('\n})();',start);return html.slice(start,end+6);}
const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
const dates=Array.from({length:60},(_,i)=>Date.UTC(2026,7,1+i)/1000),close=dates.map((_,i)=>200+i),body={chart:{result:[{meta:{symbol:'7203.T',currency:'JPY',shortName:'TOYOTA MOTOR CORP'},timestamp:dates,indicators:{quote:[{open:close,high:close.map(v=>v+3),low:close.map(v=>v-3),close,volume:close.map(()=>1000)}],adjclose:[{adjclose:close.map(v=>v/2)}]}}]}};
const ctx={__modules:{},HTML_CONTEXT:{storage},StockNames:Names,MarketIntegrity:Integrity,URL,Date,Intl,JSON,Map,Set,AbortController,setTimeout,clearTimeout,window:{stockEdgeRequest:async()=>({ok:true,json:async()=>body})}};vm.createContext(ctx);vm.runInContext(moduleSource('dataEvidence'),ctx);ctx.workspace=ctx.__modules.dataEvidence.createWorkspace(async()=>({}),storage);vm.runInContext(moduleSource('builtinMarket'),ctx);
(async()=>{
 const record=await ctx.__modules.builtinMarket.fetchAndSave('72030');assert.equal(record.stock.company,'トヨタ自動車');assert.equal(record.stock.provider_id,'yahoo-browser');assert.equal(record.history.adjusted[0].close,200,'candles use OHLC rather than dividend-adjusted close');assert.equal(record.history.adjusted.length,60);
 const daily=await ctx.workspace.request('/stocks/72030/prices?interval=1d&basis=adjusted');assert.equal(daily.candles.length,60);const weekly=await ctx.workspace.request('/stocks/72030/prices?interval=1wk&basis=adjusted');assert.ok(weekly.candles.length>0&&weekly.candles.length<60);
 const before=storage.getItem('stock-edge-html-imports-v1');body.chart.result[0].meta.symbol='6758.T';await assert.rejects(ctx.__modules.builtinMarket.fetchAndSave('72030'));assert.equal(storage.getItem('stock-edge-html-imports-v1'),before);
 console.log('PASS: 225 Japanese names, legacy-cache display, Japanese/English search, frozen records unchanged, Yahoo adjusted-close import, saved daily/weekly candles and identity rejection.');
})().catch(e=>{console.error(e);process.exitCode=1;});
