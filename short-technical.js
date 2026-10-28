/* Completed-bar technical evidence; supplements SHORT EDGE without double-counting its score. */
(function(root){'use strict';
const node=typeof module!=='undefined'&&module.exports;
const I=node?require('./short-indicators'):root.ShortIndicators;
const O=node?require('./chart-overlays'):root.ChartOverlays;
const finite=Number.isFinite,mean=I.mean;
const number=(v,d=1)=>finite(v)?v.toFixed(d):'—';
const price=v=>finite(v)?'¥'+new Intl.NumberFormat('ja-JP',{maximumFractionDigits:2}).format(v):'—';

function directional(rows,period=14){
 if(rows.length<period*2)return {adx:null,plus:null,minus:null};
 let tr=0,plusDM=0,minusDM=0,adx=null,dxs=[],plus=0,minus=0;
 for(let i=1;i<rows.length;i++){
  const a=rows[i-1],b=rows[i],up=b.high-a.high,down=a.low-b.low;
  const nextTR=Math.max(b.high-b.low,Math.abs(b.high-a.close),Math.abs(b.low-a.close));
  const pd=up>down&&up>0?up:0,md=down>up&&down>0?down:0;
  if(i<=period){tr+=nextTR;plusDM+=pd;minusDM+=md;}
  else{tr=tr-tr/period+nextTR;plusDM=plusDM-plusDM/period+pd;minusDM=minusDM-minusDM/period+md;}
  if(i<period)continue;
  plus=tr?100*plusDM/tr:0;minus=tr?100*minusDM/tr:0;
  const dx=plus+minus?100*Math.abs(plus-minus)/(plus+minus):0;
  if(adx===null){dxs.push(dx);if(dxs.length===period)adx=mean(dxs);}
  else adx=(adx*(period-1)+dx)/period;
 }
 return {adx,plus,minus};
}
function moneyFlow(rows,period=14){
 if(rows.length<period+1)return null;let positive=0,negative=0;
 for(let i=rows.length-period;i<rows.length;i++){
  const a=rows[i-1],b=rows[i],previous=(a.high+a.low+a.close)/3,tp=(b.high+b.low+b.close)/3;
  if(tp>previous)positive+=tp*b.volume;else if(tp<previous)negative+=tp*b.volume;
 }
 if(!rows.slice(-period).some(r=>r.volume>0))return null;
 return positive+negative?100*positive/(positive+negative):50;
}
function stochastic(rows,period=9){
 if(rows.length<period+2)return {k:null,d:null};const values=[];
 for(let i=rows.length-3;i<rows.length;i++){
  const a=rows.slice(i-period+1,i+1),lo=Math.min(...a.map(r=>r.low)),hi=Math.max(...a.map(r=>r.high));
  values.push(hi===lo?50:100*(rows[i].close-lo)/(hi-lo));
 }
 return {k:values.at(-1),d:mean(values)};
}
function cci(rows,period=14){
 if(rows.length<period)return null;
 const a=rows.slice(-period).map(r=>(r.high+r.low+r.close)/3),m=mean(a),deviation=mean(a.map(v=>Math.abs(v-m)));
 return deviation?(a.at(-1)-m)/(.015*deviation):0;
}
function obv(rows,period=10){
 if(rows.length<period+1)return null;let delta=0,volume=0;
 for(let i=rows.length-period;i<rows.length;i++){const a=rows[i-1],b=rows[i];delta+=Math.sign(b.close-a.close)*b.volume;volume+=b.volume;}
 return volume?100*delta/volume:null;
}
function patternRules(interval){return interval==='1d'?{}:{minDepthPct:interval==='60m'?.005:interval==='15m'?.003:.002,priorMovePct:.002,matchPct:.003,maxMatchPct:.015};}
function analyze(record,short){
 const rows=short.quality.completed,n=rows.length,index=n-1,last=rows.at(-1),previous=rows.at(-2),start=Math.max(0,record.rows.length-100);
 const empty={ready:false,signals:[],counts:{bull:0,bear:0,neutral:0,caution:0,unavailable:0},overlays:{series:[],levels:[],trends:[],patterns:[]},patterns:[],asOf:last?.time||null};
 if(!short.ready||!last||n<40)return empty;
 const overlays=O.build(rows,{count:Math.max(1,n-start),options:{patterns:true,bothPatterns:true,trend:true,levels:true,sma20:false,sma50:false,bands:true},patternRules:patternRules(record.interval)});
 for(const t of overlays.trends)t.endIndex=n-1;
 const patterns=overlays.patterns.map(p=>{
  const average=p.breakout===null?0:mean(rows.slice(Math.max(0,p.breakout-20),p.breakout).map(r=>r.volume));
  const volumeRatio=average?rows[p.breakout].volume/average:null;
  return {...p,volumeRatio,volumeConfirmed:finite(volumeRatio)&&volumeRatio>=1.5};
 });
 const indicators=short.chart,ema9=indicators.ema9[index],ema21=indicators.ema21[index],vwap=indicators.vwap[index],rsi=indicators.rsi[index],hist=indicators.histogram[index],priorHist=indicators.histogram[index-1],atr=indicators.atr[index];
 const a=rows.slice(-20).map(r=>r.close),middle=mean(a),sd=Math.sqrt(mean(a.map(v=>(v-middle)**2))),upper=middle+2*sd,lower=middle-2*sd;
 const dmi=directional(rows),stoch=stochastic(rows),flow=moneyFlow(rows),commodity=cci(rows),obv10=obv(rows),atrPct=atr/last.close*100;
 const signals=[];
 const add=(key,name,group,state,value,reason,watch,rule)=>signals.push({key,name,group,state,value,reason,watch,rule});
 const trendState=/上昇/.test(short.trend)?'bull':/下降/.test(short.trend)?'bear':'neutral';
 add('ema','EMA9・21','trend',trendState,short.trend,
  `EMA9 ${price(ema9)} / EMA21 ${price(ema21)}。傾き・高安値・VWAPとの位置を合わせて判定。`,
  'EMA21付近で止まるか、終値で割れて下向きへ変わるかを確認。','9本・21本の指数移動平均。');
 add('vwap','VWAP','trend',vwap===null?'unavailable':short.vwapDev>1.5?'caution':last.close>vwap?'bull':last.close<vwap?'bear':'neutral',
  vwap===null?'対象外／出来高なし':`${price(vwap)} · 乖離 ${number(short.vwapDev,2)}%`,
  vwap===null?'日足では当日VWAPを判定しません。出来高なしでも計算しません。':'当日の平均約定価格に対して、現在の終値が上か下かを確認。',
  '回復・割れは出来高を伴って定着するかを見る。価格が触れただけでは反発確認にしません。','営業日ごとにリセットしたHLC3×出来高の加重平均。');
 add('adx','ADX・DMI','trend',dmi.adx===null?'unavailable':dmi.adx<20?'neutral':dmi.plus>dmi.minus?'bull':'bear',
  `ADX ${number(dmi.adx)} · +DI ${number(dmi.plus)} / −DI ${number(dmi.minus)}`,
  'ADXは流れの強さ、+DIと−DIの大小は方向。ADXが高くても上昇とは限りません。',
  '20未満は方向感が弱い目安。20以上でDIの優劣と価格の動きがそろうか確認。','14本・Wilder平滑化。');
 add('rsi','RSI','momentum',rsi>=80?'caution':rsi<35?'bear':rsi>=45&&rsi<=70?'bull':'neutral',
  number(rsi),rsi>=80?'上昇が続いていますが、過熱として扱い加点を抑えています。':rsi<35?'弱い勢い。低い値だけでは反発したと判定しません。':'中間帯の推移を、価格の方向と照らし合わせます。',
  '過熱が落ち着くか、価格が支持線を維持するかを確認。',`${short.params.rsi}本・Wilder方式。`);
 add('macd','MACD','momentum',hist>0?'bull':hist<0?'bear':'neutral',
  `ヒストグラム ${number(hist,3)} · ${hist>priorHist?'前足より増加':hist<priorHist?'前足より減少':'横ばい'}`,
  'MACDとシグナルの差。プラスでも差が縮むと勢いが鈍化している可能性。',
  'ゼロをまたぐ変化と、差の拡大・縮小が価格の上抜けを伴うか確認。',`EMA ${short.params.macd.join(' / ')}本。`);
 add('stoch','ストキャスティクス','momentum',stoch.k>=80?'caution':stoch.k<=20?'bear':stoch.k>stoch.d?'bull':'neutral',
  `%K ${number(stoch.k)} / %D ${number(stoch.d)}`,
  '直近9本の高安値の中で終値がどの位置にあるか。高値圏を買い推奨と解釈しません。',
  '安値圏でKがDを上回っても、価格と出来高の反発確認を待ちます。','%K 9本・%D 3本平均。');
 add('cci','CCI','momentum',commodity>200?'caution':commodity<-100?'bear':commodity>100?'bull':'neutral',
  number(commodity),'典型価格が直近平均からどれだけ離れたかを、平均偏差で測定。',
  '±100の外に定着するか、急な上方乖離が戻るか確認。','14本、(HLC3−平均)/(0.015×平均偏差)。');
 add('bands','ボリンジャーバンド','momentum',last.close>upper?'caution':last.close<lower?'bear':last.close>middle?'bull':last.close<middle?'bear':'neutral',
  `下 ${price(lower)} / 上 ${price(upper)}`,
  '20本平均と±2σ。上限を超えた価格は強さと過熱の両面を持ちます。',
  '帯の外へ出ただけで売買を決めず、出来高・トレンドと照合。','20本の単純平均・母標準偏差。');
 add('volume','出来高倍率','volume',short.ratio===0?'unavailable':short.ratio<.8?'caution':short.ratio>=1.5&&last.close>last.open?'bull':short.ratio>=1.5&&last.close<last.open?'bear':'neutral',
  `${number(short.ratio,2)}倍`,short.parts.volume.text,
  '上抜け時に1.5倍以上を伴うか、調整時に減って反発時に戻るか確認。','直前20本の平均と最新確定足を比較。');
 add('mfi','MFI','volume',flow===null?'unavailable':flow>80?'caution':flow<40?'bear':flow>=55?'bull':'neutral',
  number(flow),'価格変化に出来高を組み合わせた勢い。実際の資金流入額ではありません。',
  '価格だけが高値を更新し、MFIが弱まっていないかを監視。','14本。典型価格が同じ足は正負のフローへ加算しません。');
 add('obv','OBVの傾き','volume',obv10===null?'unavailable':obv10>10?'bull':obv10<-10?'bear':'neutral',
  obv10===null?'出来高なし':`${number(obv10)}%`,
  '上昇終値の出来高を加え、下落終値を引いた10本の差を出来高合計で割った値。',
  '価格の高値・安値更新と、出来高の方向が一致するかを確認。','10本のOBV差÷出来高合計。終値不変は加減なし。');
 const breakout=short.events.filter(e=>/レンジ/.test(e.label));
 add('range','支持・抵抗／レンジ','setup',breakout.some(e=>e.confirmed&&/上抜け/.test(e.label))?'bull':breakout.some(e=>/下抜け/.test(e.label))?'bear':'neutral',
  `支持 ${price(short.levels.rangeLow)} / 抵抗 ${price(short.levels.rangeHigh)}`,
  breakout.length?breakout.map(e=>e.label+(e.confirmed?'・出来高確認':'・出来高未確認')).join(' / '):'最新足を除く20本の高安値。レンジの内側では抜け待ち。',
  '終値で水準を超え、出来高1.5倍以上を伴うか確認。','直前20本の高値・安値。');
 const patternState=patterns.some(p=>p.kind==='M')?'caution':patterns.some(p=>p.kind==='W'&&p.status==='breakout'&&p.volumeConfirmed)?'bull':'neutral';
 add('patterns','W・M／トレンドライン','setup',patternState,
  patterns.length?patterns.map(p=>p.name+' '+(p.status==='breakout'?(p.kind==='W'?'価格上抜け':'価格下抜け'):p.status==='retest'?'抜け後の戻り':'候補')).join(' / '):'W・M：該当なし',
  patterns.length?'確定した山谷だけを接続。価格の抜けと出来高の確認を分けて表示。':'条件に合うW・Mがなければ描画しません。トレンドラインも確定した山谷が必要です。',
  'ネックラインの維持・出来高・撤回価格を照合。複数日にまたがる形は寄付きの窓にも注意。','山谷は後続3本で確定。短期の値幅とATRを併用し、日足の3%条件は流用しません。');
 const body=Math.abs(last.close-last.open),span=last.high-last.low,lowerWick=Math.min(last.open,last.close)-last.low,upperWick=last.high-Math.max(last.open,last.close);
 const bullEngulf=previous.close<previous.open&&last.close>last.open&&last.open<=previous.close&&last.close>=previous.open&&body>atr*.2;
 const bearEngulf=previous.close>previous.open&&last.close<last.open&&last.open>=previous.close&&last.close<=previous.open&&body>atr*.2;
 const hammer=span>atr*.5&&lowerWick>Math.max(body*2,span*.5)&&upperWick<span*.25;
 add('candle','ローソク足の形','setup',bullEngulf?'bull':bearEngulf?'bear':'neutral',
  bullEngulf?'陽線の包み足':bearEngulf?'陰線の包み足':hammer?'長い下ヒゲの候補':'目立つ反転形なし',
  '確定した直近2本の実体・ヒゲを比較。1本の形だけでは反転を確定しません。',
  '次の足が高値を超えるか、安値を割るかを出来高と一緒に確認。','包み足は実体が前足を覆いATRの0.2倍超。下ヒゲは全値幅の半分超。');
 const riskLimit=({'5m':.6,'15m':1,'60m':2,'1d':4})[record.interval];
 add('atr','ATR／値動きの大きさ','risk',atrPct>riskLimit?'caution':'neutral',
  `${price(atr)} · ${number(atrPct,2)}%`,
  '1本の平均的な値幅。将来の最大損失を示す値ではありません。',
  '撤回ラインまでの距離と照らし、値動きに対して近すぎないか確認。','14本の平滑化したTrue Range。');
 const counts={...empty.counts};for(const s of signals)counts[s.state]++;
 return {...empty,ready:true,signals,counts,overlays,patterns,asOf:last.time,values:{dmi,stoch,mfi:flow,cci:commodity,obv10,bands:{middle,upper,lower},atrPct}};
}
const api={analyze,directional,moneyFlow,stochastic,cci,obv,patternRules};if(node)module.exports=api;else root.ShortTechnical=api;
})(typeof globalThis!=='undefined'?globalThis:this);
