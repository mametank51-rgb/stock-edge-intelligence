from pathlib import Path
p=Path('index.html');s=p.read_text(encoding='utf-8')
start=s.index('let voiceUiVersion=');end=s.index('function voiceStanceLabel(',start)
s=s[:start]+Path('voice-ui.js').read_text(encoding='utf-8')+'\n'+Path('research-ui.js').read_text(encoding='utf-8')+'\n'+Path('paper-lab-ui.js').read_text(encoding='utf-8')+'\n'+Path('app-features-ui.js').read_text(encoding='utf-8')+'\n'+s[end:]
start=s.index('<script>/* Pure presentation model');end=s.index('</script>',start)
s=s[:start]+'<script>'+Path('voice-view.js').read_text(encoding='utf-8')+s[end:]
# The first legacy dashboard is in a separate module scope, not the live app.
first=s.index('    ${voiceHomeOverview()}')
if first<s.index('const state ='):s=s[:first]+s[first:].replace('    ${voiceHomeOverview()}\n','',1)
p.write_text(s,encoding='utf-8');Path('STOCK_EDGE_INTELLIGENCE_EVOLVED.html').write_text(s,encoding='utf-8')
print('Voice source and HTML synchronized.')
