// Run against local Vite configured with VITE_WS_URL and a local Wrangler Worker.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const url=process.env.GAME_URL||'http://127.0.0.1:5179';
async function main(){
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const errors=[],messages=[[],[]];
 try{
  const contexts=await Promise.all([browser.newContext(),browser.newContext()]),pages=[];
  for(let i=0;i<2;i++){
   await contexts[i].addInitScript(()=>{
    const Native=window.WebSocket;window.__sockets=[];window.__states=[];window.addEventListener('town-network-state',e=>window.__states.push(e.detail));
    window.WebSocket=class extends Native{constructor(...args){super(...args);window.__sockets.push(this)}};
   });
   const page=await contexts[i].newPage();pages.push(page);
   page.on('pageerror',error=>errors.push(error.message));
   page.on('websocket',socket=>socket.on('framereceived',frame=>{try{messages[i].push(JSON.parse(frame.payload.toString()))}catch{}}));
   await page.goto(url);await page.waitForFunction(()=>document.querySelector('.network-status')?.textContent==='Online');
  }
  assert.ok(messages[0].some(m=>m.type==='PLAYER_JOIN'));
  assert.ok(messages[1].some(m=>m.type==='PLAYER_SNAPSHOT'&&m.players.length===1));
  await pages[0].bringToFront();await pages[0].keyboard.down('ArrowRight');await pages[0].waitForTimeout(400);await pages[0].keyboard.up('ArrowRight');
  await pages[0].waitForTimeout(300);assert.ok(messages[1].some(m=>m.type==='PLAYER_MOVE'));
  const chat=pages[0].locator('.chat-form input');await chat.fill('町で会いましょう');await chat.press('Enter');
  await pages[1].waitForFunction(()=>document.querySelector('.chat-log')?.textContent.includes('町で会いましょう'));
  assert.equal(await chat.inputValue(),'');
  await pages[1].bringToFront();await pages[1].evaluate(()=>window.__sockets.find(s=>s.url.includes(':8787')).close());
  await pages[1].waitForFunction(()=>window.__states.includes('RECONNECTING')&&window.__states.filter(x=>x==='CONNECTED').length>=2,null,{polling:100,timeout:15000});
  assert.ok(messages[1].filter(m=>m.type==='PLAYER_SNAPSHOT').length>=2);
  assert.deepEqual(errors,[]);await Promise.all(contexts.map(c=>c.close()));
  console.log('PASS: 2 browser profiles, join, movement, chat and reconnect with local Worker');
 }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
