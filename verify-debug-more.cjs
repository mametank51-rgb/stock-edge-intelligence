const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('./voice-research'),I=require('./market-integrity');
const now=Date.parse('2026-10-25T03:00:00Z');let failures=0;
async function check(name,fn){try{await fn();console.log('PASS: '+name);}catch(e){failures++;console.error('FAIL: '+name+' — '+e.message);}}
const article={communityFeed:true,code:'7203',headline:'企業分析',url:'https://example.com/analysis',publishedAt:'2026-10-24T00:00:00Z',publisher:'ブログ',sourceGroup:'writer',research:{version:6,subjects:[{code:'7203',name:'トヨタ'}],claims:[]}};
const fund={latest:{date:'2026-03-31'},kpi:{opYoy:20}};
(async()=>{
await check('quarterly growth is never compared as matching annual growth',()=>{const claim={nature:'actual',periodScope:'quarter',periodEnd:'2026-03-31',periodLabel:'2026年3月期 第1四半期',metrics:[{measure:'operatingProfitGrowth',value:20,unit:'%'}]};assert.equal(I.claimAudit(claim,{fund})[0].state,'unmatched');});
await check('unknown period coverage is not silently treated as annual',()=>{const claim={nature:'actual',periodEnd:'2026-03-31',metrics:[{measure:'operatingProfitGrowth',value:20,unit:'%'}]};assert.equal(I.claimAudit(claim,{fund})[0].state,'unmatched');});
await check('one malformed research subject or claim does not stop the board',()=>{const bad={...article,research:{version:5,subjects:[null],claims:[null,{kind:'growth',excerpt:'利益が改善',metrics:[null]}]}};assert.doesNotThrow(()=>R.build([bad],{now}));assert.ok(R.build([bad],{now}).length);});
await check('numeric evidence ignores malformed metric entries',()=>{const claim={nature:'actual',periodScope:'annual',periodEnd:'2026-03-31',metrics:[null,{}, {measure:'operatingProfitGrowth',value:'20',unit:'%'},{measure:'operatingProfitGrowth',value:20,unit:'%'}]};const checks=I.claimAudit(claim,{fund});assert.equal(checks.length,1);assert.equal(checks[0].state,'consistent');});
await check('null cached quotes cannot crash a saved research candidate',()=>{assert.doesNotThrow(()=>R.build([article],{quotes:{'7203':null},fundamentals:{'7203':null},now}));});
await check('a quote from the near future is not considered current',()=>{assert.equal(R.compare({claims:[],writers:1,bodyCount:0},{price:100,dataAsOf:new Date(now+60000).toISOString()},{},now).quoteFresh,false);});
await check('malformed notebook storage is preserved and cannot be overwritten on save',()=>{
 const key='stock-edge-thesis-journal-v1',memory=new Map([[key,'{broken-notebook']]);const context={HTML_CONTEXT:{storage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)}},VoiceResearch:R,app:{addEventListener(){}},Date,console};vm.createContext(context);vm.runInContext(fs.readFileSync('research-ui.js','utf8'),context);vm.runInContext('researchIdeas=()=>[{code:"7203",name:"トヨタ",claims:[],quoteFresh:false}];researchQuotes=()=>({});',context);
 assert.throws(()=>vm.runInContext('saveResearchNote("7203",{thesis:"新規"})',context));assert.equal(memory.get(key),'{broken-notebook');
});
await check('a malformed price cache entry cannot prevent storing a fresh price series',()=>{
 const cached={'2462':null},memory=new Map(),context={MarketIntegrity:I,HTML_CONTEXT:{storage:{setItem:(k,v)=>memory.set(k,v)}},researchStored:()=>cached,app:{addEventListener(){}},Date,console};vm.createContext(context);vm.runInContext(fs.readFileSync('paper-lab-ui.js','utf8'),context);context.payload={meta:{symbol:'7203.T',currency:'JPY'},basis:'split-adjusted',rows:[{date:'2026-10-23',open:100,high:105,low:99,close:102,volume:1000,adjustedClose:102}]};assert.doesNotThrow(()=>vm.runInContext('paperRememberSeries("7203",payload)',context));const next=JSON.parse(memory.get('stock-edge-paper-prices-v1'));assert.ok(next['7203']);assert.equal(next['2462'],undefined);
});
if(failures)process.exitCode=1;else console.log('PASS: additional data-shape, fiscal-period, future-price and notebook-preservation regressions.');
})().catch(e=>{console.error(e);process.exitCode=1;});
