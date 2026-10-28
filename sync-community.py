from pathlib import Path
import json
p=Path('index.html');s=p.read_text(encoding='utf-8')
marker='<!-- ORIGINAL BLOG FEEDS -->'
if marker in s:
 start=s.index(marker);end=s.index('<!-- /ORIGINAL BLOG FEEDS -->',start)+len('<!-- /ORIGINAL BLOG FEEDS -->')
 s=s[:start].rstrip()+'\n'+s[end:].lstrip('\r\n')
payload=Path('community-data.json').read_text(encoding='utf-8').replace('</','<\\/')
script=marker+'\n<script>'+Path('performance-core.js').read_text(encoding='utf-8')+'\n'+Path('market-clock.js').read_text(encoding='utf-8')+'\n'+Path('intraday-data.js').read_text(encoding='utf-8')+'\n'+Path('short-indicators.js').read_text(encoding='utf-8')+'\n'+Path('short-analysis.js').read_text(encoding='utf-8')+'\n'+Path('stock-names.js').read_text(encoding='utf-8')+'\n'+Path('stock-registry.js').read_text(encoding='utf-8')+'\n'+Path('forecast-model.js').read_text(encoding='utf-8')+'\n'+Path('technical-explain.js').read_text(encoding='utf-8')+'\n'+Path('fundamental-model.js').read_text(encoding='utf-8')+'\n'+Path('chart-overlays.js').read_text(encoding='utf-8')+'\n'+Path('short-technical.js').read_text(encoding='utf-8')+'\n'+Path('market-integrity.js').read_text(encoding='utf-8')+'\n'+Path('chart-snapshot.js').read_text(encoding='utf-8')+'\n'+Path('paper-engine.js').read_text(encoding='utf-8')+'\n'+Path('voice-research.js').read_text(encoding='utf-8')+'\n'+Path('community-runtime.js').read_text(encoding='utf-8')+'\nStockEdgeCommunity.setSeed('+payload+');</script>\n<!-- /ORIGINAL BLOG FEEDS -->\n'
start=s.index('<script>/* Pure presentation model')
s=s[:start]+script+s[start:]
start=s.index('<script>/* Deterministic research model');end=s.index('</script>',start)
s=s[:start]+'<script>'+Path('edge-model.js').read_text(encoding='utf-8')+s[end:]
p.write_text(s,encoding='utf-8')
Path('STOCK_EDGE_INTELLIGENCE_EVOLVED.html').write_text(s,encoding='utf-8')
print('Original-blog seed and model embedded in HTML.')
