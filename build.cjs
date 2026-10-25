const fs=require('node:fs');
fs.mkdirSync('public',{recursive:true});
fs.copyFileSync('index.html','public/index.html');
fs.writeFileSync('public/.nojekyll','');
console.log('GitHub Pages files ready: public/index.html');
