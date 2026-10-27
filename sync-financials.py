from pathlib import Path
import json,re
root=Path(__file__).resolve().parent
rows={}
for p in (root/'financial-data').glob('*.json'):
 if p.name=='index.json':continue
 try:
  r=json.loads(p.read_text(encoding='utf-8'));r['annual']=r['annual'][-2:];rows[r['code']]=r
 except (ValueError,KeyError):pass
s=(root/'index.html').read_text(encoding='utf-8')
s=re.sub(r'<!-- FINANCIAL SEED -->[\s\S]*?<!-- /FINANCIAL SEED -->','',s)
marker='<!-- FINANCIAL SEED --><script>window.FINANCIAL_SNAPSHOT='+json.dumps(rows,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')+';</script><!-- /FINANCIAL SEED -->\n'
s=s.replace('</head>',marker+'</head>')
(root/'index.html').write_text(s,encoding='utf-8');(root/'STOCK_EDGE_INTELLIGENCE_EVOLVED.html').write_text(s,encoding='utf-8')
print('Financial standalone seed:',len(rows),'companies')
