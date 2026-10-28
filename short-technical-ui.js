// Compact technical evidence, kept separate from data acquisition and score calculation.
function shortChartOverlayControls(){
 return `<details class="short-overlay-options"><summary>テクニカルの表示設定</summary><div>${[['patterns','W底・W天井'],['trend','トレンドライン'],['levels','支持・抵抗'],['bands','ボリンジャー']].map(([key,label])=>`<label><input type="checkbox" data-short-overlay="${key}" ${shortOverlayFlags[key]?'checked':''}>${label}</label>`).join('')}</div></details>`;
}
function shortTechnicalPanel(){
 return '<section class="short-technical" data-short-technical aria-label="短期テクニカル分析"><h3>短期テクニカル分析</h3><p>データ取得後、確定足から計算します。</p></section>';
}
function shortTechnicalOverlays(s,series,levels){
 const overlays=s.result.technical?.overlays;
 s.panel.querySelectorAll('[data-short-overlay]').forEach(n=>n.checked=shortOverlayFlags[n.dataset.shortOverlay]);
 if(!overlays)return {series,levels,trends:[],patterns:[]};
 if(shortOverlayFlags.bands)series.push(...overlays.series);
 if(shortOverlayFlags.levels)levels.push(...overlays.levels);
 return {series,levels,trends:shortOverlayFlags.trend?overlays.trends:[],patterns:shortOverlayFlags.patterns?overlays.patterns:[]};
}
function paintShortTechnical(s){
 const t=s.result.technical,p=s.panel.querySelector('[data-short-technical]');
 if(!p)return;
 const qualityKey=[s.interval,s.result.quality.stale,s.result.referenceOnly].join(':');
 if(t?.ready&&s.technicalPainted===t&&s.technicalQualityKey===qualityKey&&p.querySelector('.st-heading'))return;
 s.technicalPainted=t;s.technicalQualityKey=qualityKey;
 if(!t?.ready){p.innerHTML='<h3>短期テクニカル分析</h3><p>確定足40本以上が必要です。データがそろうまで判定を保留します。</p>';return;}
 // Preserve open evidence while prices refresh. All labels and values come from the selected interval.
 const opened=new Set([...p.querySelectorAll('details[open]')].map(d=>d.dataset.stGroup||d.dataset.stSignal));
 const states={bull:'上向き',bear:'下向き',neutral:'中立',caution:'注意',unavailable:'保留'};
 const groups=[['trend','流れ・方向'],['momentum','勢い・過熱'],['volume','出来高'],['setup','形・節目'],['risk','値幅・リスク']];
 const positives=t.signals.filter(x=>x.state==='bull'),negatives=t.signals.filter(x=>x.state==='bear'||x.state==='caution');
 p.innerHTML=`<div class="st-heading"><div><h3>短期テクニカル分析</h3><span>${shortLabels[s.interval]} · ${t.signals.length}項目 · 確定足のみ</span></div><small>${esc(shortTime(t.asOf))} JST${s.result.quality.stale?' · 古いデータ':s.result.referenceOnly?' · 参考値':''}</small></div><div class="st-counts">${Object.entries(states).map(([key,label])=>`<span class="st-state st-${key}">${label} <b>${t.counts[key]}</b></span>`).join('')}</div><div class="st-highlights">${positives.length?`<p><b>支え</b> ${esc(positives.slice(0,2).map(x=>x.name+' '+x.value).join(' ／ '))}</p>`:''}${negatives.length?`<p><b>注意</b> ${esc(negatives.slice(0,2).map(x=>x.name+' '+x.value).join(' ／ '))}</p>`:''}</div><p class="st-guide">項目を開くと、数値の意味・次に見る条件を確認できます。指標数の多数決やスコアへの二重加算はしません。</p>${groups.map(([key,label])=>{const signals=t.signals.filter(x=>x.group===key);return `<details class="st-group" data-st-group="${key}" ${opened.has(key)?'open':''}><summary><strong>${label}</strong><span>${signals.length}項目${signals.some(x=>x.state==='caution')?' · 注意あり':''}</span></summary><div>${signals.map(x=>`<details class="st-signal" data-st-signal="${x.key}" ${opened.has(x.key)?'open':''}><summary><span class="st-signal-name">${esc(x.name)}</span><span class="st-state st-${x.state}">${states[x.state]}</span><span class="st-value">${esc(x.value)}</span></summary><div><p>${esc(x.reason)}</p><p><b>次に見る条件</b><br>${esc(x.watch)}</p><small>${esc(x.rule)}</small></div></details>`).join('')}</div></details>`;}).join('')}<small class="st-footnote">短期の観測結果です。勝率・売買の指示を表しません。日足と同じパターンでも時間幅が異なります。</small>`;
}
function shortPatternReadout(s){
 const t=s.result.technical;if(!t?.ready)return 'チャートの形は確定足がそろってから判定します。';
 const trend=t.overlays.trends.filter(x=>!x.broken).length,broken=t.overlays.trends.filter(x=>x.broken).length;
 const summary=`トレンドライン ${trend}本${broken?'・逸脱 '+broken+'本':''} / 支持・抵抗 ${t.overlays.levels.length}本`;
 if(!t.patterns.length)return `<span>${esc(summary)}</span><p>検出条件に合うW底・W天井はありません。</p>`;
 return `<span>${esc(summary)}</span>${t.patterns.map(p=>`<details class="st-pattern"><summary><strong>${esc(p.name)}</strong><span>${p.status==='candidate'?'形成候補':p.status==='retest'?'抜け後の戻り':p.kind==='W'?'価格上抜け':'価格下抜け'}</span></summary><p>ネックライン ${shortMoney(p.neckline)} / 撤回目安 ${shortMoney(p.invalidation)}</p><p>${p.breakout===null?'価格がネックラインを抜けるまで候補です。':p.volumeConfirmed?'抜けた足で出来高1.5倍以上を確認。':'価格の抜けのみ。出来高の裏付けは未確認です。'}${Number.isFinite(p.volumeRatio)?' 出来高 '+p.volumeRatio.toFixed(2)+'倍。':''}</p><small>転換点は後続3本で確定。表示範囲内の実際の山谷を接続しています。</small></details>`).join('')}`;
}
