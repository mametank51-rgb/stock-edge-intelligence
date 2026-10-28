// App scope: interpret existing analyses only. No price/financial requests or indicator calculations.
const proverbMemo=ProverbEngine.createEngine({limit:512});
let proverbRankFilter='all';
const proverbMinute=()=>Math.floor(Date.now()/60000)*60000;
function proverbVoice(code,row=null){try{return row?v4Insight(row).mv?.voice:marketVoice.metrics(code).voice;}catch{return null;}}
function proverbCommonInput(code,fund,voice){return {code,now:proverbMinute(),financialDate:fund?.latest?.date,fundCoverage:fund?.coverage,fundWarnings:Array.isArray(fund?.risks)?fund.risks.length:null,voiceReliable:voice?.count>=3&&voice?.sources>=2&&voice?.evidenceWeight>=1.5};}
function proverbDailyInput(technical,row,fund,voice,{interval='1d',synthetic=false,bars=null,forecast=null}={}){
 const t=technical||{},i=t.indicators||{},scope=interval==='1wk'?'週足':'日足',code=String(row?.code||fastDetailCode());
 return {...proverbCommonInput(code,fund,voice),interval,scope,priceDate:t.dataAsOf||row?.dataAsOf,synthetic,bars:bars??t.observations?.bars,
  forecastReliable:!!forecast?.ready&&forecast.samples>=12,features:{
   price:t.price??row?.price,tech:t.score??row?.score,maFast:i.sma20,maSlow:i.sma50,maLong:i.sma100,
   rsi:i.rsi??t.rsi,macd:i.macdHist,macdDelta:Number.isFinite(i.macdHist)&&Number.isFinite(i.macdHistPrev)?i.macdHist-i.macdHistPrev:null,
   ret5:t.m5,ret10:t.observations?.ret10,ret20:t.m20,ret60:t.observations?.ret60,change:t.changePct,
   volumeRatio:t.volumeRatio,atrPct:i.atrPct,rangeLow:i.donchianLow,rangeHigh:i.donchianHigh,bollPct:i.bollPctB,
   momentum:t.categories?.momentum,trend:t.categories?.trend,fund:fund?.score,voice:voice?.score,
   forecastUp:forecast?.scenarios?.find(s=>s.id==='up')?.probability,forecastDown:forecast?.scenarios?.find(s=>s.id==='down')?.probability
  }};
}
function proverbForRow(row){const insight=v4Insight(row);return proverbMemo.evaluate(proverbDailyInput(row.technical,row,insight.fund,insight.mv?.voice));}
function proverbCachedForecast(){if(state.interval!=='1d'||!activeDetailEntry||!state.candles?.length)return null;const key=EdgePerformance.seriesKey(detailContext(),state.candles)+':forecast:'+(state.forecastHorizon||20);return detailCache.lru.peek(state.ticker)?.analysis.peek(key)?.value||null;}
function proverbForDetail(){
 const code=fastDetailCode(),row=fastDetailRow()||{code},fund=financialIntel.analyze(code),loaded=activeDetailEntry?.ctx.ticker===state.ticker&&state.candles?.length;
 const technical=loaded?technicalAnalysisForView():row.technical;
 return proverbMemo.evaluate(proverbDailyInput(technical,row,fund,proverbVoice(code),{interval:loaded?state.interval:'1d',synthetic:loaded?state.history?.is_dummy!==false:false,bars:loaded?state.candles.length:null,forecast:loaded?proverbCachedForecast():null}));
}
function proverbForShort(s){
 const r=s.result,rows=r.quality.completed,last=rows.at(-1),i=rows.length-1,ind=r.chart,code=StockNames.codeOf(s.ticker),fund=financialIntel.analyze(code),voice=proverbVoice(code);
 const atBack=n=>rows.at(-1-n)?.close,ret=n=>Number.isFinite(atBack(n))?(last.close/atBack(n)-1)*100:null;
 return proverbMemo.evaluate({...proverbCommonInput(code,fund,voice),interval:s.interval,maKind:'ema',scope:'短期・'+shortLabels[s.interval],priceDate:last?.time,bars:rows.length,fresh:!MarketClock.assess(rows,s.interval,Date.now()).stale,features:r.ready?{
  price:last.close,tech:r.score,maFast:r.ema9,maSlow:r.ema21,maLong:null,rsi:r.rsi,macd:ind.histogram[i],macdDelta:ind.histogram[i]-ind.histogram[i-1],
  ret5:r.return5,ret10:ret(10),ret20:ret(20),ret60:ret(60),change:ret(1),volumeRatio:r.ratio,atrPct:r.atr/last.close*100,rangeLow:r.levels.rangeLow,rangeHigh:r.levels.rangeHigh,
  bollPct:r.technical?.values.bands.upper!==r.technical?.values.bands.lower?(last.close-r.technical.values.bands.lower)/(r.technical.values.bands.upper-r.technical.values.bands.lower):null,
  fund:fund?.score,voice:voice?.score
 }:{} });
}
function proverbCardHtml(result,{open=false}={}){
 const rank=ProverbEngine.ranks[result.rank],scoreLabel=result.rank==='red'?'危険度':'該当度';
 return `<header><span>${rank.icon} 今の相場格言</span><small>${esc(rank.label)} · ${esc(result.scope)}</small></header><div class="proverb-title-row"><h3>${esc(result.title)}</h3><span class="proverb-score">${scoreLabel} <b>${result.score??'—'}</b>${result.score!==null?' / 100':''}</span></div><p class="proverb-summary">${esc(result.summary)}</p><details class="proverb-reasons" ${open?'open':''}><summary>理由と次に見る条件</summary><div><h4>今回該当した理由</h4><ul>${result.reasons.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><h4>次に確認する変化</h4><ul>${result.watch.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>${result.rank==='rainbow'?`<p>合意した確認軸：${result.agreements.filter(x=>x.ok).map(x=>esc(x.name)).join('・')}</p>`:''}<h4>注意点</h4>${result.notes.map(s=>`<p class="proverb-note">${esc(s)}</p>`).join('')}</div></details>`;
}
function paintProverbCard(host,result){const signature=JSON.stringify(result);if(host.dataset.proverbSignature===signature)return;const open=!!host.querySelector('details[open]');host.dataset.proverbSignature=signature;host.dataset.proverbRank=result.rank;host.dataset.proverbId=result.id;host.className='proverb-card proverb-'+result.rank;host.innerHTML=proverbCardHtml(result,{open});}
function paintShortProverb(s=activeShortSession){if(!s?.panel?.isConnected)return;let host=s.panel.querySelector('[data-proverb-card="short"]');if(!host){host=document.createElement('section');host.dataset.proverbCard='short';host.setAttribute('aria-label','短期の相場格言');s.panel.querySelector('[data-short-verdict]').after(host);}paintProverbCard(host,s.result?proverbForShort(s):proverbMemo.evaluate({scope:'短期・'+shortLabels[s.interval]}));}
function proverbEnhance(){
 const root=document.querySelector('.fast-detail');if(!root||state.route!=='stock')return;
 if(selectedAnalysisMode==='short'){paintShortProverb();return;}
 const swing=root.querySelector('[data-swing-content]');if(!swing)return;
 const combined=swing.querySelector('#stock-combined'),nav=swing.querySelector('.ui-detail-nav');
 if(combined){combined.classList.add('proverb-compact-summary');if(nav&&nav.nextElementSibling!==combined)nav.after(combined);else if(!nav&&swing.firstElementChild!==combined)swing.prepend(combined);}
 let host=swing.querySelector('[data-proverb-card="daily"]');if(!host){host=document.createElement('section');host.dataset.proverbCard='daily';host.setAttribute('aria-label','相場格言');}
 if(combined){if(combined.nextElementSibling!==host)combined.after(host);}else if(nav)nav.after(host);else swing.prepend(host);
 paintProverbCard(host,proverbForDetail());
}
function paintProverbCards(){if(state.route!=='stock')return;if(selectedAnalysisMode==='short')paintShortProverb();else proverbEnhance();}
function proverbBadge(row){const result=proverbForRow(row),rank=ProverbEngine.ranks[result.rank],label=rank.label+'：'+result.title;return `<button class="proverb-badge proverb-${result.rank}" data-proverb-code="${esc(row.code)}" data-proverb-rank="${result.rank}" title="${esc(label)}" aria-label="相場格言 ${esc(label)}">${rank.icon}</button>`;}
function proverbFilterControl(){return `<label class="proverb-filter">格言で絞り込み<select data-proverb-filter aria-label="格言のランクで絞り込み">${[['all','すべて'],...Object.entries(ProverbEngine.ranks).filter(([k])=>k!=='pending').map(([k,v])=>[k,v.icon+' '+v.label]),['pending','⚪ 判定保留']].map(([k,label])=>`<option value="${k}" ${proverbRankFilter===k?'selected':''}>${label}</option>`).join('')}</select></label>`;}
app.addEventListener('change',event=>{if(!event.target.matches('[data-proverb-filter]'))return;proverbRankFilter=event.target.value;updateResults();});
app.addEventListener('click',event=>{
 const close=event.target.closest('[data-proverb-close]');if(close){close.closest('dialog')?.close();return;}
 const b=event.target.closest('[data-proverb-code]');if(b){const row=__modules.nikkei225.rows().find(r=>r.code===b.dataset.proverbCode);if(!row)return;let dialog=document.getElementById('proverb-dialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='proverb-dialog';dialog.className='proverb-dialog';app.append(dialog);}const result=proverbForRow(row);dialog.setAttribute('aria-label',StockNames.display(row.code,row.name)+'の相場格言');dialog.innerHTML=`<div class="proverb-dialog-top"><strong>${esc(StockNames.display(row.code,row.name))} · ${esc(row.code)}</strong><button class="btn" data-proverb-close aria-label="相場格言を閉じる">閉じる</button></div><section class="proverb-card proverb-${result.rank}">${proverbCardHtml(result)}</section>`;dialog.showModal();return;}
 if(event.target.id==='proverb-dialog'){const box=event.target.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)event.target.close();}
});
window.stockEdgeProverbs={snapshot:()=>proverbMemo.snapshot()};
