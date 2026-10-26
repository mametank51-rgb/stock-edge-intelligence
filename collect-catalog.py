"""Read JPX's monthly XLSX with the standard library; publish a lazy-loaded catalog."""
from urllib.request import urlopen,Request
from pathlib import Path
from datetime import datetime,timezone
import zipfile,io,json,re,unicodedata,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parent
URL='https://www.jpx.co.jp/markets/statistics-equities/misc/tvdivq0000001vg2-att/data_j.xlsx'
def parse(raw):
 ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
 with zipfile.ZipFile(io.BytesIO(raw)) as z:
  strings=[''.join(n.itertext()) for n in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',ns)] if 'xl/sharedStrings.xml' in z.namelist() else []
  rows=[]
  for row in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).findall('.//m:sheetData/m:row',ns):
   values={}
   for c in row.findall('m:c',ns):
    v=c.find('m:v',ns);text=v.text if v is not None else ''.join(c.find('m:is',ns).itertext()) if c.find('m:is',ns) is not None else ''
    values[re.sub('[0-9]','',c.attrib.get('r',''))]=strings[int(text)] if c.attrib.get('t')=='s' and text else text
   code=str(values.get('B','')).removesuffix('.0').upper()
   if re.fullmatch(r'[1-9][0-9]{2}[0-9A-Z]',code):rows.append({'code':code,'name':unicodedata.normalize('NFKC',values.get('C','')).strip(),'market':values.get('D',''),'sector':values.get('F','') or '業種未取得','asOf':values.get('A','')})
 if len(rows)<3000 or len({r['code'] for r in rows})!=len(rows):raise ValueError('JPX catalog incomplete')
 return rows
def main():
 path=ROOT/'stock-catalog.json'
 if path.exists():
  try:
   old=json.loads(path.read_text(encoding='utf-8'))
   if (datetime.now(timezone.utc)-datetime.fromisoformat(old['fetchedAt'])).total_seconds()<7*86400:print('JPX catalog: saved monthly list reused');return
  except (ValueError,KeyError):pass
 try:
  with urlopen(Request(URL,headers={'User-Agent':'StockEdgeCatalog/1.0'}),timeout=15) as r:raw=r.read(5000000)
  rows=parse(raw);payload={'schema':'stock-edge-catalog-v1','source':URL,'fetchedAt':datetime.now(timezone.utc).isoformat(),'asOf':max(r['asOf'] for r in rows),'items':rows}
  path.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf-8');print('JPX catalog: '+str(len(rows))+' listings')
 except Exception:
  if not path.exists():raise
  print('JPX catalog refresh unavailable; saved list retained')
if __name__=='__main__':main()
