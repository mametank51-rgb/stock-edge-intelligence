const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),E=require('./technical-explain'),F=require('./forecast-model');
const html=fs.readFileSync('index.html','utf8'),start=html.indexOf('__modules.technicalEngine = (() => {'),source=html.slice(start,html.indexOf('\n})();',start)+6),context={__modules:{}};vm.createContext(context);vm.runInContext(source,context);
const engine=context.__modules.technicalEngine,keys=new Set();
for(const file of fs.readdirSync('chart-data').filter(x=>x!=='index.json')){
 const rows=JSON.parse(fs.readFileSync('chart-data/'+file,'utf8')).rows,t=engine.analyze(rows),before=JSON.stringify(t),x=E.build(t,{bars:rows});
 assert.equal(x.scoreMatches,true,file);assert.equal(x.reconstructed,t.score);assert.ok(Math.abs(x.groups.reduce((a,g)=>a+g.weight,0)-1)<1e-12);assert.equal(x.groups.reduce((a,g)=>a+g.signals.length,0),t.total);assert.equal(JSON.stringify(t),before,'explanations cannot mutate the analysis');
 for(const s of x.groups.flatMap(g=>g.signals)){keys.add(s.key);assert.ok(s.name&&s.meaning&&s.observed&&s.reason&&s.rule&&s.next,s.key);assert.doesNotMatch(s.observed,/NaN|Infinity|undefined/);}
}
assert.equal(keys.size,24,'all existing indicator rules need readable explanations');
const fixture={score:24,total:24,bull:3,bear:16,neutral:5,categories:{trend:17,momentum:21,volume:14,breakout:20,pattern:70},signals:[],indicators:{rsi:30,atrPct:2}},weak=E.build(fixture);assert.equal(weak.reconstructed,24);assert.match(weak.headline,/下向き/);assert.match(weak.contradiction,/70点/);assert.match(weak.contradiction,/12%/);assert.equal(E.build({score:50,signals:[],categories:{}}),null);
const rows=JSON.parse(fs.readFileSync('chart-long-data/7453.json','utf8')).rows;
for(const horizon of [5,20,60]){
 const f=F.analyze(rows,{horizon});assert.equal(f.ready,true);assert.equal(f.analogues.length,f.samples);const last=rows.at(-1).close,mean=rows.slice(-60).reduce((a,r)=>a+r.close,0)/60;
 assert.ok(Math.abs(f.inputs.return20Pct-(last/rows.at(-21).close-1)*100)<1e-10);assert.ok(Math.abs(f.inputs.deviation60Pct-(last/mean-1)*100)<1e-10);
 const counts={up:0,flat:0,down:0};for(let j=0;j<f.analogues.length;j++){const a=f.analogues[j],anchor=f.anchors[j];assert.equal(a.start,rows[anchor].date);assert.equal(a.end,rows[anchor+horizon].date);assert.ok(a.end<=f.asOf);assert.ok(Math.abs(a.rawReturnPct-(rows[anchor+horizon].close/rows[anchor].close-1)*100)<1e-10);const scaled=(Math.exp(Math.log(rows[anchor+horizon].close/rows[anchor].close)*a.volatilityScale)-1)*100;assert.ok(Math.abs(scaled-a.scaledReturnPct)<1e-9);assert.equal(a.group,scaled>f.threshold*100?'up':scaled< -f.threshold*100?'down':'flat');counts[a.group]++;}
 for(const s of f.scenarios){assert.equal(counts[s.id],s.count);assert.equal(s.probability,counts[s.id]/f.samples);}
 const end=1800,changed=structuredClone(rows);for(let k=end+1;k<changed.length;k++)changed[k].close*=10;assert.deepEqual(F.predict(changed,{horizon,end}),F.predict(rows,{horizon,end}),'explanation metadata must not include future observations');
}
console.log('PASS: explanations cover all 24 rules, reproduce every real technical score, show opposing pattern evidence, preserve analysis, and trace scenario counts to actual historical observations without look-ahead.');
