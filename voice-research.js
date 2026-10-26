/* Evidence-led research queue. No predicted returns, buy signals, or author win rates. */
(function(root){
'use strict';
const Integrity=typeof module!=='undefined'&&module.exports?require('./market-integrity.js'):root.MarketIntegrity;
const Names=typeof module!=='undefined'&&module.exports?require('./stock-names.js'):root.StockNames;
const clean=v=>String(v??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const codeOf=v=>/^[1-9][0-9]{3}$|^[1-9][0-9]{2}[A-Z]$/.test(String(v||''))?String(v):'';
const number=v=>typeof v==='number'&&Number.isFinite(v);
const record=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const age=(v,now)=>{const t=Date.parse(v||'');return Number.isFinite(t)&&t<=now+300000?(now-t)/86400000:Infinity;};
function quoteSessionAge(value,now){if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return age(value,now);const time=Date.parse(value+'T00:00:00Z'),today=new Date(now+9*3600000).toISOString().slice(0,10);if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==value||value>today)return Infinity;return (Date.parse(today+'T00:00:00Z')-time)/86400000;}
function canonical(value){try{const u=new URL(value);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return '';u.hash='';for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/.test(k))u.searchParams.delete(k);return u.href;}catch{return '';}}
const validKinds=new Set(['valuation','growth','return','catalyst','risk','condition']);
function claimsOf(article){return ([1,2,3,4,5,6].includes(article?.research?.version)&&Array.isArray(article.research.claims)?article.research.claims:[]).filter(c=>c&&typeof c==='object'&&validKinds.has(c.kind)&&clean(c.excerpt)).slice(0,6).map(c=>({...c,metrics:article.research.version>=6&&Array.isArray(c.metrics)?c.metrics.filter(m=>m&&typeof m==='object'&&number(m.value)).slice(0,6):[],label:clean(c.label).slice(0,30),excerpt:clean(c.excerpt).slice(0,90),polarity:['support','caution'].includes(c.polarity)?c.polarity:'unclear',url:canonical(article.url),publisher:clean(article.publisher),owner:clean(article.sourceGroup||article.publisher),date:article.publishedAt,basis:article.research.basis==='article'?'公開本文の一部':'RSSの範囲'}));}
function identity(article){
 const subjects=[1,2,3,4,5,6].includes(article?.research?.version)&&Array.isArray(article.research.subjects)?article.research.subjects:[];
 if(subjects.some(s=>!s||typeof s!=='object'||!codeOf(s.code)))return codeOf(article.code)?{code:article.code,name:clean(article.company||article.code),verified:true,basis:'銘柄別に収集した記事'}:null;
 if(subjects.length===1&&codeOf(subjects[0].code))return {code:codeOf(subjects[0].code),name:clean(subjects[0].name).slice(0,70),verified:article.code===subjects[0].code,basis:clean(subjects[0].basis)};
 // Multiple-company articles cannot provide company-specific causal evidence.
 if(subjects.length>1)return null;
 return codeOf(article.code)?{code:article.code,name:clean(article.company||article.code),verified:true,basis:'銘柄別に収集した記事'}:null;
}
function compare(idea,quote={},fund={},now=Date.now()){
 quote=record(quote);fund=record(fund);
 const checks=[],tasks=[],has=k=>idea.claims.some(c=>c.kind===k);
 const quoteAge=quoteSessionAge(quote.dataAsOf,now),quoteFresh=number(quote.price)&&quote.price>0&&quoteAge>=0&&quoteAge<=7;
 let overheat=false;
 if(quoteFresh){
  overheat=number(quote.rsi)&&quote.rsi>=70||number(quote.m20)&&quote.m20>=15;
  checks.push({kind:overheat?'caution':'fact',label:overheat?'株価の過熱を先に確認':'保存株価と照合',text:`株価 ¥${quote.price.toLocaleString('ja-JP')}${number(quote.m20)?' / 20日 '+(quote.m20>=0?'+':'')+quote.m20.toFixed(1)+'%':''}${number(quote.rsi)?' / RSI '+quote.rsi.toFixed(1):''}`,date:quote.dataAsOf});
 }else tasks.push('株価が未取得または7日超。現在の価格・過熱を更新');
 const k=fund.kpi||{},fundDate=fund.latest?.date||fund.record?.annual?.map(x=>x.date).filter(Boolean).sort().at(-1)||'';
 const fundAge=age(fundDate,now),fundFresh=fundAge>=0&&fundAge<=550;
 if(fundFresh&&number(k.opYoy)){
  const profitClaim=idea.claims.some(c=>c.kind==='growth'&&c.polarity==='support');
  checks.push({kind:'fact',label:'取得済み年次財務（記事との期間一致は別途確認）',text:`営業利益 前年比 ${k.opYoy>=0?'+':''}${k.opYoy.toFixed(1)}%${number(k.revYoy)?' / 売上 '+(k.revYoy>=0?'+':'')+k.revYoy.toFixed(1)+'%':''}。記事の予想と対象期間が異なる場合があります。`,date:fundDate});
 }else tasks.push('直近決算で売上・営業利益と会社予想を確認');
 if(has('valuation')){
  if(quoteFresh&&fundFresh&&(number(k.pe)||number(k.pbr)))checks.push({kind:'fact',label:'取得済み財務による価格指標',text:[number(k.pe)?'PER '+k.pe.toFixed(1)+'倍':'',number(k.pbr)?'PBR '+k.pbr.toFixed(2)+'倍':''].filter(Boolean).join(' / ')+'。ブログ記載時点とは基準が異なります。',date:fundDate});
  else tasks.push('割安の根拠を現在のPER・PBR・資産価値で再確認');
 }
 if(has('return'))tasks.push('配当・優待・自社株買いの条件を会社IRで確認');
 if(has('catalyst'))tasks.push('材料の実現時期と会社の正式開示を確認');
 if(!idea.claims.some(c=>c.kind==='risk'||c.polarity==='caution'))tasks.push('反対材料が抽出されていません。需要・競合・財務の弱点を調べる');
 if(!idea.claims.some(c=>c.kind==='condition'&&c.conditionType==='invalidation'))tasks.push('見送り・仮説を撤回する条件を自分で決める');
 if(idea.writers<2)tasks.push('1人の見解です。別の情報源から反証を探す');
 if(!idea.bodyCount)tasks.push('RSSのみ。元記事の本文で評価理由を確認');
 for(const claim of idea.claims.filter(c=>c.metrics?.length)){for(const audit of Integrity.claimAudit(claim,{fund,quote})){if(!checks.some(c=>c.text===audit.text))checks.push({kind:audit.state==='review'?'caution':'fact',label:audit.label,text:audit.text,date:claim.periodEnd||'期間未照合'});}}
 if(quoteFresh&&!quote.priceBasis)tasks.push('価格の調整基準が未記録。再取得して分割調整の扱いを確認');
 return {checks,tasks:[...new Set(tasks)],quoteFresh,overheat,fundFresh};
}
function build(items,{quotes={},fundamentals={},journal={},now=Date.now()}={}){
 const groups=new Map(),seen=new Set();
 for(const p of items||[]){
  if(!p||age(p.publishedAt,now)>30||age(p.publishedAt,now)<0)continue;
  const id=identity(p),url=canonical(p.url);if(!id||!url)continue;
  const key=id.code+'|'+url;if(seen.has(key))continue;seen.add(key);
  const group=groups.get(id.code)||{...id,articles:[],claims:[],claimKeys:new Set(),blogCount:0,bodyCount:0};
  if(!group.verified&&id.verified){group.verified=true;group.name=id.name;group.basis=id.basis;}
  group.articles.push(p);if(p.communityFeed){group.blogCount++;for(const claim of claimsOf(p)){const k=claim.kind+'|'+claim.excerpt.normalize('NFKC').replace(/[\s…「」]/g,'');if(!group.claimKeys.has(k)){group.claimKeys.add(k);group.claims.push(claim);}}if(p.research?.basis==='article')group.bodyCount++;}
  groups.set(id.code,group);
 }
 for(const [code,note] of Object.entries(journal))if(codeOf(code)&&!groups.has(code))groups.set(code,{code,name:clean(note.name||code),verified:false,basis:'保存した調査メモ',articles:[],claims:[],blogCount:0,bodyCount:0});
 const result=[];
 for(const idea of groups.values()){
  if(!idea.blogCount&&!journal[idea.code])continue;
  idea.name=Names.display(idea.code,idea.name);
  idea.articles.sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
  idea.writers=new Set(idea.articles.filter(p=>p.communityFeed).map(p=>p.sourceGroup||p.publisher)).size;
  const topics=new Map();for(const c of idea.claims){const t=topics.get(c.kind)||{support:new Set(),caution:new Set()};if(c.polarity==='support'||c.polarity==='caution')t[c.polarity].add(c.owner);topics.set(c.kind,t);}
  idea.disagreements=[...topics].filter(([k,t])=>k!=='condition'&&k!=='risk'&&[...t.support].some(a=>[...t.caution].some(b=>a!==b))).map(([kind])=>kind);
  idea.agreements=[...topics].filter(([,t])=>t.support.size>=2).map(([kind,t])=>({kind,writers:t.support.size}));
  idea.recent=idea.articles.filter(p=>p.communityFeed&&age(p.publishedAt,now)<7).length;
  idea.prior=idea.articles.filter(p=>p.communityFeed&&age(p.publishedAt,now)>=7&&age(p.publishedAt,now)<14).length;
  idea.surge=idea.prior>0&&idea.recent>=3&&idea.recent>=2*idea.prior&&idea.writers>=2;
  idea.firstSeen=Math.min(...idea.articles.filter(p=>p.communityFeed).map(p=>Date.parse(p.publishedAt)).filter(Number.isFinite));
  idea.latest=idea.articles[0]?.publishedAt||'';idea.note=journal[idea.code]||null;
  idea.newAfterSave=idea.note?idea.articles.filter(p=>age(p.publishedAt,now)<=30&&Date.parse(p.publishedAt)>Date.parse(idea.note.savedAt||'')).length:0;
  Object.assign(idea,compare(idea,quotes[idea.code],fundamentals[idea.code],now));
  idea.due=!!idea.note?.reviewAt&&Date.parse(idea.note.reviewAt+'T23:59:59+09:00')<now;
  const cap=Number(idea.note?.priceCeiling);idea.priceReached=!!idea.note&&cap>0&&idea.quoteFresh&&quotes[idea.code].price<=cap;
  // This orders investigation work, never a buy/sell score or estimated edge.
  idea.queueOrder=(idea.due?50:0)+(idea.priceReached?40:0)+(idea.newAfterSave?25:0)+(idea.disagreements.length?20:0)+(idea.surge?12:0)+(idea.recent?5:0)+Math.min(idea.writers,3);
  result.push(idea);
 }
 return result.sort((a,b)=>b.queueOrder-a.queueOrder||Date.parse(b.latest||0)-Date.parse(a.latest||0)||a.code.localeCompare(b.code));
}
function select(items,{filter='all',query='',limit=6}={}){const q=clean(query).normalize('NFKC').toLowerCase();return items.filter(i=>(!q||(i.code+' '+i.name+' '+Names.english(i.code)+' '+i.claims.map(c=>c.excerpt).join(' ')).normalize('NFKC').toLowerCase().includes(q))&&(filter==='all'||filter==='new'&&i.recent>0||filter==='divergence'&&i.disagreements.length>0||filter==='overheat'&&i.overheat||filter==='saved'&&i.note||filter==='review'&&(i.due||i.priceReached||i.newAfterSave))).slice(0,limit);}
const api={build,compare,select,identity,claimsOf,canonical,codeOf};if(typeof module!=='undefined')module.exports=api;else root.VoiceResearch=api;
})(typeof globalThis!=='undefined'?globalThis:this);
