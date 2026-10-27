/* Observed-price overlays. Pivots require three following bars; no future forecast values used. */
(function(root){'use strict';
const finite=Number.isFinite,defaults={patterns:true,bothPatterns:false,trend:true,levels:true,sma20:true,sma50:false,bands:false,forecast:true};
function build(all,{count=60,options={}}={}){
 const flags={...defaults,...options},n=all?.length||0,offset=count>0?Math.max(0,n-count):0,empty={offset,flags,series:[],levels:[],trends:[],patterns:[],hiddenPatterns:[],pivots:[],asOf:all?.at(-1)?.time||all?.at(-1)?.date||null};
 if(!n||!all.every(r=>r&&[r.open,r.high,r.low,r.close].every(finite)&&r.low>0&&r.high>=Math.max(r.open,r.low,r.close)&&r.low<=Math.min(r.open,r.close)))return empty;
 const idx=i=>({i,time:all[i].time||all[i].date}),start=Math.max(0,n-250),pivots={low:[],high:[]};
 for(let i=start+3;i<n-3;i++)for(const side of ['low','high']){const sign=side==='low'?1:-1,v=all[i][side];if(all.slice(i-3,i).every(r=>sign*(r[side]-v)>0)&&all.slice(i+1,i+4).every(r=>sign*(r[side]-v)>=0))pivots[side].push({...idx(i),price:v,confirmedAt:i+3});}
 const atrAt=i=>{const a=[];for(let j=Math.max(1,i-13);j<=i;j++)a.push(Math.max(all[j].high-all[j].low,Math.abs(all[j].high-all[j-1].close),Math.abs(all[j].low-all[j-1].close)));return a.length?a.reduce((s,v)=>s+v,0)/a.length:0;};
 const series=[];for(const period of [20,50])if(flags['sma'+period]||period===20&&flags.bands){const mean=[],upper=[],lower=[];for(let i=Math.max(period-1,offset);i<n;i++){const a=all.slice(i-period+1,i+1),v=a.reduce((s,r)=>s+r.close,0)/period;mean.push({i,value:v});if(period===20&&flags.bands){const sd=Math.sqrt(a.reduce((s,r)=>s+(r.close-v)**2,0)/period);upper.push({i,value:v+2*sd});lower.push({i,value:v-2*sd});}}if(flags['sma'+period])series.push({key:'sma'+period,name:period+'本平均',color:period===20?'#edc66d':'#cea5ff',points:mean});if(period===20&&flags.bands&&upper.length)series.push({key:'bands',name:'変動帯20本・±2σ',color:'#a2b5e5',upper,lower});}
 const levels=[];if(flags.levels&&n>=20){const a=all.slice(-20);for(const [key,field,name,color] of [['support','low','20本安値','#75d3c2'],['resistance','high','20本高値','#eea894']]){const value=(key==='support'?Math.min:Math.max)(...a.map(r=>r[field])),anchor=n-20+a.findIndex(r=>r[field]===value);levels.push({key,name,color,value,anchor,from:Math.max(offset,n-20),to:n-1});}}
 const trends=[];if(flags.trend)for(const side of ['low','high']){const a=pivots[side].filter(p=>p.i>=offset&&p.i>=n-120);if(a.length<2)continue;const b=a.at(-1),first=a.slice(0,-1).reverse().find(p=>b.i-p.i>=6&&b.i-p.i<=60);if(!first)continue;const slope=(b.price-first.price)/(b.i-first.i),end=first.price+slope*(n-1-first.i);if(end<=0)continue;const sign=side==='low'?1:-1,broken=all.slice(b.confirmedAt).some((r,j)=>sign*(r.close-(first.price+slope*(b.confirmedAt+j-first.i)))<-.5*atrAt(b.confirmedAt+j));trends.push({key:side,name:side==='low'?'下値トレンド':'上値トレンド',a:first,b,end,slope,broken,color:side==='low'?'#5bbcff':'#d7a0ff'});}
 const patterns=[];
 // Same bounded rule mirrored for W and M, using actual high/low anchors.
 if(flags.patterns&&n>=35)for(const kind of ['W','M']){const bottom=kind==='W',side=bottom?'low':'high',opposite=bottom?'high':'low',sign=bottom?1:-1,candidates=[];
  for(let q=1;q<pivots[side].length;q++){const b=pivots[side][q];if(n-1-b.i>40)continue;for(let p=q-1;p>=0;p--){const a=pivots[side][p],distance=b.i-a.i;if(distance>60)break;if(distance<8||a.i<10)continue;const atr=atrAt(b.i),mean=(a.price+b.price)/2,tolerance=Math.max(1.5*atr,.015*mean);if(!atr||Math.abs(a.price-b.price)>tolerance||Math.abs(a.price-b.price)>mean*.035)continue;
   const middle=all.slice(a.i+1,b.i);if(middle.some(r=>sign*(r[side]-Math.min(sign*a.price,sign*b.price)*sign)<-.25*atr))continue;
   let neck=a.i+1;for(let k=a.i+2;k<b.i;k++)if(sign*(all[k][opposite]-all[neck][opposite])>0)neck=k;const neckline=all[neck][opposite],depth=sign*(neckline-mean);if(depth<Math.max(2*atr,.03*mean)||neck-a.i<2||b.i-neck<2)continue;
   const prior=all.slice(a.i-10,a.i),before=bottom?Math.max(...prior.map(r=>r.close)):Math.min(...prior.map(r=>r.close));if(sign*(before-a.price)<Math.max(2*atr,.03*mean))continue;
   const invalidation=bottom?Math.min(a.price,b.price)-.5*atr:Math.max(a.price,b.price)+.5*atr;let breakout=null,invalid=null;
   for(let k=b.confirmedAt;k<n;k++){if(invalid===null&&sign*(all[k].close-invalidation)<0)invalid=k;if(breakout===null&&sign*(all[k].close-neckline)>.1*atr)breakout=k;}
   const status=invalid!==null?'invalidated':breakout!==null?(sign*(all.at(-1).close-neckline)>0?'breakout':'retest'):'candidate';if(status==='invalidated')continue;
   let beforeI=a.i-10;for(let k=a.i-9;k<a.i;k++)if(sign*(all[k][opposite]-all[beforeI][opposite])>0)beforeI=k;
   const points=[{i:beforeI,value:all[beforeI][opposite]},{i:a.i,value:a.price},{i:neck,value:neckline},{i:b.i,value:b.price},{i:breakout??n-1,value:all[breakout??n-1].close}];
   candidates.push({kind,id:kind+'-'+a.i+'-'+b.i,name:bottom?'ダブルボトム':'ダブルトップ',a,b,neck:{...idx(neck),price:neckline},neckline,invalidation,status,breakout,confirmedAt:b.confirmedAt,points,color:bottom?'#64ddbd':'#ffab99'});
  }}const best=candidates.sort((a,b)=>b.b.i-a.b.i||Math.abs(a.a.price-a.b.price)-Math.abs(b.a.price-b.b.price))[0];if(best)patterns.push(best);
 }
 const visible=patterns.filter(p=>p.a.i>=offset).sort((a,b)=>b.b.i-a.b.i).slice(0,flags.bothPatterns?2:1),hiddenPatterns=patterns.filter(p=>p.a.i<offset);
 return {...empty,series,levels,trends,patterns:visible,hiddenPatterns,pivots:[...pivots.low,...pivots.high]};
}
const api={build,defaults};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ChartOverlays=api;
})(typeof globalThis!=='undefined'?globalThis:this);
