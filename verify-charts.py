import unittest
from datetime import datetime,timezone
from pathlib import Path
import importlib.util
spec=importlib.util.spec_from_file_location('collect_charts',Path(__file__).with_name('collect-charts.py'))
collector=importlib.util.module_from_spec(spec);spec.loader.exec_module(collector);snapshot=collector.snapshot

class ChartTests(unittest.TestCase):
 def body(self):
  values=[100+i for i in range(30)]
  return {'chart':{'result':[{'meta':{'symbol':'7453.T','currency':'JPY'},'timestamp':[1780272000+i*86400 for i in range(30)],'indicators':{'quote':[{'open':values,'high':[v+2 for v in values],'low':[v-2 for v in values],'close':values,'volume':[1000]*30}],'adjclose':[{'adjclose':[v/2 for v in values]}]}}]}}
 def test_complete_ohlcv_and_separate_adjusted_close(self):
  out=snapshot(self.body(),'7453','https://query1.finance.yahoo.com/v8/finance/chart/7453.T',datetime(2026,10,26,tzinfo=timezone.utc))
  self.assertEqual(len(out['rows']),30);self.assertEqual(out['rows'][0]['close'],100);self.assertEqual(out['rows'][0]['adjustedClose'],50)
 def test_identity_and_currency(self):
  for key,value in [('symbol','7203.T'),('currency','USD')]:
   body=self.body();body['chart']['result'][0]['meta'][key]=value
   with self.assertRaises(ValueError):snapshot(body,'7453','https://example.com')
 def test_invalid_rows_are_recorded(self):
  body=self.body();body['chart']['result'][0]['indicators']['quote'][0]['open'][0]=None
  out=snapshot(body,'7453','https://example.com');self.assertEqual(len(out['rows']),29);self.assertEqual(out['rejectedRows'],1)

if __name__=='__main__':unittest.main()
