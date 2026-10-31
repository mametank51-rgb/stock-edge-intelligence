const {spawnSync}=require('node:child_process');
const tests=['interpolation','network-state','network','combat','items','crafting','market','persistence','world-routes','player-experience'];
let failed=false;
for(const name of tests){
 const result=spawnSync(process.execPath,['tests/'+name+'.cjs'],{stdio:'inherit'});
 if(result.status!==0){failed=true;console.error('FAILED:',name,result.error??'')}
}
if(failed)process.exitCode=1;
else console.log('PASS: all '+tests.length+' logic/integration suites');
