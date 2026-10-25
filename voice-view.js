/* Pure presentation model for publicly sourced news and opinion records. */
(function(root){
'use strict';
const text=v=>String(v??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
function codeOf(value){const s=String(value||'').toUpperCase().replace(/\.T$/,'');return /^[0-9A-Z]{4}$/.test(s)?s:/^[0-9A-Z]{4}0$/.test(s)?s.slice(0,4):'';}
function safeUrl(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
function isReferenceTitle(value){return /株価・株式情報|株価・株式[（(]|基本情報\s*$|企業情報[（(]|決算時期・代表者名|今の株価の理由は.*AIが解説/.test(text(value));}
function skipArticle(code,title){return isReferenceTitle(title)||String(code)==='9434'&&/ソフトバンク(?:グループ|[GＧ])/.test(text(title))&&!text(title).includes('9434');}
function extractTargetPrice(value){
 const s=text(value).normalize('NFKC');
 const match=s.match(/(?:目標株価|目標価格)\s*(?:[はを:：]\s*)?(?:[¥￥]\s*([0-9][0-9,]*(?:\.[0-9]+)?)|([0-9][0-9,]*(?:\.[0-9]+)?)\s*円)/);
 if(!match)return null;
 const tail=s.slice(match.index+match[0].length,match.index+match[0].length+64);
 const next=tail.match(/^\s*(?:から|→|⇒|->)\s*(?:[¥￥]\s*([0-9][0-9,]*(?:\.[0-9]+)?)|([0-9][0-9,]*(?:\.[0-9]+)?)\s*円)/);
 if(!next&&/^\s*(?:から|→|⇒|->|[〜～~])/.test(tail))return null;
 const amount=Number(((next||match)[1]||(next||match)[2]).replace(/,/g,''));return Number.isFinite(amount)&&amount>0?amount:null;
}
function prepare(items,{now=Date.now(),classify}={}){
 const map=new Map();
 for(const raw of items||[]){
  if(!raw||typeof raw!=='object')continue;
  const code=codeOf(raw.code);if(!code)continue;
  const headline=text(raw.headline||raw.raw||'見出しなし').slice(0,600),stamp=Date.parse(raw.publishedAt||''),days=(now-stamp)/86400000;
  if(skipArticle(code,headline))continue;
  const dated=Number.isFinite(stamp)&&stamp<=now+300000,fresh=dated&&days<=30;
  const legacy=!!raw.browserAuto&&raw.extractionVersion!==2;
  const category=raw.sourceCategory==='voice'?'voice':'material';
  const stance=raw.browserAuto&&classify?classify(headline):['bullish','bearish'].includes(raw.stance)?raw.stance:'neutral';
  const record={...raw,code,headline,company:text(raw.company||code),publisher:text(raw.publisher||raw.author||'媒体不明'),author:text(raw.browserAuto?raw.feedAuthor:raw.author),targetPrice:raw.browserAuto?extractTargetPrice(headline+' '+text(raw.summary)):raw.targetPrice,summary:text(raw.summary).slice(0,700),reasons:(Array.isArray(raw.reasons)?raw.reasons:[]).map(text).filter(Boolean).slice(0,5),url:safeUrl(raw.url),stamp:dated?stamp:0,fresh,eligible:fresh&&!legacy,category,stance,quality:legacy?'旧収集形式':!dated?'公表日不明':!fresh?'30日超':'見出し判定',key:code+'|'+headline.normalize('NFKC').toLowerCase().replace(/[\s「」『』【】]/g,'')};
  const old=map.get(record.key);if(!old||record.stamp>old.stamp)map.set(record.key,record);
 }
 return [...map.values()].sort((a,b)=>Number(b.category==='voice')-Number(a.category==='voice')||b.stamp-a.stamp);
}
function select(items,{code='',query='',kind='all',stance='all',period='fresh'}={}){
 const q=text(query).normalize('NFKC').toLowerCase();
 return items.filter(p=>(!code||p.code===code)&&(period==='all'||p.fresh)&&(kind==='all'||kind==='opinion'&&p.category==='voice'||kind==='analyst'&&p.opinionChannel==='analyst'||kind==='material'&&p.category==='material'||kind==='community'&&['community','video'].includes(p.opinionChannel))&&(stance==='all'||p.stance===stance)&&(!q||[p.code,p.company,p.publisher,p.author,p.headline,...p.reasons].join(' ').normalize('NFKC').toLowerCase().includes(q)));
}
function stats(items){const usable=items.filter(p=>p.eligible&&p.category==='voice');return {total:items.length,fresh:items.filter(p=>p.fresh).length,eligible:usable.length,bull:usable.filter(p=>p.stance==='bullish').length,bear:usable.filter(p=>p.stance==='bearish').length,neutral:usable.filter(p=>p.stance==='neutral').length,materials:items.filter(p=>p.fresh&&p.category==='material').length,sources:new Set(usable.map(p=>p.publisher)).size,archived:items.filter(p=>!p.fresh).length};}
function status({items,scan,running=false,requested=false}={}){
 if(running)return {kind:'working',label:'この銘柄を取得中'};
 if(requested)return {kind:'working',label:'優先取得の順番待ち'};
 if(items?.some(p=>p.fresh))return {kind:scan?.failures||scan?.failedLenses?'partial':'ready',label:scan?.failures||scan?.failedLenses?'保存記事あり・一部取得失敗':'保存記事を表示中'};
 if(scan?.failures)return {kind:'failed',label:'取得に失敗しました'};
 if(items?.length)return {kind:'archived',label:'古い記事のみ保存されています'};
 if(scan?.at)return {kind:'empty',label:'検索済み・一致する記事なし'};
 return {kind:'pending',label:'この銘柄はまだ未取得です'};
}
const api={codeOf,safeUrl,isReferenceTitle,skipArticle,extractTargetPrice,prepare,select,stats,status};if(typeof module!=='undefined')module.exports=api;else root.VoiceView=api;
})(typeof globalThis!=='undefined'?globalThis:this);
