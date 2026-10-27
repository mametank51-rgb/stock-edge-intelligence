const fs=require('node:fs');
const {spawnSync}=require('node:child_process');
if(!process.env.STOCK_EDGE_SKIP_FEEDS){
 const python=process.env.STOCK_EDGE_PYTHON||(process.platform==='win32'?'python':'python3');
 for(const script of ['verify-community.py','verify-research.py','verify-charts.py','sync-voice.py','collect-community.py','sync-community.py','collect-charts.py','collect-long-charts.py','collect-catalog.py']){
  const result=spawnSync(python,[script],{stdio:'inherit',timeout:['collect-charts.py','collect-long-charts.py'].includes(script)?300000:120000});
  if(result.error||result.status!==0){if(['collect-community.py','collect-charts.py','collect-long-charts.py','collect-catalog.py'].includes(script))console.warn('Data refresh unavailable; keeping the saved snapshot.');else throw result.error||Error('Could not embed blog snapshot');}
 }
}
const syntax=spawnSync(process.execPath,['verify.cjs'],{stdio:'inherit'});
if(syntax.status!==0)throw Error('Generated HTML failed verification');
fs.mkdirSync('public',{recursive:true});
fs.copyFileSync('index.html','public/index.html');
fs.copyFileSync('community-data.json','public/community-data.json');
if(fs.existsSync('stock-catalog.json'))fs.copyFileSync('stock-catalog.json','public/stock-catalog.json');
if(fs.existsSync('chart-data'))fs.cpSync('chart-data','public/chart-data',{recursive:true});
if(fs.existsSync('chart-long-data'))fs.cpSync('chart-long-data','public/chart-long-data',{recursive:true});
fs.writeFileSync('public/.nojekyll','');
console.log('GitHub Pages files ready: public/index.html');
