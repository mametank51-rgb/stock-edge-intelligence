/* User-selected extra listings remain private to this browser. */
(function(root){'use strict';
const Names=typeof module!=='undefined'&&module.exports?require('./stock-names'):root.StockNames,KEY='stock-edge-extra-stocks-v1';let storage=null,error='';
function configure(s){storage=s;read();}
function read(){try{const raw=storage?.getItem(KEY),items=raw?JSON.parse(raw):[];if(!Array.isArray(items)||items.length>60||items.some(r=>!r||!Names.codeOf(r.code)||typeof r.name!=='string'))throw Error();error='';for(const item of items)Names.register(item);return items;}catch{error='追加銘柄の保存データを読み込めません。元データは変更しません。';return [];}}
function all(base){const map=new Map(base.map(r=>[r.code,r]));for(const r of read())if(!map.has(r.code))map.set(r.code,r);return [...map.values()];}
function add(info){const list=read();if(error)throw Error(error);const code=Names.codeOf(info.code);if(!code)throw Error('東証の銘柄コードを入力してください');if(Names.catalog[code])return Names.catalog[code];if(!list.some(r=>r.code===code)&&list.length>=60)throw Error('追加銘柄は60件までです');const item={code,name:String(info.name||code).slice(0,100),sector:String(info.sector||'追加銘柄'),market:String(info.market||'東証'),addedAt:new Date().toISOString()};const next=[...list.filter(r=>r.code!==code),item];storage.setItem(KEY,JSON.stringify(next));Names.register(item);return item;}
const api={configure,read,all,add,get error(){return error;}};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StockRegistry=api;
})(typeof globalThis!=='undefined'?globalThis:this);
