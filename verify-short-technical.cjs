const assert=require('node:assert/strict'),C=require('./market-clock'),A=require('./short-analysis'),T=require('./short-technical'),O=require('./chart-overlays');
const now=C.at('2026-10-28',620);
function series(mirror=false){
 const knots=[[0,3060],[10,3040],[20,3000],[35,3040],[50,3001],[62,3046],[70,3050],[79,3048]],rows=[];
 for(let i=0;i<80;i++){
  const right=knots.findIndex(p=>p[0]>=i),[b,y]=knots[right],[a,x]=knots[Math.max(0,right-1)],base=a===b?y:x+(y-x)*(i-a)/(b-a),close=mirror?6100-base:base;
  const day=i<66?'2026-10-27':'2026-10-28',j=i%66,minute=540+j*5+(j>=30?60:0);
  rows.push({time:new Date(C.at(day,minute)).toISOString(),open:close-.05,close,high:close+.2,low:close-.2,volume:i>=59&&i<=62?2200:1000});
 }
 return {symbol:'7203.T',interval:'5m',rows};
}
const w=series(),before=JSON.stringify(w),s=A.calculateShortEdge(w,{now}),t=T.analyze(w,s);
assert.equal(t.ready,true);assert.equal(t.signals.length,15);assert.equal(t.signals.find(x=>x.key==='rsi').value,s.rsi.toFixed(1));assert.equal(Object.values(t.counts).reduce((a,b)=>a+b,0),15);assert.equal(JSON.stringify(w),before);
assert.equal(O.build(w.rows,{count:100,options:{bothPatterns:true}}).patterns.length,0,'daily 3% rule must remain unchanged');
assert.ok(t.patterns.some(p=>p.kind==='W'),'short-range W was missed');for(const p of t.patterns){assert.equal(p.confirmedAt,p.b.i+3);assert.ok(p.points.every(x=>x.i<s.quality.completed.length));assert.equal(p.neckline,w.rows[p.neck.i].high);assert.ok(p.volumeConfirmed);}
const m=series(true),mt=T.analyze(m,A.calculateShortEdge(m,{now}));assert.ok(mt.patterns.some(p=>p.kind==='M'),'short-range M was missed');assert.ok(mt.signals.find(x=>x.key==='patterns').state==='caution');
const quiet=structuredClone(w);quiet.rows.forEach(r=>r.volume=1000);const qt=T.analyze(quiet,A.calculateShortEdge(quiet,{now}));assert.ok(qt.patterns.length);assert.ok(qt.patterns.every(p=>!p.volumeConfirmed));
const forming=structuredClone(w);forming.rows.push({time:new Date(now).toISOString(),open:3000,close:5000,high:5000,low:1,volume:1e9});const ft=T.analyze(forming,A.calculateShortEdge(forming,{now}));assert.deepEqual(ft.signals,t.signals);assert.deepEqual(ft.values,t.values);assert.ok(ft.overlays.trends.every(x=>x.endIndex===79));
for(const interval of ['5m','15m','60m','1d']){
 const record={...w,interval},analysis=A.calculateShortEdge(record,{now:C.at('2026-10-28',1000)}),result=T.analyze(record,analysis);assert.ok(result.ready);assert.equal(result.signals.length,15);if(interval==='1d')assert.equal(result.signals.find(x=>x.key==='vwap').state,'unavailable');
}
const flat=structuredClone(w);flat.rows.forEach(r=>Object.assign(r,{open:3000,close:3000,high:3000,low:3000,volume:0}));const flatT=T.analyze(flat,A.calculateShortEdge(flat,{now}));assert.equal(flatT.patterns.length,0);assert.equal(flatT.values.dmi.adx,0);assert.equal(flatT.values.stoch.k,50);assert.equal(flatT.values.cci,0);assert.equal(flatT.values.mfi,null);assert.equal(flatT.values.obv10,null);assert.equal(flatT.signals.find(x=>x.key==='mfi').state,'unavailable');assert.equal(flatT.signals.find(x=>x.key==='obv').state,'unavailable');
const insufficient={...w,rows:w.rows.slice(0,20)};assert.equal(T.analyze(insufficient,A.calculateShortEdge(insufficient,{now})).ready,false);
// Independent reference values: flat money flow, one-way flow and DMI strength/direction.
const monotone=Array.from({length:60},(_,i)=>({open:3000+i,close:3000+i,high:3001+i,low:2999+i,volume:100}));assert.equal(T.moneyFlow(monotone),100);assert.equal(T.obv(monotone),100);const dmi=T.directional(monotone);assert.ok(Math.abs(dmi.adx-100)<1e-9);assert.ok(dmi.plus>0);assert.equal(dmi.minus,0);
console.log('PASS: 15 short technical methods, W/M under intraday rules with unchanged daily rules, confirmed pivots/price-vs-volume breakout, forming-bar exclusion, 4 intervals, Wilder DMI, zero-volume/flat/insufficient data and immutable inputs.');
