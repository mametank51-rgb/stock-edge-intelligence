// The public game and Worker, using a random room isolated from real players.
const assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const url=process.env.GAME_URL||'https://mametank51-rgb.github.io/stock-edge-intelligence/fantasy-town/';
const room='check_'+randomBytes(8).toString('hex');
const until=async(test)=>{const end=Date.now()+10000;while(!test()){if(Date.now()>end)throw Error('Expected online message timed out');await new Promise(r=>setTimeout(r,100))}};
async function main(){
 const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[],messages=[[],[]],contexts=[];
 try{
  const pages=[];
  for(let i=0;i<2;i++){
   const context=await browser.newContext({viewport:{width:1100,height:750}});contexts.push(context);
   await context.addInitScript(roomId=>{const Native=window.WebSocket;window.WebSocket=class extends Native{constructor(url,protocols){const target=new URL(String(url));if(target.hostname.endsWith('.workers.dev'))target.searchParams.set('room',roomId);super(target,protocols)}}},room);
   const page=await context.newPage();pages.push(page);
   page.on('pageerror',error=>errors.push(error.message));
   page.on('websocket',socket=>socket.on('framereceived',frame=>{try{messages[i].push(JSON.parse(frame.payload.toString()))}catch{}}));
   await page.goto(url);await page.waitForFunction(()=>document.querySelector('.network-status')?.textContent==='Online',null,{timeout:20000});
  }
  await until(()=>messages[0].some(m=>m.type==='PLAYER_JOIN'));
  assert.ok(messages[1].some(m=>m.type==='PLAYER_SNAPSHOT'&&m.players.length===1));
  await pages[0].bringToFront();await pages[0].keyboard.down('ArrowRight');await pages[0].waitForTimeout(500);await pages[0].keyboard.up('ArrowRight');
  await until(()=>messages[1].some(m=>m.type==='PLAYER_MOVE'));
  const chat=pages[0].locator('.chat-form input');await chat.fill('接続確認');await chat.press('Enter');
  await pages[1].waitForFunction(()=>document.querySelector('.chat-log')?.textContent.includes('接続確認'),null,{polling:100,timeout:10000});
  await contexts[1].close();contexts.pop();await until(()=>messages[0].some(m=>m.type==='PLAYER_LEAVE'));
  assert.deepEqual(errors,[]);console.log('PASS: public game with two separate browsers, join, movement, chat and leave');
 }finally{await Promise.all(contexts.map(c=>c.close()));await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
