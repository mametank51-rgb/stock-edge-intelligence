import unittest
from datetime import datetime, timezone
from importlib.util import spec_from_file_location, module_from_spec
from pathlib import Path
spec=spec_from_file_location('collector',Path(__file__).with_name('collect-community.py'))
C=module_from_spec(spec);spec.loader.exec_module(C)
class FeedTests(unittest.TestCase):
 def setUp(self):
  self.source={'id':'fixture','owner':'writer','name':'テスト','style':'企業分析','home':'https://example.com/','feed':'https://example.com/rss'}
  self.rows=[{'code':'7203','name':'TOYOTA'},{'code':'9434','name':'SOFTBANK'},{'code':'9984','name':'SOFTBANK GROUP'}]
  self.aliases={'7203':'トヨタ自動車','9434':'ソフトバンク','9984':'ソフトバンクグループ'}
  self.now=datetime(2026,10,25,tzinfo=timezone.utc)
 def parse(self,xml):return C.parse_feed(xml.encode(),self.source,self.rows,self.aliases,self.now)
 def test_rdf_and_unmatched_smallcaps(self):
  xml='''<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/"><item><title>小型株の決算分析（6076）</title><link>https://example.com/analysis</link><dc:date>2026-10-24T12:00:00+09:00</dc:date><description>&lt;b&gt;増益の理由&lt;/b&gt;</description></item></rdf:RDF>'''
  p=self.parse(xml)[0];self.assertEqual(p['code'],'');self.assertEqual(p['scope'],'market');self.assertEqual(p['summary'],'増益の理由')
 def test_atom(self):
  p=self.parse('<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>トヨタ自動車の決算分析</title><link href="https://example.com/t"/><published>2026-10-24T00:00:00Z</published></entry></feed>')[0]
  self.assertEqual(p['code'],'7203')
 def test_mapping_and_dates(self):
  self.assertEqual(C.match_codes('2026年 利益7203円 株式投資',self.rows,self.aliases),[])
  self.assertEqual(C.match_codes('株価（7203.50円）',self.rows,self.aliases),[])
  self.assertEqual(C.match_codes('トヨタ自動車の決算',self.rows,self.aliases)[0][0],'7203')
  self.assertEqual(C.match_codes('ソフトバンクグループの株',self.rows,self.aliases),[('9984','ソフトバンクグループ')])
  self.assertEqual(C.match_codes('銘柄コード7203 の決算',self.rows,self.aliases)[0][0],'7203')
  self.assertIsNone(C.date_iso('not a date'));self.assertIsNone(C.date_iso('2026-10-24'))
 def test_filter_and_security(self):
  self.assertFalse(C.investment_item('温泉旅行記','旅行','投資についても書きます'))
  self.assertTrue(C.investment_item('温泉企業の株価分析','旅行',''))
  self.assertFalse(C.valid_url('https://user:secret@example.com/'))
  self.assertEqual(C.plain('<script>bad()</script><b>投資</b>'),'投資')
  with self.assertRaises(ValueError):self.parse('<!DOCTYPE rss [<!ENTITY xx "bad">]><rss/>')
  xml='<rss><channel><item><title>投資考察</title><link>javascript:alert(1)</link><pubDate>Sat, 24 Oct 2026 00:00:00 GMT</pubDate></item><item><title>株の話</title><link>https://example.com/future</link><pubDate>Sat, 24 Oct 2027 00:00:00 GMT</pubDate></item></channel></rss>'
  self.assertEqual(self.parse(xml),[])
if __name__=='__main__':unittest.main()
