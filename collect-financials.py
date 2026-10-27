"""Publish bounded factual annual records and company profile fields; preserve good data on errors."""
from concurrent.futures import ThreadPoolExecutor,as_completed
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from html.parser import HTMLParser
from datetime import datetime,timezone
from pathlib import Path
import json,re,math,time,threading
ROOT=Path(__file__).resolve().parent
FIELDS=['TotalRevenue','OperatingIncome','NetIncome','TotalAssets','StockholdersEquity','OperatingCashFlow','CapitalExpenditure','TotalDebt','CashCashEquivalentsAndShortTermInvestments']
stop=threading.Event()
def download(url):
 with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0 (StockEdge public financial snapshot)','Accept':'application/json,text/html'}),timeout=12) as r:
  raw=r.read(2000001)
  if len(raw)>2000000:raise ValueError('response too large')
  return raw.decode('utf-8')
def parse(body,code,source,now=None):
 now=now or datetime.now(timezone.utc);today=now.date().isoformat();rows={}
 for block in body.get('timeseries',{}).get('result') or []:
  if block.get('meta',{}).get('symbol')!=[code+'.T']:raise ValueError('financial identity mismatch')
  for field in FIELDS:
   for p in block.get('annual'+field,[]):
    date=p.get('asOfDate','');v=p.get('reportedValue',{}).get('raw')
    if p.get('periodType')!='12M' or not re.fullmatch(r'\d{4}-\d{2}-\d{2}',date) or date>today:continue
    datetime.strptime(date,'%Y-%m-%d')
    if p.get('currencyCode')!='JPY':raise ValueError('financial currency mismatch')
    if not isinstance(v,(int,float)) or isinstance(v,bool) or not math.isfinite(v):continue
    row=rows.setdefault(date,{'date':date})
    if field in row and row[field]!=v:raise ValueError('conflicting financial values')
    row[field]=v
 annual=sorted(rows.values(),key=lambda x:x['date'])[-5:]
 if not annual or not any('TotalRevenue' in r or 'NetIncome' in r for r in annual):raise ValueError('no usable annuals')
 return {'schema':'stock-edge-financial-v2','code':code,'symbol':code+'.T','currency':'JPY','unitBasis':'円・12ヶ月通期、配信元の連結値','annual':annual,'source':'Yahoo Finance Fundamentals TimeSeries','official':False,'sourceUrl':source,'dataAsOf':annual[-1]['date'],'fetchedAt':now.isoformat()}
class ProfileParser(HTMLParser):
 def __init__(self):super().__init__();self.row=None;self.cell=None;self.rows={};self.canonical=None
 def handle_starttag(self,t,a):
  d=dict(a)
  if t=='link' and d.get('rel')=='canonical':self.canonical=d.get('href')
  if t=='tr':self.row=[]
  if t in ('th','td') and self.row is not None:self.cell=[]
 def handle_data(self,d):
  if self.cell is not None:self.cell.append(d)
 def handle_endtag(self,t):
  if t in ('th','td') and self.cell is not None:
   if self.row is not None:self.row.append(' '.join(''.join(self.cell).split()))
   self.cell=None
  if t=='tr' and self.row is not None:
   if len(self.row)>=2:self.rows[self.row[0]]=self.row[1]
   self.row=None
def profile(html,code):
 p=ProfileParser();p.feed(html);source='https://finance.yahoo.co.jp/quote/'+code+'.T/profile'
 if p.canonical!=source:raise ValueError('profile identity mismatch')
 mapping={'業種分類':'sector','英文社名':'englishName','代表者名':'representative','設立年月日':'founded','市場名':'market','上場年月日':'listed','決算':'fiscalMonth','単元株数':'lot','従業員数（連結）':'employees'}
 facts={v:p.rows[k] for k,v in mapping.items() if p.rows.get(k) and len(p.rows[k])<=160}
 if not facts:raise ValueError('profile fields absent')
 return {**facts,'sourceUrl':source,'fetchedAt':datetime.now(timezone.utc).isoformat()}
def collect(code,force=False):
 path=ROOT/'financial-data'/(code+'.json');old={}
 try:
  old=json.loads(path.read_text(encoding='utf-8'));age=(datetime.now(timezone.utc)-datetime.fromisoformat(old['fetchedAt'])).total_seconds()
  if not force and old.get('schema')=='stock-edge-financial-v2' and old.get('code')==code and 0<=age<72*3600:return 'cached'
 except (OSError,ValueError,KeyError,TypeError):pass
 if stop.is_set():return 'kept'
 url='https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/'+code+'.T?symbol='+code+'.T&type='+','.join('annual'+x for x in FIELDS)+'&period1='+str(int(time.time()-8*365.25*86400))+'&period2='+str(int(time.time()))
 try:
  rec=parse(json.loads(download(url)),code,url)
  try:rec['profile']=profile(download('https://finance.yahoo.co.jp/quote/'+code+'.T/profile'),code)
  except (OSError,ValueError):
   if old.get('profile'):rec['profile']=old['profile']
  tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps(rec,ensure_ascii=False,separators=(',',':')),encoding='utf-8');tmp.replace(path);return 'updated'
 except HTTPError as e:
  if e.code in (403,429,503):stop.set()
  return 'kept'
 except (OSError,ValueError,KeyError,TypeError):return 'kept'
def main():
 import argparse
 p=argparse.ArgumentParser();p.add_argument('--codes',default='');p.add_argument('--force',action='store_true');args=p.parse_args()
 universe=json.loads(re.search(r'const UNIVERSE=(\[.*?\]);',(ROOT/'index.html').read_text(encoding='utf-8')).group(1));extras=json.loads((ROOT/'extra-chart-codes.json').read_text(encoding='utf-8'))
 codes=list(dict.fromkeys(args.codes.split(',') if args.codes else [r['code'] for r in universe]+extras))
 if any(not re.fullmatch(r'[0-9][0-9A-Z]{3}',c) for c in codes):raise ValueError('invalid code')
 (ROOT/'financial-data').mkdir(exist_ok=True);stats={}
 with ThreadPoolExecutor(max_workers=2) as pool:
  for f in as_completed([pool.submit(collect,c,args.force) for c in codes]):
   state=f.result();stats[state]=stats.get(state,0)+1
 items=[]
 for f in sorted((ROOT/'financial-data').glob('*.json')):
  if f.name=='index.json':continue
  try:
   r=json.loads(f.read_text(encoding='utf-8'));items.append({'code':r['code'],'asOf':r['dataAsOf'],'fetchedAt':r['fetchedAt']})
  except (OSError,ValueError,KeyError):pass
 (ROOT/'financial-data'/'index.json').write_text(json.dumps({'schema':'stock-edge-financial-index-v2','items':items},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
 print('Financial snapshots: '+str(len(items))+' available; '+str(stats),flush=True)
if __name__=='__main__':main()
