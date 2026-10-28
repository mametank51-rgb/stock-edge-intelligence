/* Lightweight interpretation of existing observations. No indicators, requests or score mutations. */
(function(root){'use strict';
const finite=Number.isFinite;
const clamp=v=>Math.max(0,Math.min(100,finite(v)?v:0));
const n=(v,d=1)=>finite(v)?v.toFixed(d):'未確認';
const percent=v=>finite(v)?(v>0?'+':'')+n(v)+'%':'未確認';
const price=v=>finite(v)?'¥'+new Intl.NumberFormat('ja-JP',{maximumFractionDigits:2}).format(v):'未確認';
const VERSION='proverbs-v1';
const ranks={red:{icon:'🔴',label:'強い警戒',priority:500},orange:{icon:'🟠',label:'注意',priority:400},rainbow:{icon:'🌈',label:'好条件集中',priority:300},green:{icon:'🟢',label:'良好',priority:200},blue:{icon:'🔵',label:'様子見',priority:100},pending:{icon:'⚪',label:'判定保留',priority:0}};
const catalog=[
 {id:'trend_friend',title:'トレンド・イズ・フレンド'},
 {id:'no_pullback',title:'押し目待ちに押し目なし'},
 {id:'contrarian_flower',title:'人の行く裏に道あり花の山'},
 {id:'rest_market',title:'休むも相場'},
 {id:'leave_extremes',title:'頭と尻尾はくれてやれ'},
 {id:'listen_market',title:'相場は相場に聞け'},
 {id:'high_mountain',title:'山高ければ谷深し'},
 {id:'take_profit',title:'利食い千人力'},
 {id:'falling_knife',title:'落ちるナイフを掴むな'},
 {id:'cut_loss',title:'見切り千両'}
];
function age(day,now){const t=typeof day==='string'?Date.parse(day):NaN;return finite(t)&&t<=now?(now-t)/86400000:Infinity;}
function pending(reason,scope){return {id:'pending',title:'判定保留',rank:'pending',score:null,summary:'格言判定に必要なデータがまだ不足しています。',reasons:[reason],watch:['表示中の時間足の株価・分析データを確認する','取得済みデータの基準日を確認する'],notes:['格言は市場状態を説明する補助表示です。'],scope,confidence:0,ruleStrength:0,priority:0,candidates:[],version:VERSION};}
function evaluate(input={}){
 input=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
 const f=input.features||{},now=finite(input.now)?input.now:Date.now(),scope=input.scope||'日足',interval=input.interval||'1d',daily=interval==='1d',intraday=['5m','15m','60m'].includes(interval),unit=daily?'日':interval==='1wk'?'週':'本';
 const ema=input.maKind==='ema'||intraday,fastLabel=ema?'EMA9':'SMA20',slowLabel=ema?'EMA21':'SMA50';
 const core=['price','tech','maFast','rsi','macd','ret5','ret20','volumeRatio','atrPct','rangeLow','rangeHigh','maSlow'];
 const known=core.filter(k=>finite(f[k])).length,coverage=known/core.length,priceAge=age(input.priceDate,now),financialAge=age(input.financialDate,now);
 if(input.synthetic)return pending('サンプル価格は実銘柄の格言判定に使用しません。',scope);
 if(input.fresh===false||priceAge>7||!finite(priceAge))return pending('株価が古い、または基準日を確認できません。',scope);
 if(!finite(f.price)||f.price<=0||!finite(f.tech)||f.tech<0||f.tech>100||!finite(f.maFast)||f.maFast<=0||['maSlow','maLong'].some(k=>finite(f[k])&&f[k]<=0)||!finite(f.rsi)||f.rsi<0||f.rsi>100||known<8||finite(input.bars)&&input.bars<40)return pending('移動平均・勢い・価格帯などの分析値が不足しています。',scope);
 const dev=(f.price/f.maFast-1)*100;
 const up=finite(f.maSlow)&&f.maFast>f.maSlow&&f.price>f.maFast;
 const down=finite(f.maSlow)&&f.maFast<f.maSlow&&f.price<f.maFast;
 const longIntact=finite(f.maLong)&&f.price>=f.maLong*.97;
 const proximity=intraday?Math.max(.001,Math.min(.005,finite(f.atrPct)?f.atrPct/100*1.5:.002)):.02;
 const nearHigh=finite(f.rangeHigh)&&f.rangeHigh>0&&f.price>=f.rangeHigh*(1-proximity);
 const nearSupport=finite(f.rangeLow)&&f.rangeLow>0&&Math.abs(f.price/f.rangeLow-1)<=proximity;
 const newLow=finite(f.rangeLow)&&f.rangeLow>0&&f.price<f.rangeLow;
 const macdWorse=finite(f.macdDelta)?f.macdDelta<0:finite(f.macd)&&f.macd<0;
 const momentumGood=finite(f.macd)&&f.macd>=0&&(!finite(f.macdDelta)||f.macdDelta>=0);
 const threshold=intraday?{drop5:-1.2,drop1:-.8,underMA:-.6,wideATR:.8,surge20:2,stretch:1.2,profit:1.5}:{drop5:-8,drop1:-5,underMA:-5,wideATR:5,surge20:20,stretch:8,profit:15};
 const shock=finite(f.ret5)&&f.ret5<=threshold.drop5||finite(f.change)&&f.change<=threshold.drop1;
 const knifeEvidence=[
  [shock,`急な下落：5${unit} ${percent(f.ret5)} / 直近1${unit} ${percent(f.change)}`],
  [newLow,`直前20${unit}の安値 ${price(f.rangeLow)} を終値 ${price(f.price)} が下回る`],
  [dev<=threshold.underMA,`移動平均を ${percent(dev)} 下回る`],
  [f.rsi<=30,`RSI ${n(f.rsi)}`],
  [macdWorse,`MACD ${n(f.macd,3)}${finite(f.macdDelta)?' / 前足との差 '+n(f.macdDelta,3):'（マイナス）'}`],
  [finite(f.atrPct)&&f.atrPct>=threshold.wideATR,`平均値幅（ATR） ${percent(f.atrPct)}`]
 ];
 const knifeCount=knifeEvidence.filter(x=>x[0]).length;
 const hotEvidence=[
  [finite(f.ret20)&&f.ret20>=threshold.surge20,`20${unit}騰落 ${percent(f.ret20)}`],
  [f.rsi>=75,`RSI ${n(f.rsi)}で高水準`],
  [finite(f.bollPct)&&f.bollPct>=.95,`ボリンジャー上側の位置 ${n(f.bollPct*100)}%`],
  [dev>=threshold.stretch,`移動平均から ${percent(dev)} 上方乖離`],
  [nearHigh,`直近高値 ${price(f.rangeHigh)} の近く`]
 ];
 const heatCount=hotEvidence.filter(x=>x[0]).length,heat=heatCount>=3&&(f.rsi>=75||dev>=threshold.stretch);
 const broken=down&&newLow&&macdWorse;
 const severeRisk=shock&&newLow&&knifeCount>=4||broken&&dev<=threshold.underMA;
 const fundGood=finite(f.fund)&&f.fund>=65&&f.fund<=100&&finite(input.fundCoverage)&&input.fundCoverage>=.75&&input.fundCoverage<=1&&financialAge<=550;
 const candidates=[];
 function add(id,rank,score,summary,reasons,watch,{confidence=coverage,strength=1,notes=[]}={}){
  reasons=reasons.filter(Boolean);const confidenceValue=Math.max(0,Math.min(1,confidence)),ruleStrength=Math.max(0,Math.min(1,strength));
  if(rank==='red'&&(confidenceValue<.75||ruleStrength<.75||reasons.length<3))return;
  const title=catalog.find(x=>x.id===id)?.title||id;
  candidates.push({id,title,rank,score:Math.round(clamp(score)),summary,reasons,watch,notes:[...notes,'該当度は条件の一致の目安で、勝率ではありません。売買の指示ではありません。'],scope,confidence:confidenceValue,ruleStrength,priority:ranks[rank].priority+Math.round(99*confidenceValue*ruleStrength),version:VERSION});
 }
 const matched=a=>a.filter(x=>x[0]).map(x=>x[1]);
 if(shock&&newLow&&knifeCount>=4)add('falling_knife','red',60+knifeCount*6,'急落と安値更新が重なっています。下げ止まり確認前の逆張りに注意が必要な状態です。',matched(knifeEvidence),['安値更新が止まる','終値が移動平均へ戻る','RSIが30台へ回復し価格も持ち直す'],{strength:.95+Math.min(.05,(knifeCount-4)*.025)});
 const weakTrend=down&&macdWorse&&(f.tech<=35||dev<=threshold.underMA/2)&&finite(f.ret5)&&f.ret5<0;
 if(broken||weakTrend)add('cut_loss',broken&&dev<=threshold.underMA?'red':'orange',72+Math.min(20,Math.abs(dev)*2),broken?'支持線割れと下向きの流れが重なっています。従来の前提が保たれているか確認したい状態です。':'移動平均と勢いが下向きで重なっています。従来の前提が保たれているか確認したい状態です。',[
  `移動平均が逆配列：${price(f.maFast)} < ${price(f.maSlow)}`,newLow?`直前20${unit}安値 ${price(f.rangeLow)} を下回る`:`支持線 ${price(f.rangeLow)} と現在値 ${price(f.price)} の位置を確認`,`MACD ${n(f.macd,3)}${finite(f.macdDelta)?' / 前足との差 '+n(f.macdDelta,3):''}`,`移動平均との乖離 ${percent(dev)}`
 ],['支持線を終値で回復するか','安値・高値の切り下げが止まるか','MACDの悪化が落ち着くか'],{strength:.9});
 if(heat)add('high_mountain','orange',56+heatCount*8,'上昇幅と過熱サインが重なっています。強さを追いかける前に、調整した場合の値幅を確認したい状態です。',matched(hotEvidence),['RSIや移動平均乖離が落ち着く','高値更新に出来高が伴う','押し戻されても支持線を維持する'],{strength:heatCount/5});
 const slowing=finite(f.macdDelta)&&f.macdDelta<0||finite(f.ret5)&&f.ret5<=(intraday?.2:1)||finite(f.momentum)&&finite(f.trend)&&f.momentum+20<f.trend;
 if(finite(f.ret20)&&f.ret20>=threshold.profit&&nearHigh&&slowing)add('take_profit','orange',80,'大きく上昇した後、高値圏で勢いに鈍化が見られます。保有の前提と利益の守り方を点検する局面です。',[
  `20${unit}騰落 ${percent(f.ret20)}`,`高値 ${price(f.rangeHigh)} の近く`,finite(f.macdDelta)&&f.macdDelta<0?'MACDヒストグラムが前足より低下':`直近5${unit} ${percent(f.ret5)} / 勢いの評価 ${n(f.momentum,0)}`
 ],['高値更新が続くか','MACDの差が再び拡大するか','撤回ラインと許容する値幅を点検する'],{strength:.85});
 const disagreement=finite(f.fund)&&financialAge<=550&&input.fundCoverage>=.5&&Math.abs(f.tech-f.fund)>=30;
 const voiceConflict=input.voiceReliable===true&&finite(f.voice)&&(up&&f.voice<=35||down&&f.voice>=65);
 const forecastConflict=input.forecastReliable===true&&finite(f.forecastUp)&&finite(f.forecastDown)&&(up&&f.forecastDown-f.forecastUp>=.2||down&&f.forecastUp-f.forecastDown>=.2);
 if(disagreement||voiceConflict||forecastConflict)add('listen_market','blue',82,'分析軸によって見方が分かれています。一つの予想だけで決めず、実際の価格がどの条件を維持するかを確認したい状態です。',[
  disagreement?`テクニカル ${n(f.tech,0)} / 財務 ${n(f.fund,0)} と評価が乖離`:null,
  voiceConflict?`価格は${up?'上向き':'下向き'}、市場の声 ${n(f.voice,0)} は反対方向`:null,
  forecastConflict?'参考シナリオの比率と現在のトレンドが反対方向':null
 ],['価格と出来高の方向がそろうか','財務の対象期と記事の根拠を確認する','参考シナリオの前提が変化していないか'],{strength:1});
 // Seven explicit agreements are mandatory. Missing observations never count as agreement.
 const rainbowAxes=[
  ['テクニカル',finite(f.tech)&&f.tech>=80],
  ['財務',fundGood&&f.fund>=70&&input.fundCoverage>=.9&&financialAge<=400&&input.fundWarnings===0],
  ['中期トレンド',up&&finite(f.maLong)&&f.maSlow>f.maLong],
  ['勢い',f.rsi>=55&&f.rsi<=68&&finite(f.macd)&&f.macd>=0&&finite(f.macdDelta)&&f.macdDelta>=0&&finite(f.ret5)&&f.ret5>=0&&f.ret5<=8],
  ['出来高',finite(f.volumeRatio)&&f.volumeRatio>=.9&&f.volumeRatio<=2],
  ['リスク',!heat&&!severeRisk&&!broken&&!shock&&dev>=0&&dev<=6&&finite(f.atrPct)&&f.atrPct>=0&&f.atrPct<3&&finite(f.ret20)&&f.ret20>=0&&f.ret20<18&&finite(f.change)&&Math.abs(f.change)<4&&finite(f.bollPct)&&f.bollPct<=1],
  ['鮮度・充足度',daily&&!ema&&priceAge<=3&&finite(input.bars)&&input.bars>=100&&coverage>=.9]
 ];
 const rainbow=rainbowAxes.every(x=>x[1])&&!disagreement&&!voiceConflict&&!forecastConflict;
 if(rainbow)add('trend_friend','rainbow',96,'価格・財務・勢い・出来高・鮮度の複数条件が同時に確認されています。',[
  `テクニカル ${n(f.tech,0)} / 財務 ${n(f.fund,0)} / 財務充足度 ${n(input.fundCoverage*100,0)}%`,
  `価格 ${price(f.price)} > SMA20 ${price(f.maFast)} > SMA50 ${price(f.maSlow)} > SMA100 ${price(f.maLong)}`,
  `RSI ${n(f.rsi)} / 出来高 ${n(f.volumeRatio,2)}倍 / MACD前足差 ${n(f.macdDelta,3)}`,
  '7つの確認軸がすべて一致し、大きな警戒条件なし'
 ],['複数の好条件が維持されているか','過熱・出来高の急減・支持線割れが発生しないか'],{confidence:1,notes:['RAINBOWは好条件の同時確認です。買い推奨という意味ではありません。']});
 if(up&&momentumGood&&!heat&&!severeRisk&&!disagreement&&!voiceConflict&&!forecastConflict)add('trend_friend','green',72+Math.min(16,Math.max(0,f.tech-60)*.4),'移動平均の並びと価格の位置が上向きです。流れが続いているかを確認する状態です。',[
  `価格 ${price(f.price)} > ${fastLabel} ${price(f.maFast)}`,`${fastLabel} > ${slowLabel}：${price(f.maFast)} > ${price(f.maSlow)}`,`MACD ${n(f.macd,3)}${finite(f.macdDelta)?' / 前足との差 '+n(f.macdDelta,3):'（前足比は未確認）'}`
 ],['移動平均を終値で維持するか','出来高の減少・勢いの悪化がないか'],{strength:.85});
 if(up&&f.tech>=70&&nearHigh&&f.rsi>=55&&f.rsi<=75&&f.volumeRatio>=.8&&!heat&&!severeRisk&&!disagreement&&!voiceConflict&&!forecastConflict)add('no_pullback','green',86,'上向きの流れを保ったまま高値圏にあります。深い調整だけを待つより、流れが崩れる条件も合わせて確認したい状態です。',[
  `テクニカル ${n(f.tech,0)} / 高値 ${price(f.rangeHigh)} の近く`,`RSI ${n(f.rsi)} / 出来高 ${n(f.volumeRatio,2)}倍`,`${fastLabel} > ${slowLabel}を維持`
 ],['高値更新に出来高が伴うか','支持線を保ち、過熱しすぎていないか'],{strength:.9});
 const rebound=finite(f.change)&&f.change>0&&finite(f.ret5)&&f.ret5>threshold.drop5&&finite(f.macdDelta)&&f.macdDelta>=0;
 if(f.rsi<=45&&finite(f.ret20)&&f.ret20<=(intraday?-1:-8)&&longIntact&&fundGood&&nearSupport&&rebound&&!shock&&!newLow&&!severeRisk)add('contrarian_flower',f.rsi>=35?'green':'blue',78,'下落後、財務と長期の流れが残る支持線付近で、反転の初期条件が見られます。まだ反発の継続を確認する段階です。',[
  `20${unit} ${percent(f.ret20)} / RSI ${n(f.rsi)}`,`長期平均 ${price(f.maLong)} を大きく割らず、支持線 ${price(f.rangeLow)} 付近`,`財務 ${n(f.fund,0)} / 直近の価格変化 ${percent(f.change)} / MACD前足差 ${n(f.macdDelta,3)}`
 ],['安値更新せず、反発が続くか','出来高を伴って移動平均を回復するか'],{strength:.85});
 if((up||longIntact)&&(nearHigh||nearSupport)&&(f.rsi>=70||f.rsi<=40)&&!heat&&!severeRisk)add('leave_extremes','blue',70,'最高値や最安値を正確に当てる必要はありません。流れが確認できる範囲と、崩れたと判断する条件を先に整理する局面です。',[
  nearHigh?`高値 ${price(f.rangeHigh)} 付近`:`支持線 ${price(f.rangeLow)} 付近`,`RSI ${n(f.rsi)} / 移動平均乖離 ${percent(dev)}`
 ],['反転・継続の確認がそろうまで待てるか','無理に最高値・最安値を狙っていないか'],{strength:.75,notes:['初心者向け：値動きの端を全部取ろうとせず、確認できる部分に注目するという考え方です。']});
 add('rest_market','blue',!up&&!down&&f.rsi>=40&&f.rsi<=60?80:58,'方向や条件が十分にそろっていません。売買を急がず、価格と出来高の変化を待つ状態です。',[
  `テクニカル ${n(f.tech,0)} / RSI ${n(f.rsi)}`,`移動平均との乖離 ${percent(dev)} / 出来高 ${n(f.volumeRatio,2)}倍`
 ],['レンジの上抜け・下抜けが確認できるか','価格と出来高の方向がそろうか'],{strength:.4});
 candidates.sort((a,b)=>b.priority-a.priority||b.score-a.score||a.id.localeCompare(b.id));
 const selected=candidates[0];return {...selected,coverage,agreements:rainbowAxes.map(([name,ok])=>({name,ok:!!ok})),candidates:candidates.slice(1).map(({id,title,rank,score,priority})=>({id,title,rank,score,priority}))};
}
function createEngine({limit=512}={}){
 limit=Math.max(1,Math.min(2048,Math.floor(Number(limit)||512)));
 const cache=new Map(),metrics={hits:0,misses:0};
 return {evaluate(input={}){input=input&&typeof input==='object'&&!Array.isArray(input)?input:{};const effective={...input,now:finite(input.now)?input.now:Math.floor(Date.now()/60000)*60000},key=JSON.stringify([VERSION,effective]);if(cache.has(key)){metrics.hits++;const v=cache.get(key);cache.delete(key);cache.set(key,v);return v;}metrics.misses++;const result=evaluate(effective);cache.set(key,result);while(cache.size>limit)cache.delete(cache.keys().next().value);return result;},clear:()=>cache.clear(),snapshot:()=>({...metrics,size:cache.size,limit})};
}
function matches(result,{rank='all',proverbId=null}={}){return (!proverbId||result.id===proverbId)&&(rank==='all'||result.rank===rank);}
const api={evaluate,createEngine,matches,ranks,catalog,VERSION};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProverbEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
