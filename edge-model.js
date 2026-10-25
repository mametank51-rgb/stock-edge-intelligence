/* Deterministic research model; scores are not return probabilities. */
(function(root){
'use strict';
const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));
const aliases={'7203':'トヨタ自動車','6758':'ソニーグループ','9984':'ソフトバンクグループ','9983':'ファーストリテイリング','8035':'東京エレクトロン','6857':'アドバンテスト','6920':'レーザーテック','6501':'日立製作所','8306':'三菱UFJ','8316':'三井住友フィナンシャル','8411':'みずほフィナンシャル','7974':'任天堂','9432':'NTT','9433':'KDDI','9434':'ソフトバンク','4063':'信越化学','6098':'リクルート','6861':'キーエンス','8058':'三菱商事','8001':'伊藤忠','8031':'三井物産','8002':'丸紅','8053':'住友商事','4502':'武田薬品','4519':'中外製薬','4568':'第一三共','7011':'三菱重工','7012':'川崎重工','7013':'IHI','7267':'ホンダ','7269':'スズキ','7201':'日産自動車','6701':'NEC','6702':'富士通','6723':'ルネサス','6526':'ソシオネクスト','6146':'ディスコ','285A':'キオクシア'};
const age=(s,now)=>{const t=Date.parse(s||'');return Number.isFinite(t)&&t<=now+300000?(now-t)/86400000:Infinity;};
function classify(text){
 const up=/買い推奨|買い継続|強気|上方修正|増益|最高益|引き?上げ|格上げ|アウトパフォーム|オーバーウェイト|増配|自社株買い/.test(text);
 const down=/売り推奨|弱気|下方修正|減益|赤字|引き?下げ|格下げ|アンダーパフォーム|アンダーウェイト/.test(text);
 return up===down?'neutral':up?'bullish':'bearish';
}
function relevant(code,company,text){
 const c=String(code).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const name=String(aliases[String(code)]||company||'').replace(/株式会社|[\s　]/g,'');
 return new RegExp('(^|[^0-9A-Za-z])'+c+'([^0-9A-Za-z]|$)','i').test(text)||(name.length>=2&&text.replace(/[\s　]/g,'').includes(name));
}
function key(p){return String(p.headline||p.raw||'').normalize('NFKC').toLowerCase().replace(/\s|[「」『』【】]/g,'').replace(/\s*-.*$/,'');}
function metric(items,now=Date.now()){
 const unique=new Map();
 for(const p of items){if(age(p.publishedAt,now)>30||age(p.publishedAt,now)<0)continue;const k=key(p);if(k&&!unique.has(k))unique.set(k,p);}
 const sources=new Map();let bull=0,bear=0,neutral=0,total=0,w=0;
 for(const p of unique.values()){
   const source=String(p.publisher||p.author||'不明').trim().toLowerCase();
   const a=sources.get(source)||[];a.push(p);sources.set(source,a);
 }
 for(const group of sources.values())for(const p of group){
   const fresh=Math.pow(.5,age(p.publishedAt,now)/7);
   const quality=p.opinionChannel==='analyst'?.8:p.opinionChannel==='community'||p.opinionChannel==='video'?.35:.5;
   const weight=fresh*quality/group.length;
   const val=p.stance==='bullish'?1:p.stance==='bearish'?-1:0;
   total+=val*weight;w+=weight;val>0?bull++:val<0?bear++:neutral++;
 }
 // Shrink sparse or old evidence toward 50; a source has a capped total influence.
 return {score:w?Math.round(50+42*total/(w+1)):null,count:unique.size,bull,bear,neutral,sources:sources.size,channels:new Set([...unique.values()].map(p=>p.opinionChannel)).size,evidenceWeight:w};
}
function composite({tech,fund,voice,priceDate,fundDate,voiceWeight=0,rsi,atrPct},now=Date.now()){
 const tq=age(priceDate,now)<=7?1:age(priceDate,now)<=14?.4:0;
 const fq=age(fundDate,now)<=550?1:age(fundDate,now)<=730?.4:0;
 const axes=[{name:'Technical',value:tech,weight:.5,quality:tq},{name:'Fundamental',value:fund,weight:.3,quality:fq},{name:'Market Voice',value:voice,weight:.2,quality:Math.min(1,voiceWeight/2)}];
 let delta=0,coverage=0,count=0;
 for(const x of axes){if(!Number.isFinite(x.value))x.quality=0;if(x.quality>0){count++;coverage+=x.weight*x.quality;delta+=(clamp(x.value)-50)*x.weight*x.quality;}}
 const penalty=(Number.isFinite(rsi)&&rsi>75?Math.min(6,(rsi-75)*.4):0)+(Number.isFinite(atrPct)&&atrPct>5?Math.min(6,atrPct-5):0);
 return {overall:coverage?Math.round(clamp(50+delta-penalty)):null,coverage:count,confidence:Math.round(coverage*100),penalty:Math.round(penalty*10)/10,axes,label:coverage>=.8?'複数根拠あり':coverage>=.5?'暫定評価':'根拠不足'};
}
function position({capital,riskPct,entry,stop,target,lot=100,costBps=20}){
 if(![capital,riskPct,entry,stop,target,lot,costBps].every(Number.isFinite)||capital<=0||riskPct<=0||riskPct>5||stop<=0||entry<=stop||target<=entry||lot<1||!Number.isInteger(lot)||costBps<0)throw Error('資金・価格・単元を確認してください（買い取引、損失許容率は0超〜5%）。');
 const cost=entry*costBps/10000,loss=entry-stop+cost,gain=target-entry-cost;
 const shares=Math.max(0,Math.floor(Math.min(capital*riskPct/100/loss,capital/(entry+cost))/lot)*lot);
 return {shares,budget:shares*entry,maxLoss:shares*loss,rewardRisk:gain/loss};
}
const model={aliases,age,classify,relevant,key,metric,composite,position};
if(typeof module!=='undefined')module.exports=model;else root.EdgeModel=model;
})(typeof globalThis!=='undefined'?globalThis:this);
