/* Pure presentation model for publicly sourced news and opinion records. */
(function(root){
'use strict';
const Names=typeof module!=='undefined'&&module.exports?require('./stock-names.js'):root.StockNames;
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
  const code=codeOf(raw.code);if(!code&&!(raw.communityFeed&&raw.scope==='market'))continue;
  const headline=text(raw.headline||raw.raw||'見出しなし').slice(0,600),stamp=Date.parse(raw.publishedAt||''),days=(now-stamp)/86400000;
  if(skipArticle(code,headline))continue;
  const dated=Number.isFinite(stamp)&&stamp<=now+300000,fresh=dated&&days>=0&&days<=30;
  const legacy=!!raw.browserAuto&&raw.extractionVersion!==2;
  const category=raw.sourceCategory==='voice'?'voice':'material';
  const stance=raw.browserAuto&&classify?classify(headline):['bullish','bearish'].includes(raw.stance)?raw.stance:'neutral';
  const record={...raw,code,headline,company:Names.display(code,text(raw.company||code)),englishName:Names.english(code),publisher:text(raw.publisher||raw.author||'媒体不明'),author:text(raw.browserAuto?raw.feedAuthor:raw.author),targetPrice:raw.communityFeed?null:raw.browserAuto?extractTargetPrice(headline+' '+text(raw.summary)):raw.targetPrice,summary:text(raw.summary).slice(0,700),reasons:(Array.isArray(raw.reasons)?raw.reasons:[]).map(text).filter(Boolean).slice(0,5),url:safeUrl(raw.url),stamp:dated?stamp:0,fresh,eligible:fresh&&!legacy&&!!code,category,stance,quality:legacy?'旧収集形式':Number.isFinite(stamp)&&stamp>now?'公表時刻が未来':!dated?'公表日不明':!fresh?'30日超':raw.communityFeed&&!code?'ブログ閲覧用・個別銘柄の採点対象外':'見出し判定',key:raw.communityFeed?'blog|'+safeUrl(raw.url):code+'|'+headline.normalize('NFKC').toLowerCase().replace(/[\s「」『』【】]/g,'')};
  const old=map.get(record.key);if(!old||record.stamp>old.stamp)map.set(record.key,record);
 }
 return [...map.values()].sort((a,b)=>Number(b.category==='voice')-Number(a.category==='voice')||b.stamp-a.stamp);
}
function select(items,{code='',query='',kind='all',stance='all',period='fresh',source='',topic='all'}={}){
 const q=text(query).normalize('NFKC').toLowerCase();
 const result=items.filter(p=>(!code||p.code===code)&&(!source||p.sourceId===source)&&(topic==='all'||p.topic===topic)&&(period==='all'||p.fresh)&&(kind==='all'||kind==='blog'&&p.communityFeed||kind==='opinion'&&p.category==='voice'||kind==='analyst'&&p.opinionChannel==='analyst'||kind==='material'&&p.category==='material'||kind==='community'&&['community','video'].includes(p.opinionChannel))&&(stance==='all'||p.stance===stance)&&(!q||[p.code,p.company,p.englishName,p.publisher,p.author,p.headline,...p.reasons].join(' ').normalize('NFKC').toLowerCase().includes(q)));
 if(kind!=='blog')return result;
 // Round-robin writers, newest post within each writer. One prolific feed must
 // not consume the entire first screen. Same writer on note/blog is one group.
 const groups=new Map();for(const p of result){const k=p.sourceGroup||p.publisher;const group=groups.get(k)||[];group.push(p);groups.set(k,group);}
 const diverse=[];while(groups.size){for(const [k,group] of groups){diverse.push(group.shift());if(!group.length)groups.delete(k);}}return diverse;
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
