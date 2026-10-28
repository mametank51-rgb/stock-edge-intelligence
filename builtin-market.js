__modules.builtinMarket = (() => {
const PROXY='https://proxy.cors.dev/';
const SOURCE='Yahoo Finance Chart';
const jpCode=ticker=>{const t=String(ticker).toUpperCase().replace(/\.T$/,'');return t.length===5&&t.endsWith('0')?t.slice(0,4):t;};
const ySymbol=ticker=>jpCode(ticker)+'.T';
function tokyoDay(seconds){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(seconds*1000));
  const obj=Object.fromEntries(parts.map(p=>[p.type,p.value]));return `${obj.year}-${obj.month}-${obj.day}`;
}
async function fetchJson(url,timeout=12000,interactive=false){
  const r=await window.stockEdgeRequest(url,{edgeTimeoutMs:timeout,edgePriority:interactive,credentials:'omit',cache:'no-store'});if(!r.ok)throw EdgePerformance.httpError(r);return await r.json();
}
async function sharedChart(code,interactive=false,longHistory=false){const payload=ChartSnapshot.parse(await fetchJson(ChartSnapshot.url(code,location,{longHistory}),12000,interactive),{code});if(longHistory&&payload.historyRange!=="10y")throw Error("長期日足の配信を確認できません");return payload;}
async function yahooChartRaw(ticker,{preferShared=false,interactive=false,longHistory=false}={}){
  let sharedError=null;if(preferShared){try{return await sharedChart(jpCode(ticker),interactive,longHistory);}catch(e){if([429,503].includes(e?.status))throw e;sharedError=e;}}
  const symbol=ySymbol(ticker),direct=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${longHistory?'10y':'2y'}&interval=1d&events=div%2Csplits&includePrePost=false`;
  const routes=[{name:'Yahoo direct',url:direct},{name:'cors.dev relay',url:PROXY+direct}];
  if(!longHistory){const source=direct.replace('range=2y','range=1y');routes.push({name:'Yahoo direct 1y',url:source,source},{name:'cors.dev relay 1y',url:PROXY+source,source});}
  let lastError=null;
  for(const route of routes){
    try{
      const body=await fetchJson(route.url,12000,interactive),result=body?.chart?.result?.[0];
      if(!result||body?.chart?.error)throw new Error(body?.chart?.error?.description||'株価データが空です。');
      const q=result.indicators?.quote?.[0],ts=result.timestamp||[];
      if(!q||!ts.length)throw new Error('OHLCVが見つかりません。');
      const rows=[];let sourceRejected=0;const sourceRejectedDates=[];
      for(let i=0;i<ts.length;i++){
        const values=[q.open?.[i],q.high?.[i],q.low?.[i],q.close?.[i],q.volume?.[i]];
        if(values.some(v=>v==null||!Number.isFinite(Number(v)))){sourceRejected++;sourceRejectedDates.push(tokyoDay(ts[i]));continue;}
        rows.push({date:tokyoDay(ts[i]),open:Number(values[0]),high:Number(values[1]),low:Number(values[2]),close:Number(values[3]),volume:Number(values[4]),adjustedClose:result.indicators?.adjclose?.[0]?.adjclose?.[i]??null});
      }
      if(rows.length<20)throw new Error('有効な日足が少なすぎます。');
      const payload={rows,meta:result.meta||{},events:result.events||{},basis:'split-adjusted',sourceUrl:route.source||direct,transport:route.name,sourceRejected,sourceRejectedDates};const integrity=MarketIntegrity.normalize(payload,{code:jpCode(ticker)});return {...payload,rows:integrity.rows,integrity};
    }catch(error){if([429,503].includes(error?.status))throw error;lastError=error;}
  }
  if(!preferShared){try{return await sharedChart(jpCode(ticker),interactive,longHistory);}catch(e){if([429,503].includes(e?.status))throw e;sharedError=e;}}
  throw Object.assign(new Error('標準株価ルートで取得できませんでした。通信環境または提供元の状態を確認してください。'+(lastError?.message?' ('+lastError.message+')':'')),{status:lastError?.status||sharedError?.status,retryAfterMs:Math.max(lastError?.retryAfterMs||0,sharedError?.retryAfterMs||0)});
}
function yahooChart(ticker,options={}){const key=(options.longHistory?'price-long:':'price:')+jpCode(ticker),task=()=>yahooChartRaw(ticker,options);return window.stockEdgeRequests?window.stockEdgeRequests.run(key,task,{prior:__modules.nikkei225?.read?.().rows?.[jpCode(ticker)]||{},ttl:30000}):task();}
async function fetchAndSaveRaw(ticker,{longHistory=false,payload:provided=null}={}){
  const downloadedAt=new Date().toISOString(),payload=provided||await yahooChart(ticker,{preferShared:true,interactive:true,longHistory}),meta=payload.meta||{};
  const fetchedAt=payload.fetchedAt||downloadedAt;
  const saved=workspace.getRecord?.(ticker);if(longHistory&&saved?.stock?.data_as_of>payload.integrity.dataAsOf)throw Error('長期日足の基準日が保存済み株価より古いため、更新を保留しました。');
  const expected=ySymbol(ticker).toUpperCase();
  if(meta.symbol&&String(meta.symbol).toUpperCase()!==expected)throw new Error('取得した銘柄コードを検証できません。');
  // Yahoo OHLC is split-adjusted; adjclose additionally includes dividends.
  // Import the complete OHLCV set without mixing the separate adjusted close.
  const chartRows=payload.rows.map(({date,open,high,low,close,volume})=>({date,open,high,low,close,volume}));
  const record=__modules.dataEvidence.parsePrices(JSON.stringify(chartRows),{ticker,market:'JP',company:StockNames.display(jpCode(ticker),meta.shortName||meta.longName||jpCode(ticker)),provider:'yahoo',basis:'adjusted',source_url:payload.sourceUrl,file_name:'preinstalled-yahoo-chart.json'});
  record.stock.source=SOURCE;record.stock.provider_id='yahoo-browser';record.stock.fetched_at=fetchedAt;record.stock.updated_at=fetchedAt;record.stock.exchange=meta.exchangeName||'JPX';record.stock.currency=meta.currency||'JPY';
  record.provenance.history_range=longHistory?'10y':payload.historyRange||'2y';
  record.provenance.adjustment_basis='Yahoo OHLC: split-adjusted, not dividend-adjusted';record.provenance.provider='Yahoo Finance Chart (unofficial)';record.provenance.acquired_at=fetchedAt;record.provenance.transport=payload.transport;record.provenance.verification='Yahoo Financeの非公式Chartエンドポイントから自動取得。公式開示・取引所データとの照合は未実施。';
  try{workspace.saveRecord(record);}catch(e){workspace.rememberTransient(record,e.message);record.provenance.persistenceWarning=e.message;}return record;
}
const saveFlights=new Map();
function fetchAndSave(ticker,options={}){const key=ticker+':'+!!options.longHistory;if(saveFlights.has(key))return saveFlights.get(key);const p=fetchAndSaveRaw(ticker,options).finally(()=>saveFlights.delete(key));saveFlights.set(key,p);return p;}
return {fetchAndSave,yahooChart,jpCode,ySymbol,SOURCE};
})();

