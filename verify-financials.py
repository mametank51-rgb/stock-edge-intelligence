import importlib.util,copy,json
from pathlib import Path
from datetime import datetime,timezone
spec=importlib.util.spec_from_file_location('financials','collect-financials.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
now=datetime(2026,10,28,tzinfo=timezone.utc)
p={'asOfDate':'2026-03-31','periodType':'12M','currencyCode':'JPY','reportedValue':{'raw':100}}
b={'timeseries':{'result':[{'meta':{'symbol':['7203.T']},'annualTotalRevenue':[p]}]}}
r=m.parse(b,'7203','https://example.com',now);assert r['annual']==[{'date':'2026-03-31','TotalRevenue':100}]
for mutate in [lambda x:x['timeseries']['result'][0]['meta'].update(symbol=['7453.T']),lambda x:x['timeseries']['result'][0]['annualTotalRevenue'][0].update(currencyCode='USD'),lambda x:x['timeseries']['result'][0]['annualTotalRevenue'][0].update(periodType='3M'),lambda x:x['timeseries']['result'][0]['annualTotalRevenue'][0].update(asOfDate='2027-03-31')]:
 x=copy.deepcopy(b);mutate(x)
 try:m.parse(x,'7203','https://example.com',now)
 except ValueError:pass
 else:raise AssertionError('invalid identity, currency, period or future data accepted')
x=copy.deepcopy(b);x['timeseries']['result'][0]['annualTotalRevenue'].append({**p,'reportedValue':{'raw':200}})
try:m.parse(x,'7203','https://example.com',now)
except ValueError:pass
else:raise AssertionError('conflicting duplicate accepted')
assert m.profile('<link rel="canonical" href="https://finance.yahoo.co.jp/quote/7203.T/profile"><table><tr><th>業種分類</th><td>輸送用機器</td></tr></table>','7203')['sector']=='輸送用機器'
try:m.profile('<link rel="canonical" href="https://finance.yahoo.co.jp/quote/7453.T/profile">','7203')
except ValueError:pass
else:raise AssertionError('wrong company accepted')
print('PASS: financial collector rejects wrong identity/currency, partial and future periods, duplicate values; profile only accepts matching canonical code.')
