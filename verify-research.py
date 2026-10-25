import unittest
from research_extract import ArticleParser,evidence,subjects,allowed_article,structured_statement
class ResearchTests(unittest.TestCase):
 def test_body_scope(self):
  p=ArticleParser();p.feed('<nav>割安の広告</nav><div class="article-body entry-content"><p>会社の営業利益は増益。</p><script>赤字</script><aside>広告</aside><p>価格改定の効果。</p></div><footer>投資リスク</footer><div class="article-body">別の記事</div>')
  self.assertIn('増益',p.text());self.assertNotIn('広告',p.text());self.assertNotIn('赤字',p.text());self.assertNotIn('別の記事',p.text());self.assertNotIn('投資リスク',p.text())
 def test_subjects_no_years_or_amounts(self):
  self.assertEqual(subjects('2026年度 投資成績','利益7203円 1764(5292) 2020/8 2001(6003)'),[])
  self.assertEqual(subjects('2026/8期 3481三菱地所物流リート投資法人','')[0]['code'],'3481')
  self.assertEqual(subjects('主力概況、アメイズ。','38位 6076 アメイズ (福証、11月優待)')[0]['code'],'6076')
  self.assertEqual(len(subjects('7203トヨタ、6758ソニーを比較','',code='7203',company='トヨタ')),2)
 def test_negation_and_missing(self):
  r=evidence('割安ではない','増益ではない。リスクはない。')
  self.assertTrue(all(c['polarity']=='unclear' for c in r['claims']))
  self.assertEqual(evidence('投資の考え方','') ['subjects'],[])
  self.assertFalse(any(c['kind']=='risk' for c in evidence('増益','好調です')['claims']))
 def test_allowlist_and_budget(self):
  source={'home':'https://example.com/author/'}
  self.assertTrue(allowed_article('https://example.com/author/post',source))
  for url in ['http://example.com/author/post','https://example.com/other/post','https://evil.com/author/post','https://user:secret@example.com/author/post']:self.assertFalse(allowed_article(url,source))
  r=evidence('銘柄分析','割安 増益 増配 TOB リスク なら買う。'+'新規出店。'*200)
  self.assertLessEqual(sum(len(c['excerpt']) for c in r['claims']),340)
 def test_generic_slogans_are_not_company_evidence(self):
  r=evidence('企業研究','PF時価総額38位の銘柄です。PER12倍で割安と考えます。リスク・リワードが優れた最強で最上の銘柄か、何か見逃している弱点はないか。会社計画通りなら増益の場合には上昇も考えられます。')
  self.assertIn('PER12倍',next(c['excerpt'] for c in r['claims'] if c['kind']=='valuation'))
  self.assertFalse(any(c['kind']=='risk' for c in r['claims']))
  self.assertEqual(next(c for c in r['claims'] if c['kind']=='condition')['conditionType'],'assumption')
 def test_negated_risks_and_truncation(self):
  for sentence in ['指標的な割高感もありませんし、優待も魅力です','大きな減益はありません','リスクはない','懸念は見られない']:
   r=evidence('企業研究',sentence)
   self.assertFalse(any(c['kind']=='risk' or c['polarity']=='caution' for c in r['claims']),sentence)
  r=evidence('企業研究','割高感はないが、需要減による減益懸念がある')
  self.assertTrue(any(c['kind']=='risk' and c['polarity']=='caution' for c in r['claims']))
  r=evidence('企業研究','PER12倍で割安と考える'+('長い理由'*50))
  self.assertTrue(next(c for c in r['claims'] if c['kind']=='valuation')['excerpt'].endswith('…'))
 def test_period_and_nature_and_units(self):
  r=structured_statement('2026年3月期の実績は営業利益が前期比20%増となりました')
  self.assertEqual(r['nature'],'actual');self.assertEqual(r['periodEnd'],'2026-03-31');self.assertEqual(r['metrics'][0]['value'],20);self.assertEqual(r['metrics'][0]['unit'],'%')
  r=structured_statement('2027年3月期の会社予想は営業利益が前期比10%減を見込む')
  self.assertEqual(r['nature'],'forecast');self.assertEqual(r['metrics'][0]['value'],-10)
  r=structured_statement('今期予想PER11.31、PBR1.52、配当利回り4.0%')
  self.assertEqual(r['periodEnd'],'');self.assertEqual(r['metrics'][0]['measure'],'per');self.assertEqual(r['metrics'][0]['nature'],'forecast')
  r=structured_statement('2025年3月期実績と2026年3月期予想を比較する')
  self.assertEqual(r['nature'],'mixed');self.assertEqual(r['periodEnd'],'')
  self.assertEqual(structured_statement('PER10～15倍が想定レンジ')['metrics'],[])
 def test_growth_is_not_taken_from_a_neighboring_metric(self):
  r=structured_statement('2026年3月期実績は営業利益10億円、純利益が前期比20%増となりました')
  self.assertFalse(any(m['measure']=='operatingProfitGrowth' for m in r['metrics']))
  r=structured_statement('2026年3月期実績は売上高100億円、営業利益が前期比30%増となりました')
  self.assertFalse(any(m['measure']=='revenueGrowth' for m in r['metrics']))
  self.assertEqual(next(m for m in r['metrics'] if m['measure']=='operatingProfitGrowth')['value'],30)
 def test_annual_quarterly_and_half_year_periods_are_distinct(self):
  for sentence,scope in [('2026年3月期の実績は営業利益が前期比20%増となりました','annual'),('2026年3月期第1四半期の実績は営業利益が前年比20%増となりました','quarter'),('2026年3月期2Q累計の実績は営業利益が前年比20%増となりました','quarter'),('2026年3月期上期の実績は営業利益が前年比20%増となりました','half'),('2026年3月期第1四半期実績と通期計画を比較する','mixed'),('営業利益が前年比20%増となりました','unknown')]:
   self.assertEqual(structured_statement(sentence)['periodScope'],scope,sentence)
if __name__=='__main__':unittest.main()
