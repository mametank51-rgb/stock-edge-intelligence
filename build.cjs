const fs=require('node:fs');
const {spawnSync}=require('node:child_process');
if(!process.env.STOCK_EDGE_SKIP_FEEDS){
 const python=process.env.STOCK_EDGE_PYTHON||(process.platform==='win32'?'python':'python3');
 for(const script of ['verify-community.py','collect-community.py','sync-community.py']){
  const result=spawnSync(python,[script],{stdio:'inherit',timeout:120000});
  if(result.error||result.status!==0){if(script==='collect-community.py')console.warn('Blog refresh unavailable; keeping the saved snapshot.');else throw result.error||Error('Could not embed blog snapshot');}
 }
}
fs.mkdirSync('public',{recursive:true});
fs.copyFileSync('index.html','public/index.html');
fs.copyFileSync('community-data.json','public/community-data.json');
fs.writeFileSync('public/.nojekyll','');
console.log('GitHub Pages files ready: public/index.html');
