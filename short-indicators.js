(function(root){'use strict';
const C=typeof module!=='undefined'&&module.exports?require('./market-clock'):root.MarketClock;
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
function ema(values,n){const alpha=2/(n+1);let previous;return values.map(v=>previous=previous===undefined?v:alpha*v+(1-alpha)*previous);}
function rsi(values,n=9){const out=values.map(()=>null);let gain=0,loss=0;for(let i=1;i<values.length;i++){const d=values[i]-values[i-1];if(i<=n){gain+=Math.max(d,0)/n;loss+=Math.max(-d,0)/n;}else{gain=(gain*(n-1)+Math.max(d,0))/n;loss=(loss*(n-1)+Math.max(-d,0))/n;}if(i>=n)out[i]=loss===0?(gain===0?50:100):100-100/(1+gain/loss);}return out;}
function calculate(rows,interval='5m'){
 const close=rows.map(r=>r.close),e9=ema(close,9),e21=ema(close,21),params=interval==='5m'?[6,13,5,9]:interval==='15m'?[8,17,5,9]:[12,26,9,14],fast=ema(close,params[0]),slow=ema(close,params[1]),macd=fast.map((v,i)=>v-slow[i]),signal=ema(macd,params[2]);let day='',sum=0,volume=0,atr;
 const vwap=rows.map(r=>{const d=C.date(Date.parse(r.time));if(day!==d){day=d;sum=volume=0;}sum+=(r.high+r.low+r.close)/3*r.volume;volume+=r.volume;return interval==='1d'||!volume?null:sum/volume;});
 const atrs=rows.map((r,i)=>{const tr=Math.max(r.high-r.low,i?Math.abs(r.high-close[i-1]):0,i?Math.abs(r.low-close[i-1]):0);return atr=atr===undefined?tr:(atr*13+tr)/14;});
 return {ema9:e9,ema21:e21,vwap,rsi:rsi(close,params[3]),macd,signal,histogram:macd.map((v,i)=>v-signal[i]),atr:atrs,params:{rsi:params[3],macd:params.slice(0,3)},mean};
}
const api={mean,ema,rsi,calculate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ShortIndicators=api;
})(typeof globalThis!=='undefined'?globalThis:this);
