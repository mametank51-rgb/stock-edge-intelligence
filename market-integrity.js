/* Price, period and evidence consistency checks shared by analysis and paper trials. */
(function(root){
'use strict';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const codeOf=v=>/^[1-9][0-9]{3}$|^[1-9][0-9]{2}[A-Z]$/.test(String(v||''))?String(v):'';
function day(value){try{if(typeof value==='number')return Number.isFinite(value)?new Date(value*1000+9*3600000).toISOString().slice(0,10):'';const s=String(value||'');return /^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s?s:'';}catch{return '';}}
const today=(now=Date.now())=>new Date(now+9*3600000).toISOString().slice(0,10);
function normalize(payload,{code,now=Date.now(),requireIdentity=true}={}){
 const expected=codeOf(code),meta=payload?.meta||{};
 if(!expected)throw Error('銘柄コードが不正です');
 if(requireIdentity&&(String(meta.symbol||'').toUpperCase()!==expected+'.T'||meta.currency!=='JPY'))throw Error('株価の銘柄コードまたは通貨を照合できません');
 const byDate=new Map(),issues=[],rejectedDates=Array.isArray(payload.sourceRejectedDates)?payload.sourceRejectedDates.slice(0,1000):[];let rejected=Number.isInteger(payload.sourceRejected)&&payload.sourceRejected>0?payload.sourceRejected:0,duplicates=0;
 for(const raw of payload.rows||[]){
  const date=day(raw.date||raw.time),values=['open','high','low','close'].map(k=>raw[k]);
  if(!date||date>today(now)||values.some(v=>!finite(v)||v<=0)||!finite(raw.volume)||raw.volume<0||raw.high<Math.max(raw.open,raw.close,raw.low)||raw.low>Math.min(raw.open,raw.close)){rejected++;rejectedDates.push(date||'unknown');continue;}
  const row={date,open:raw.open,high:raw.high,low:raw.low,close:raw.close,volume:raw.volume};
  if(finite(raw.adjustedClose)&&raw.adjustedClose>0)row.adjustedClose=raw.adjustedClose;
  if(byDate.has(date)){duplicates++;if(JSON.stringify(byDate.get(date))!==JSON.stringify(row))throw Error('同じ日付の株価が複数あり、値が一致しません');}
  byDate.set(date,row);
 }
 const rows=[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));if(!rows.length)throw Error('検証に使える株価がありません');
 const actions=[];let invalidActions=0;
 for(const event of Object.values(payload.events?.splits||{})){
  const date=day(event.date),ratio=finite(event.numerator)&&finite(event.denominator)&&event.denominator>0?event.numerator/event.denominator:null;
  if(!date||!finite(ratio)||ratio<=0){invalidActions++;continue;}actions.push({date,type:'split',ratio});
 }
 for(const event of Object.values(payload.events?.dividends||{})){
  const date=day(event.date);if(!date||!finite(event.amount)||event.amount<0){invalidActions++;continue;}actions.push({date,type:'dividend',amount:event.amount});
 }
 if(invalidActions)throw Error('分割・配当イベントに解釈できない値があります');
 actions.sort((a,b)=>a.date.localeCompare(b.date)||(a.type==='split'?-1:1));
 const seen=new Set();for(const a of actions){const key=a.date+'|'+a.type;if(seen.has(key))throw Error('同日イベントが重複しています');seen.add(key);}
 if(rejected)issues.push('不正・未確定の行を'+rejected+'件除外');if(duplicates)issues.push('同値の重複日を'+duplicates+'件整理');
 return {schema:'stock-edge-price-series-v1',code:expected,symbol:meta.symbol||expected+'.T',currency:'JPY',basis:payload.basis==='split-adjusted'?'split-adjusted':'unspecified',rows,actions,source:payload.sourceUrl||'',transport:payload.transport||'',fetchedAt:new Date(now).toISOString(),dataAsOf:rows.at(-1).date,identityVerified:requireIdentity,rejectedRows:rejected,rejectedDates,issues,actionBasis:'配信元の調整済み終値（分割・配当調整、一次資料未照合）'};
}
function splitAdjusted(series){
 if(series.basis==='split-adjusted')return series.rows;
 throw Error('価格の調整基準が不明なため、追加の分割調整を行いません');
}
function completeRows(series,now=Date.now()){return (series?.rows||[]).filter(r=>r.date<today(now));}
function claimAudit(claim,{fund={},quote={}}={}){
 const checks=[],metrics=Array.isArray(claim.metrics)?claim.metrics:[],period=claim.periodEnd||'',fundDate=fund.latest?.date||'';
 for(const m of metrics){
  let actual=null;
  if(m.measure==='operatingProfitGrowth')actual=fund.kpi?.opYoy;
  if(m.measure==='revenueGrowth')actual=fund.kpi?.revYoy;
  if(m.measure==='per'){
   checks.push({state:'different-basis',label:'価格指標の基準を確認',text:(m.nature==='forecast'?'記事は予想ベース。':'記事の算定基準は未確定。')+'保存財務のPERは取得済み年次EPSを使うため、同じ指標として正誤比較しません。'});continue;
  }
  if(m.measure==='pbr'){checks.push({state:'different-basis',label:'PBRの株価・純資産の時点を確認',text:'PBRは株価と1株当たり純資産の時点・株数が必要です。記事と保存財務の基準が一致するまでは、数値の正誤比較を行いません。'});continue;}
  if(!['operatingProfitGrowth','revenueGrowth'].includes(m.measure))continue;
  if(claim.nature!=='actual'||!period||period!==fundDate||m.unit!=='%'||!finite(actual)){
   checks.push({state:'unmatched',label:'対象期・実績／予想の照合待ち',text:'記事 '+(claim.periodLabel||'対象期不明')+' / '+(({actual:'実績',forecast:'予想',mixed:'実績・予想が混在'})[claim.nature]||'区分不明')+'。保存財務 '+(fundDate||'未取得')+' と同条件で比較できません。'});continue;
  }
  const delta=Math.abs(actual-m.value);checks.push({state:delta<=1?'consistent':'review',label:delta<=1?'同じ対象期の数値が概ね一致':'同じ対象期の数値に差があります',text:'記事 '+m.value+'% / 保存財務 '+actual.toFixed(1)+'%。会計範囲・修正値を一次資料で確認してください。'});
 }
 if(!metrics.length)checks.push({state:'unmatched',label:'数値照合なし',text:'比較可能な数値・単位が抽出されていません。'});
 return checks;
}
const api={normalize,splitAdjusted,completeRows,claimAudit,day,today,codeOf};if(typeof module!=='undefined')module.exports=api;else root.MarketIntegrity=api;
})(typeof globalThis!=='undefined'?globalThis:this);
