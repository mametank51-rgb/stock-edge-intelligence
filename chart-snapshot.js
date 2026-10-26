/* Same-origin daily prices; keep provider acquisition time and validate identity. */
(function(root){
'use strict';
const Integrity=typeof module!=='undefined'&&module.exports?require('./market-integrity.js'):root.MarketIntegrity;
function parse(body,{code,now=Date.now()}={}){
 if(body?.schema!=='stock-edge-chart-v1'||body.code!==code||!Array.isArray(body.rows)||body.rows.length<20||body.rows.length>600||!Number.isFinite(Date.parse(body.fetchedAt))||Date.parse(body.fetchedAt)>now+300000)throw Error('配信日足の銘柄・形式・取得日時を確認できません');
 const source=new URL(body.sourceUrl);if(!['query1.finance.yahoo.com','query2.finance.yahoo.com'].includes(source.hostname)||source.protocol!=='https:'||source.username||source.password||source.pathname!=='/v8/finance/chart/'+code+'.T')throw Error('配信日足の出典を確認できません');
 const payload={rows:body.rows,meta:body.meta,events:body.events||{},basis:body.basis,sourceUrl:body.sourceUrl,transport:'公開サイトの日足配信',fetchedAt:body.fetchedAt,sourceRejected:body.rejectedRows||0,sourceRejectedDates:body.rejectedDates||[]};
 const integrity=Integrity.normalize(payload,{code,now});if(integrity.rows.length<20||body.asOf!==integrity.dataAsOf)throw Error('配信日足の基準日・本数が一致しません');
 return {...payload,rows:integrity.rows,integrity};
}
function url(code,location){if(!Integrity.codeOf(code))throw Error('銘柄コードが不正です');const base=location?.protocol==='file:'?'https://mametank51-rgb.github.io/stock-edge-intelligence/':new URL('./',location.href).href;return new URL('chart-data/'+code+'.json',base).href;}
const api={parse,url};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ChartSnapshot=api;
})(typeof globalThis!=='undefined'?globalThis:this);
