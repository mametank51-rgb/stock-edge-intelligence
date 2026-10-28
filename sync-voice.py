from pathlib import Path
p=Path('index.html');s=p.read_text(encoding='utf-8')
start=s.index('let voiceUiVersion=');end=s.index('function voiceStanceLabel(',start)
s=s[:start]+Path('voice-ui.js').read_text(encoding='utf-8')+'\n'+Path('research-ui.js').read_text(encoding='utf-8')+'\n'+Path('paper-lab-ui.js').read_text(encoding='utf-8')+'\n'+Path('update-targets-ui.js').read_text(encoding='utf-8')+'\n'+Path('app-features-ui.js').read_text(encoding='utf-8')+'\n'+Path('friendly-ui.js').read_text(encoding='utf-8')+'\n'+Path('analysis-ui.js').read_text(encoding='utf-8')+'\n'+Path('analysis-layout.js').read_text(encoding='utf-8')+'\n'+Path('fundamental-ui.js').read_text(encoding='utf-8')+'\n'+Path('chart-overlays-ui.js').read_text(encoding='utf-8')+'\n'+Path('detail-runtime.js').read_text(encoding='utf-8')+'\n'+s[end:]
start=s.index('<script>/* Pure presentation model');end=s.index('</script>',start)
s=s[:start]+'<script>'+Path('voice-view.js').read_text(encoding='utf-8')+s[end:]
a=s.index('const financialIntel=(()=>{');b=s.index('// ===== V4 DECISION',a)
s=s[:a]+Path('fundamental-runtime.js').read_text(encoding='utf-8')+'\n\n'+s[b:]
a=s.index('__modules.builtinMarket =');b=s.index('__modules.technicalEngine =',a)
s=s[:a]+Path('builtin-market.js').read_text(encoding='utf-8')+s[b:]
a=s.index('__modules.nikkei225 =');b=s.index('__modules.chart =',a)
s=s[:a]+Path('nikkei-runtime.js').read_text(encoding='utf-8')+s[b:]
a=s.index('__modules.chart = (() => {');b=s.index('__modules.market =',a)
s=s[:a]+Path('chart-renderer.js').read_text(encoding='utf-8')+s[b:]
a=s.index('function marketIntelCandidateRows(');b=s.index('function instantHome()',a)
s=s[:a]+Path('news-runtime.js').read_text(encoding='utf-8')+'\n'+s[b:]
# The first legacy dashboard is in a separate module scope, not the live app.
first=s.index('    ${voiceHomeOverview()}')
if first<s.index('const state ='):s=s[:first]+s[first:].replace('    ${voiceHomeOverview()}\n','',1)
import re
s=re.sub(r'\s*<style id="friendly-ui">[\s\S]*?</style>','',s)
s=s.replace('</head>','<style id="friendly-ui">\n'+Path('friendly-ui.css').read_text(encoding='utf-8')+'\n'+Path('analysis-ui.css').read_text(encoding='utf-8')+'\n'+Path('fundamental-ui.css').read_text(encoding='utf-8')+'\n'+Path('chart-overlays-ui.css').read_text(encoding='utf-8')+'\n</style>\n</head>')
p.write_text(s,encoding='utf-8');Path('STOCK_EDGE_INTELLIGENCE_EVOLVED.html').write_text(s,encoding='utf-8')
print('Voice source and HTML synchronized.')
