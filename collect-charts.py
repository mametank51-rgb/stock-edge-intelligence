"""Publish bounded daily-price snapshots so mobile clients do not need a CORS relay."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import json, math, re, threading, time

ROOT=Path(__file__).resolve().parent
DEST=ROOT/'chart-data'
JST=timezone(timedelta(hours=9))
stop=threading.Event()

def valid_number(v):return isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)
def snapshot(body,code,source,now=None,max_rows=520):
 now=now or datetime.now(timezone.utc)
 item=body['chart']['result'][0];meta=item.get('meta',{})
 if meta.get('symbol')!=code+'.T' or meta.get('currency')!='JPY':raise ValueError('price identity/currency mismatch')
 q=item['indicators']['quote'][0];adjusted=item['indicators'].get('adjclose',[{}])[0].get('adjclose',[])
 rows={};rejected=[]
 for i,stamp in enumerate(item.get('timestamp',[])):
  day=datetime.fromtimestamp(stamp,JST).date().isoformat()
  values=[q.get(k,[])[i] if i<len(q.get(k,[])) else None for k in ('open','high','low','close','volume')]
  if day>now.astimezone(JST).date().isoformat() or any(not valid_number(v) for v in values) or any(v<=0 for v in values[:4]) or values[4]<0 or values[1]<max(values[0],values[2],values[3]) or values[2]>min(values[0],values[3]):rejected.append(day);continue
  row=dict(zip(('date','open','high','low','close','volume'),[day,*values]))
  if i<len(adjusted) and valid_number(adjusted[i]) and adjusted[i]>0:row['adjustedClose']=adjusted[i]
  if day in rows and rows[day]!=row:raise ValueError('conflicting duplicate price')
  rows[day]=row
 data=sorted(rows.values(),key=lambda x:x['date'])[-max_rows:]
 if len(data)<20:raise ValueError('not enough valid daily bars')
 return {'schema':'stock-edge-chart-v1','code':code,'meta':{'symbol':code+'.T','currency':'JPY','exchangeName':meta.get('exchangeName','JPX')},'basis':'split-adjusted','sourceUrl':source,'fetchedAt':now.isoformat(),'asOf':data[-1]['date'],'rows':data,'events':item.get('events',{}),'rejectedRows':len(rejected),'rejectedDates':rejected}

def collect(code,force=False,long_history=False):
 path=(ROOT/'chart-long-data' if long_history else DEST)/(code+'.json');now=datetime.now(timezone.utc)
 try:
  old=json.loads(path.read_text(encoding='utf-8'))
  age=(now-datetime.fromisoformat(old['fetchedAt'])).total_seconds()
  if not force and old.get('schema')=='stock-edge-chart-v1' and old.get('code')==code and old.get('meta',{}).get('symbol')==code+'.T' and old.get('meta',{}).get('currency')=='JPY' and len(old.get('rows',[]))>=20 and 0<=age<2*3600:return 'cached'
 except (OSError,ValueError,KeyError,TypeError):pass
 if stop.is_set():return 'kept'
 source='https://query1.finance.yahoo.com/v8/finance/chart/'+code+'.T?range='+('10y' if long_history else '2y')+'&interval=1d&events=div%2Csplits&includePrePost=false'
 try:
  time.sleep(.15)
  with urlopen(Request(source,headers={'User-Agent':'StockEdgeChartSnapshot/1.0','Accept':'application/json'}),timeout=10) as response:
   raw=response.read(2000001)
   if len(raw)>2000000:raise ValueError('price response too large')
   data=snapshot(json.loads(raw),code,source,now,max_rows=2600 if long_history else 520)
   data['historyRange']='10y' if long_history else '2y'
  temp=path.with_suffix('.tmp');temp.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8');temp.replace(path)
  return 'updated'
 except HTTPError as e:
  if e.code in (403,429,503):stop.set()
  return 'kept'
 except (OSError,ValueError,KeyError,IndexError,TypeError):return 'kept'

def main():
 import argparse
 parser=argparse.ArgumentParser();parser.add_argument('--force',action='store_true');parser.add_argument('--codes',default='');parser.add_argument('--long-history',action='store_true');args=parser.parse_args()
 universe=json.loads(re.search(r'const UNIVERSE=(\[.*?\]);',(ROOT/'index.html').read_text(encoding='utf-8')).group(1))
 seeds=json.loads((ROOT/'extra-chart-codes.json').read_text(encoding='utf-8')) if (ROOT/'extra-chart-codes.json').exists() else []
 listed=json.loads((ROOT/'stock-catalog.json').read_text(encoding='utf-8'))['items'] if (ROOT/'stock-catalog.json').exists() else []
 allowed={r['code'] for r in universe}|{r['code'] for r in listed}|set(seeds);codes=args.codes.split(',') if args.codes else list(dict.fromkeys([r['code'] for r in universe]+seeds))
 if not set(codes)<=allowed:raise ValueError('unknown stock code')
 dest=ROOT/'chart-long-data' if args.long_history else DEST
 dest.mkdir(exist_ok=True);stats={}
 with ThreadPoolExecutor(max_workers=2) as pool:
  for job in as_completed([pool.submit(collect,code,args.force,args.long_history) for code in codes]):
   state=job.result();stats[state]=stats.get(state,0)+1
 items=[]
 for code in sorted(allowed):
  try:
   p=json.loads((dest/(code+'.json')).read_text(encoding='utf-8'));items.append({'code':code,'asOf':p['asOf'],'fetchedAt':p['fetchedAt']})
  except (OSError,ValueError,KeyError):pass
 (dest/'index.json').write_text(json.dumps({'schema':'stock-edge-chart-index-v1','generatedAt':datetime.now(timezone.utc).isoformat(),'items':items},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
 print(('Long-history' if args.long_history else 'Daily')+' chart snapshots: '+str(len(items))+' available; '+str(len(codes))+' targets; '+json.dumps(stats),flush=True)

if __name__=='__main__':main()
