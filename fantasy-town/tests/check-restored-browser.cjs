// Run after check-durable-restart setup and a Worker restart using the same storage.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const [room,id,resultFile]=process.argv.slice(2);
if(!room||!id||!resultFile)throw Error('Expected room player-id result-file');
const expected=JSON.parse(require('node:fs').readFileSync(resultFile,'utf8'));
async function main(){const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const context=await browser.newContext({viewport:{width:1100,height:750}});
 await context.addInitScript(({room,id})=>{
  localStorage.setItem('ashenvale.playerId',id);localStorage.setItem('ashenvale.playerName','古い端末名');
  const Native=window.WebSocket;window.WebSocket=class extends Native{constructor(url,protocols){const target=new URL(String(url));if(target.port==='8787')target.searchParams.set('room',room);super(target,protocols)}};
  window.addEventListener('town-position',e=>window.__position=e.detail);window.addEventListener('town-items-update',e=>window.__items=e.detail.player);
 },{room,id});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5179');await page.waitForFunction(()=>document.querySelector('.network-status')?.textContent==='Online',null,{timeout:15000});
 await page.waitForFunction(()=>window.__position?.x===1400&&window.__items?.equipment?.mainHand,null,{timeout:10000});
 assert.equal(await page.locator('.player-name').textContent(),'保存テスト');
 assert.equal(await page.evaluate(()=>window.__items.equipment.mainHand.instanceId),expected.sword);
 await page.keyboard.press('c');assert.match(await page.locator('.equip-slot').filter({hasText:'利き手'}).textContent(),/鉄の剣/);
 assert.deepEqual(errors,[]);console.log('PASS: browser restores saved name, position and equipment after Worker restart');await context.close();
 }finally{await browser.close()}}
main().catch(error=>{console.error(error);process.exitCode=1});
