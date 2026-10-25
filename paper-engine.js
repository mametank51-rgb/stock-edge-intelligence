/* Forward-only, long-only paper trials. Every trial is a separate hypothetical budget. */
(function(root){
'use strict';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const today=(now)=>new Date(now+9*3600000).toISOString().slice(0,10);
function validSnapshot(s){
 if(s?.schema!=='stock-edge-decision-v1'||!/^([1-9][0-9]{3}|[1-9][0-9]{2}[A-Z])$/.test(s.code)||!Number.isFinite(Date.parse(s.recordedAt))||![5,20,60].includes(s.holdBars)||!finite(s.capital)||s.capital<1000||s.capital>1e9||!finite(s.costBps)||s.costBps<0||s.costBps>500||s.unitModel!=='fractional-adjusted'||s.benchmark!=='1306')throw Error('判断記録の形式・計算条件が不正です');
 return s;
}
function seriesOk(series,code){return series?.schema==='stock-edge-price-series-v1'&&series.code===code&&series.currency==='JPY'&&series.basis==='split-adjusted'&&series.identityVerified&&Array.isArray(series.rows)&&Array.isArray(series.actions);}
function leg(series,entryDate,exitDate,{capital,costBps}){
 const rows=series.rows.filter(r=>r.date>=entryDate&&r.date<=exitDate),entry=rows.find(r=>r.date===entryDate),exit=rows.find(r=>r.date===exitDate);
 if(!entry||!exit)return null;
 if(rows.some(r=>!finite(r.adjustedClose)||r.adjustedClose<=0))return null;
 const cost=costBps/10000,entryPrice=entry.open*(entry.adjustedClose/entry.close),units=capital/(entryPrice*(1+cost));
 let peak=capital,drawdown=0;const path=[];
 for(const row of rows){
  // The provider already adjusts for dividends/splits. Never add events again.
  const value=units*row.adjustedClose*(1-cost);peak=Math.max(peak,value);drawdown=Math.min(drawdown,(value/peak-1)*100);path.push({date:row.date,value});
 }
 const final=path.at(-1).value;
 return {returnPct:(final/capital-1)*100,profit:final-capital,finalValue:final,units,entryPrice,exitPrice:exit.adjustedClose,maxDrawdownPct:drawdown,path};
}
function evaluate(snapshot,stock,benchmark,{now=Date.now()}={}){
 const s=validSnapshot(snapshot),recordedDay=today(Date.parse(s.recordedAt)),base={code:s.code,holdBars:s.holdBars,calculatedAt:new Date(now).toISOString(),methodVersion:1};
 if(Date.parse(s.recordedAt)>now)return {...base,state:'invalid',reason:'記録時刻が未来です'};
 if(recordedDay>=today(now))return {...base,state:'waiting',reason:'記録の翌営業日以降の確定日足を待っています'};
 if(!seriesOk(stock,s.code))return {...base,state:'missing',reason:'銘柄・通貨・価格基準を確認できる日足がありません'};
 if(!seriesOk(benchmark,s.benchmark))return {...base,state:'missing',reason:'営業日と比較成績を確認するため、基準ETF（1306）の日足が必要です'};
 const invalidInPeriod=series=>series.rejectedRows&&(!series.rejectedDates?.length||series.rejectedDates.some(d=>d==='unknown'||d>recordedDay&&d<today(now)));
 if(invalidInPeriod(stock)||invalidInPeriod(benchmark))return {...base,state:'missing',reason:'比較期間の価格に不正・欠損行があります。行を飛ばして成績を算出せず、再取得を待ちます'};
 // Ignore today's daily bar even if a provider returns an intraday close.
 const rows=stock.rows.filter(r=>r.date>recordedDay&&r.date<today(now));
 if(!rows.length)return {...base,state:'waiting',reason:'記録の翌営業日以降の確定日足を待っています'};
 const entry=rows[0],exit=rows[Math.min(s.holdBars,rows.length)-1],mature=rows.length>=s.holdBars;
 const expectedDates=benchmark.rows.filter(r=>r.date>recordedDay&&r.date<=exit.date).map(r=>r.date),actualDates=new Set(rows.map(r=>r.date));
 if(!expectedDates.length||expectedDates[0]!==entry.date||expectedDates.some(d=>!actualDates.has(d)))return {...base,state:'missing',reason:'基準ETFの営業日と銘柄の日足に差があります。取引停止・欠損などを確認してください'};
 if(!stock.rows.some(r=>r.date<=recordedDay))return {...base,state:'missing',reason:'取得範囲が記録日を覆っていないため、最初の営業日を確定できません'};
 const result=leg(stock,entry.date,exit.date,s);if(result?.insufficient)return {...base,state:'insufficient',reason:'設定資金では100株を購入できません'};
 if(!result)return {...base,state:'missing',reason:'比較期間の調整済み終値がありません。未調整価格で代用せず検証を保留します'};
 const benchmarkResult=seriesOk(benchmark,s.benchmark)?leg(benchmark,entry.date,exit.date,s):null;
 return {...base,state:mature?'complete':'running',reason:mature?'所定の保有日数を完了':'確定日足 '+rows.length+'/'+s.holdBars+'営業日',entryDate:entry.date,exitDate:exit.date,observedBars:Math.min(s.holdBars,rows.length),...result,benchmark:benchmarkResult||null,excessPct:benchmarkResult?result.returnPct-benchmarkResult.returnPct:null,stockSource:stock.source,benchmarkSource:benchmark?.source||'',priceBasis:'分割・配当調整後の理論価格（始値は終値の調整係数による近似）',taxIncluded:false};
}
function summary(trials){
 const all=trials||[],complete=all.filter(t=>t.current?.state==='complete'),comparable=complete.filter(t=>finite(t.current.excessPct)),avg=a=>a.length?a.reduce((n,v)=>n+v,0)/a.length:null;
 return {total:all.length,complete:complete.length,running:all.filter(t=>t.current?.state==='running').length,pending:all.filter(t=>!t.current||['waiting','missing','insufficient','invalid'].includes(t.current.state)).length,benchmarkCount:comparable.length,winRate:complete.length?100*complete.filter(t=>t.current.returnPct>0).length/complete.length:null,meanReturn:avg(complete.map(t=>t.current.returnPct)),meanExcess:avg(comparable.map(t=>t.current.excessPct)),worstDrawdown:complete.length?Math.min(...complete.map(t=>t.current.maxDrawdownPct)):null,byHorizon:[5,20,60].map(n=>({bars:n,n:complete.filter(t=>t.snapshot.holdBars===n).length,meanReturn:avg(complete.filter(t=>t.snapshot.holdBars===n).map(t=>t.current.returnPct))})),scoreBuckets:[[0,50],[50,65],[65,80],[80,101]].map(([lo,hi])=>{const rows=complete.filter(t=>finite(t.snapshot.scores?.overall)&&t.snapshot.scores.overall>=lo&&t.snapshot.scores.overall<hi);return {lo,hi,n:rows.length,meanReturn:avg(rows.map(t=>t.current.returnPct))};})};
}
function stable(value){if(Array.isArray(value))return '['+value.map(stable).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';return JSON.stringify(value);}
async function digest(value){const bytes=new TextEncoder().encode(stable(value)),result=await globalThis.crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(result)].map(v=>v.toString(16).padStart(2,'0')).join('');}
async function seal(snapshot){const normalized=JSON.parse(JSON.stringify(snapshot));validSnapshot(normalized);return {id:globalThis.crypto.randomUUID(),snapshot:normalized,snapshotHash:await digest(normalized),current:null,revisions:[]};}
async function validateTrial(trial){validSnapshot(trial?.snapshot);if(!/^[a-f0-9-]{20,64}$/.test(trial.id)||await digest(trial.snapshot)!==trial.snapshotHash)throw Error('判断記録の整合性チェックに失敗しました');if(trial.current){const result=JSON.parse(JSON.stringify(trial.current));delete result.calculatedAt;if(await digest(result)!==trial.resultHash)throw Error('計算結果の整合性チェックに失敗しました');}return trial;}
async function recordEvaluation(trial,result){await validateTrial(trial);const clean=JSON.parse(JSON.stringify(result));delete clean.calculatedAt;const hash=await digest(clean);if(hash===trial.resultHash)return trial;const revisions=[...(trial.revisions||[])];if(trial.current&&trial.current.state==='complete')revisions.push({result:trial.current,hash:trial.resultHash});return {...trial,current:result,resultHash:hash,revisions:revisions.slice(-10)};}
const api={validSnapshot,evaluate,summary,stable,digest,seal,validateTrial,recordEvaluation};if(typeof module!=='undefined')module.exports=api;else root.PaperEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
