// Compact presentation. The full explanation stays available in each disclosure.
function compactSignalValue(t,s){
 const i=t.indicators||{},sup=t.support||{},gap=v=>Number.isFinite(v)&&v!==0?analysisPct((t.price/v-1)*100):'未算出';
 switch(s.key){
 case 'price_sma20':return '20本平均から '+gap(i.sma20);
 case 'price_sma50':return '50本平均から '+gap(i.sma50);
 case 'sma200':return '200本平均から '+gap(i.sma200);
 case 'ma_align':return '20・50・100本の平均を比較';
 case 'ema':return analysisPrice(i.ema12)+' / '+analysisPrice(i.ema26);
 case 'macd':return '線の差 '+analysisNumber(i.macdHist,2);
 case 'adx':return '流れの強さ '+analysisNumber(i.adx);
 case 'ichimoku':return t.price>i.cloudTop?'価格は雲より上':t.price<i.cloudBottom?'価格は雲より下':'価格は雲の範囲内';
 case 'regression':return '傾き '+analysisPct(i.regSlope,2)+'／本';
 case 'rsi':return 'RSI '+analysisNumber(i.rsi);
 case 'stoch':return 'K '+analysisNumber(i.stochK)+' / D '+analysisNumber(i.stochD);
 case 'roc20':return '20本騰落 '+analysisPct(t.m20);
 case 'cci':return 'CCI '+analysisNumber(i.cci,0);
 case 'williams':return '%R '+analysisNumber(i.williams);
 case 'volume_ratio':return '出来高 '+analysisNumber(t.volumeRatio,2)+'倍';
 case 'obv':return '20本の差 '+analysisPct(i.obv20);
 case 'mfi':return 'MFI '+analysisNumber(i.mfi);
 case 'vwap':return '出来高加重平均から '+gap(i.vwap20);
 case 'bollinger':return '帯の位置 %B '+analysisNumber(i.bollPctB,2);
 case 'donchian':return s.state==='bull'?'直前20本の高値より上':s.state==='bear'?'直前20本の安値より下':'直前20本の高安の範囲内';
 case 'range_position':return sup.resistance20>sup.support20?'安値から '+analysisNumber((t.price-sup.support20)/(sup.resistance20-sup.support20)*100)+'%の位置':'高安差なし';
 case 'candle':return s.observed.split('。')[0];
 case 'double':return s.observed;
 case 'support_resistance':return (t.price-sup.support20)/t.price<.025?'20本の安値付近':(sup.resistance20-t.price)/t.price<.025?'20本の高値付近':'価格帯の中ほど';
 default:return s.observed;
 }
}
function compactDirection(s){return `<span class="ra-direction ${esc(s)}">${s==='bull'?'上向き':s==='bear'?'下向き':'保留'}</span>`;}
function indicatorEvidenceHtml(s,prefix=''){return `<dl class="ca-facts"><dt>今の数値・形</dt><dd class="ca-observed">${esc(s.observed)}</dd><dt>今回の判定理由</dt><dd>${esc(s.reason)}</dd><dt>指標の意味</dt><dd>${esc(s.meaning)}</dd></dl><details class="ra-indicator-rule" data-explain-id="${prefix}rule-${esc(s.key)}"><summary>判定ルール・次に見ること</summary><dl class="ca-facts"><dt>このアプリの判定ルール</dt><dd>${esc(s.rule)}</dd><dt>次に確認する変化</dt><dd>${esc(s.next)}</dd></dl></details>`;}
function compactTechnicalPanel(t){
 const x=TechnicalExplain.build(t,{currency:state.history?.stock?.currency||'JPY',bars:state.candles||[]});if(!x)return '<section class="readable-analysis compact-analysis" id="technical-lab"><h2>値動きの根拠</h2><p>必要な株価がそろうと表示します。</p></section>';
 const i=t.indicators||{},sup=t.support||{},unit=state.interval==='1wk'?'週足':'日足',forecastReady=currentForecast().ready,gap=v=>Number.isFinite(v)&&t.price>0?analysisPct((v/t.price-1)*100):'未算出';
 const indicator=s=>`<details class="ra-indicator ca-indicator" data-indicator="${esc(s.key)}" data-explain-id="indicator-${esc(s.key)}"><summary><strong>${esc(s.name)}</strong>${compactDirection(s.state)}<span class="ca-signal-value">${esc(compactSignalValue(t,s))}</span></summary><div class="ca-disclosure-body">${indicatorEvidenceHtml(s)}</div></details>`;
 const group=g=>`<details class="ra-category ca-category" id="explain-${esc(g.key)}" data-explain-id="category-${esc(g.key)}"><summary><span><strong>${esc(g.name)}</strong><span class="ra-category-count">上${g.bull}・下${g.bear}・保留${g.neutral}</span></span><span class="ra-category-score">${g.score}<small>／100点</small></span></summary><div class="ra-category-body"><details class="ca-help" data-explain-id="group-help-${esc(g.key)}"><summary>グループの意味・配分 ${Math.round(g.weight*100)}%</summary><p>${esc(g.meaning)}</p><p>全体への配分は${Math.round(g.weight*100)}%。${g.score>50?'値動き評価を上げる側':g.score<50?'値動き評価を下げる側':'50点の基準と同じ'}に働いています。</p></details>${g.signals.map(indicator).join('')}</div></details>`;
 return `<section class="tech-lab readable-analysis compact-analysis" id="technical-lab"><header class="ra-heading"><h2>${esc(x.headline)}</h2><div class="ca-scorebar"><div class="ra-score"><span>評価</span><strong>${x.score}<small>／100点</small></strong></div>${analysisFontControls()}</div><div class="ca-counts" aria-label="指標の内訳"><span class="up">上向き ${t.bull}</span><span class="down">下向き ${t.bear}</span><span>保留 ${t.neutral}</span></div><div class="ca-meta">${t.total}指標・${unit} ${esc(t.dataAsOf||'未取得')}・終値 ${analysisPrice(t.price)}</div></header><section class="ra-drivers ca-drivers"><h3>主な理由</h3>${x.drivers.map(g=>`<details class="ca-driver" data-explain-id="driver-${esc(g.key)}"><summary><strong>${esc(g.name)}</strong><span class="${g.contribution>=0?'up':'down'}">${g.contribution>0?'+':''}${analysisNumber(g.contribution)}点分</span><span class="ca-signal-value">${g.evidence?esc(compactSignalValue(t,g.evidence)):g.score+'点'}</span></summary><div class="ca-disclosure-body"><p class="ca-meta">グループ ${g.score}点 × 配分 ${Math.round(g.weight*100)}%。影響は50点を基準に表示。</p>${g.evidence?indicatorEvidenceHtml(g.evidence,'driver-'):''}<p>${esc(g.meaning)}</p><button class="ra-text-button" data-ui-jump="explain-${esc(g.key)}">このグループの全指標 →</button></div></details>`).join('')}</section>${x.contradiction?`<details class="ca-help ra-contradiction" id="score-contrast" data-explain-id="score-contrast"><summary>足の形と全体評価が違う理由</summary><p>${esc(x.contradiction)}</p></details>`:''}<section class="ra-levels ca-levels"><h3>目安の価格・値幅</h3><details data-explain-id="level-low"><summary><span>20本安値</span><strong>${analysisPrice(sup.support20)}</strong><span>${gap(sup.support20)}</span></summary><p>今の終値から ${gap(sup.support20)}。この近辺で止まるか、終値で下回るかを見るための目安です。</p></details><details data-explain-id="level-high"><summary><span>20本高値</span><strong>${analysisPrice(sup.resistance20)}</strong><span>${gap(sup.resistance20)}</span></summary><p>今の終値から ${gap(sup.resistance20)}。近づいた後に戻るか、終値で上回るかを見るための目安です。</p></details><details data-explain-id="level-atr"><summary><span>平均値幅</span><strong>${analysisPrice(i.atr)}</strong><span>${analysisNumber(i.atrPct,2)}%</span></summary><p>ATR14：高値・安値と前の終値から求めた、直近14本の平均的な変動幅です。明日の上限・下限を示しているわけではありません。</p></details><details class="ca-help" data-explain-id="level-help"><summary>価格の目安の見方</summary><p>過去の高値・安値で必ず反転するわけではありません。新しい${unit}が加わると、目安の価格も変わります。</p></details></section><section class="ra-groups"><h3>全${t.total}指標</h3><div class="ca-meta">グループ → 指標を選ぶと詳細を表示</div>${x.groups.map(group).join('')}</section><details class="ra-score-method ca-help" data-explain-id="score-method"><summary>評価の読み方・${x.score}点の計算内訳</summary><p>${esc(x.summary)}</p><p>各指標は上向き100・下向き0・中立50として、指標ごとの重みでグループ内の点数を計算します。その後、次の配分でグループをまとめます。</p><ul>${x.groups.map(g=>`<li>${esc(g.name)}：${g.score}点 × ${Math.round(g.weight*100)}%</li>`).join('')}</ul><p>合計を丸めた値は${x.preRiskScore}点。${x.adjustments.length?x.adjustments.map(a=>esc(a.label)+' '+a.points+'点').join('、'):'過熱・変動による追加の減点はありません。'} 最後に0〜100点に収め、${x.score}点になります。</p><p>似た指標を単純に24票として数えません。本数が足りない指標は除外し、使えるグループ間で配分を調整します。数値は読みやすく丸めて表示し、判定には丸める前の値を使います。期間の「本」は${unit}の本数です。</p></details><details class="ra-distinction ca-help" data-explain-id="score-forecast-difference"><summary>評価点と予想線の割合の違い</summary><p>この点数は今の値動きの整理です。上昇確率を表すものではありません。予想線の割合は、過去の似た局面を集計して計算します。</p><button class="btn" data-ui-jump="${forecastReady?'stock-forecast-explanation':'stock-forecast'}">予想線の計算根拠 →</button></details></section>`;
}
function compactForecastEvidenceHtml(f){
 if(!f.ready||!f.inputs||!Array.isArray(f.analogues))return '';
 const input=f.inputs;
 return `<section class="ra-forecast-explanation ca-forecast-explanation"><h3>予想の比較条件</h3><dl class="ca-metrics"><div><dt>20本騰落</dt><dd>${analysisPct(input.return20Pct)}</dd></div><div><dt>60本平均から</dt><dd>${analysisPct(input.deviation60Pct)}</dd></div><div><dt>RSI14</dt><dd>${analysisNumber(input.rsi14)}</dd></div></dl><div class="ca-meta">類似${f.samples}期間・振れ幅を調整して集計</div><details class="ca-help" data-explain-id="forecast-condition-help"><summary>比較条件の説明</summary>${forecastConditionMeaningHtml(f)}${forecastDistinctionHtml(f)}</details>${forecastMethodHtml(f)}</section>`;
}
function compactForecastPanel(){
 const f=currentForecast(),percentage=v=>analysisNumber(v*100,Number.isInteger(v*100)?0:1)+'%';
 return `<section class="forecast-panel readable-forecast compact-forecast" data-forecast-panel><div class="forecast-title"><h2>値動きの3シナリオ</h2><label><span class="sr-only">何日足先を見る？</span><select data-forecast-horizon aria-label="何日足先を見る？">${[5,20,60].map(n=>`<option value="${n}" ${(state.forecastHorizon||20)===n?'selected':''}>${n}本の日足先</option>`).join('')}</select></label></div><div class="ca-forecast-toolbar">${analysisFontControls()}${state.interval==='1d'?`<span class="ca-meta" data-forecast-bars>分析用の日足 ${state.candles?.length||0}本${workspace.getRecord(state.ticker)?.provenance?.history_range==='10y'?' · 最大10年の取得可能な履歴':''}</span>`:''}</div>${f.ready?`<div class="forecast-cards">${f.scenarios.map(s=>`<div style="--scenario:${s.color}"><strong>${esc(s.label)}</strong><b>${percentage(s.probability)}</b><span>${s.count}/${f.samples}例</span></div>`).join('')}</div><div class="ca-meta">過去の類似例からの参考割合（振れ幅調整後）</div>${compactForecastEvidenceHtml(f)}<details class="ca-help" data-explain-id="forecast-endpoints"><summary>線の終点・分類の価格帯</summary><dl class="ca-metrics">${f.scenarios.map(s=>`<div><dt>${esc(s.label)}の線の終点</dt><dd>${s.path.length?analysisPrice(s.path.at(-1)):'該当例なし・線は非表示'}</dd></div>`).join('')}</dl><p>終点は中央値です。基準日 ${esc(f.asOf)}・類似${f.samples}期間・横ばいの範囲は約±${analysisNumber(f.threshold*100)}%。点線は同じ分類の過去パスの代表線です。当日分は途中値の場合があり、日足確定前は参考値です。</p></details>${forecastUncertaintyHtml(f)}`:forecastMissing(f)}</section>`;
}
