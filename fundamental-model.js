/* Explainable annual financial observations. Scores are heuristics, not probabilities. */
(function(root){'use strict';
const finite=Number.isFinite,clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v)),weights={growth:.3,profitability:.3,safety:.2,cash:.2};
const day=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
function valid(rec,code,now=Date.now()){try{return !!(rec&&String(rec.code)===String(code)&&rec.symbol===code+'.T'&&rec.currency==='JPY'&&Array.isArray(rec.annual)&&rec.annual.length<=8&&rec.annual.length&&rec.annual.every(r=>r&&day(r.date)&&Date.parse(r.date)<=now&&Object.entries(r).every(([k,v])=>k==='date'||v===null||finite(v)))&&new Set(rec.annual.map(r=>r.date)).size===rec.annual.length);}catch{return false;}}
function analyze(rec,{code=rec?.code,sector='',now=Date.now()}={}){
 const empty={score:null,count:0,label:'財務未取得',record:null,axes:{},kpi:{},positives:[],risks:[],momentum:null,coverage:0,groups:[]};if(!valid(rec,String(code),now))return empty;
 const annual=rec.annual.slice().sort((a,b)=>a.date.localeCompare(b.date)),latest=annual.at(-1),prev=annual.at(-2),days=prev?(Date.parse(latest.date)-Date.parse(prev.date))/86400000:0,comparable=days>=350&&days<=380;
 const ratio=(a,b)=>finite(a)&&finite(b)&&b>0?a/b*100:null,yoy=(a,b)=>finite(a)&&a>0&&finite(b)?(b/a-1)*100:null;
 const k={revYoy:comparable?yoy(prev.TotalRevenue,latest.TotalRevenue):null,opYoy:comparable?yoy(prev.OperatingIncome,latest.OperatingIncome):null,netYoy:comparable?yoy(prev.NetIncome,latest.NetIncome):null,opMargin:ratio(latest.OperatingIncome,latest.TotalRevenue),roe:comparable&&latest.StockholdersEquity>0&&finite(prev.StockholdersEquity)&&prev.StockholdersEquity>0?ratio(latest.NetIncome,(latest.StockholdersEquity+prev.StockholdersEquity)/2):null,equityRatio:ratio(latest.StockholdersEquity,latest.TotalAssets),cfo:finite(latest.OperatingCashFlow)?latest.OperatingCashFlow:null,capex:finite(latest.CapitalExpenditure)?latest.CapitalExpenditure:null};
 k.fcf=finite(k.cfo)&&finite(k.capex)?k.cfo-Math.abs(k.capex):null;k.cash=finite(latest.CashCashEquivalentsAndShortTermInvestments)?latest.CashCashEquivalentsAndShortTermInvestments:null;k.debt=finite(latest.TotalDebt)?latest.TotalDebt:null;k.netCash=finite(k.cash)&&finite(k.debt)?k.cash-k.debt:null;
 const financial=/Banking|Insurance|Securities|Other Financial|銀行|保険|証券|その他金融/i.test(sector||rec.profile?.sector||'');
 const groups=[{key:'growth',name:'成長性',weight:.3,items:[]},{key:'profitability',name:'稼ぐ力',weight:.3,items:[]},{key:'safety',name:'財務の余力',weight:.2,items:[]},{key:'cash',name:'現金を生む力',weight:.2,items:[]}];
 const add=(g,key,name,value,mid,span,unit,meaning)=>groups[g].items.push({key,name,value:finite(value)?value:null,score:finite(value)?Math.round(clamp(50+(value-mid)*50/span)):null,mid,span,unit,meaning});
 add(0,'revYoy','売上の前年比',k.revYoy,0,20,'%', '前年の同じ長さの通期と比較。0%を50点、+20%を100点、−20%を0点とします。');
 add(0,financial?'netYoy':'opYoy',financial?'純利益の前年比':'営業利益の前年比',financial?k.netYoy:k.opYoy,0,30,'%', '前年比0%を50点、+30%を100点、−30%を0点。前年が赤字・ゼロなら割合を採点しません。');
 add(1,'roe','自己資本利益率（ROE）',k.roe,8,8,'%', '通期純利益÷期首・期末の平均自己資本。8%を50点、16%を100点、0%を0点とするアプリ独自の目安です。');
 add(1,'opMargin','営業利益率',financial?null:k.opMargin,8,12,'%', '売上のうち本業の利益が占める割合。8%を50点、20%を100点。業種間の差を補正していない目安です。');
 add(2,'equityRatio','自己資本比率',financial?null:k.equityRatio,40,40,'%', '総資産に対する自己資本。40%を50点、80%を100点。高いほど借入に頼らない傾向を示します。');
 add(2,'netCashRatio','現金−借入／総資産',financial?null:ratio(k.netCash,latest.TotalAssets),0,25,'%', '現金等から有利子負債を引いた額の資産比。0%を50点、+25%を100点、−25%を0点。');
 add(3,'cfoMargin','営業キャッシュフロー率',financial?null:ratio(k.cfo,latest.TotalRevenue),5,15,'%', '事業で生んだ現金÷売上。5%を50点、20%を100点、−10%を0点。');
 add(3,'fcfMargin','投資後に残る現金／売上',financial?null:ratio(k.fcf,latest.TotalRevenue),0,10,'%', '営業CFから設備投資額を引いた簡易FCF÷売上。0%を50点、+10%を100点、−10%を0点。成長投資でも下がります。');
 let coverage=0,sum=0;const axes={};for(const g of groups){const known=g.items.filter(x=>finite(x.score));g.coverage=known.length/g.items.length;g.score=known.length?Math.round(known.reduce((s,x)=>s+x.score,0)/known.length):null;axes[g.key]=g.score;coverage+=g.weight*g.coverage;if(finite(g.score))sum+=g.weight*g.coverage*g.score;}
 const score=coverage?Math.round(sum/coverage):null,risks=[];if(!comparable)risks.push('比較できる連続した通期が不足');if(latest.NetIncome<0)risks.push('通期の純利益が赤字');if(k.opYoy<0)risks.push('本業の利益が前年より減少');if(k.fcf<0)risks.push('設備投資後の現金はマイナス');if(financial)risks.push('金融業は一般企業用の財務余力・CFを採点対象外');
 const age=(now-Date.parse(latest.date))/86400000;if(age>550)risks.push('最新の通期決算が古いため総合への影響を縮小');
 return {score,count:annual.length,label:'通期財務',record:rec,annual,latest,prev:comparable?prev:null,axes,kpi:k,positives:[],risks,momentum:null,coverage,groups,financial,modelVersion:'fundamental-v2-four-axes',age};
}
function combine({tech,fund,priceDate},now=Date.now()){
 const age=s=>{const n=Date.parse(s);return finite(n)&&n<=now?(now-n)/86400000:Infinity;},tAge=age(priceDate),fAge=age(fund?.latest?.date),tq=tAge<=7?1:tAge<=14?.4:0,fq=(fAge<=550?1:fAge<=730?.4:0)*(fund?.coverage||0);
 const axes=[{name:'テクニカル',value:tech,weight:.5,quality:tq},{name:'ファンダメンタル',value:fund?.score,weight:.5,quality:fq}];let delta=0,quality=0,count=0;for(const x of axes){if(!finite(x.value))x.quality=0;x.contribution=x.quality?(clamp(x.value)-50)*x.weight*x.quality:0;delta+=x.contribution;quality+=x.weight*x.quality;if(x.quality>0)count++;}
 return {overall:quality?Math.round(clamp(50+delta)):null,confidence:Math.round(quality*100),coverage:count,axes,penalty:0,label:quality>=.9?'両面で評価':quality>=.5?'暫定評価':'根拠が不足',modelVersion:'technical-fundamental-v2-50-50'};
}
const api={valid,analyze,combine,weights};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FundamentalModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
