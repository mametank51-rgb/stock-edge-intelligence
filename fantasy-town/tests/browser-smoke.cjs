const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const url=process.env.GAME_URL||'http://127.0.0.1:5178';
async function instrument(context){
 await context.addInitScript(()=>{
  window.__probe={positions:[],items:null,preview:null};
  window.addEventListener('town-position',e=>{window.__probe.positions.push(e.detail);if(window.__probe.positions.length>100)window.__probe.positions.shift()});
  window.addEventListener('town-items-update',e=>window.__probe.items=e.detail.player);
  window.addEventListener('town-character-preview',e=>window.__probe.preview=e.detail);
 });
}
async function main(){
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const errors=[];
 try{
  const context=await browser.newContext({viewport:{width:1280,height:800}});await instrument(context);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>window.__probe?.positions.length>1&&window.__probe.preview);
  assert.equal(await page.locator('.loading-screen').count(),0);
  assert.equal(await page.locator('#game canvas').count(),1);
  const position=()=>page.evaluate(()=>window.__probe.positions.at(-1));
  let a=await position();await page.keyboard.down('ArrowRight');await page.waitForTimeout(350);await page.keyboard.up('ArrowRight');await page.waitForTimeout(300);
  let b=await position();assert.ok(b.x-a.x>10,'Keyboard moves player');
  await page.locator('.attack-button').click();await page.waitForTimeout(100);
  assert.match(await page.locator('.craft-toast').innerText(),/敵を/);
  await page.locator('.chat-form input').focus();a=await position();await page.keyboard.type('wasd');await page.waitForTimeout(400);b=await position();assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<2,'Chat typing must not move player');await page.keyboard.press('Escape');
  await page.keyboard.press('i');await page.locator('.item-slot[aria-label="鉄の剣"]').dblclick();await page.waitForTimeout(200);
  await page.keyboard.press('c');const portrait=page.locator('.paper-portrait');await portrait.waitFor();assert.ok((await portrait.getAttribute('src')).startsWith('data:image/png'));
  await page.locator('.equip-slot').filter({hasText:'利き手'}).click();await page.locator('.item-detail button').filter({hasText:'装備解除'}).click();await page.waitForTimeout(200);
  assert.equal(await page.locator('.item-detail button').count(),0,'Unequip must clear stale actions');
  assert.equal(await page.locator('.equip-slot').filter({hasText:'利き手'}).isDisabled(),true);
  await page.locator('.appearance-open').click();await page.selectOption('[name="profession"]','Mage');await page.waitForTimeout(100);await page.keyboard.press('Escape');
  await page.reload();await page.waitForFunction(()=>window.__probe?.positions.length>1);
  await page.locator('[data-window="設定"]').click();assert.match(await page.locator('.menu-information').innerText(),/WASD/);
  a=await position();await page.keyboard.down('ArrowRight');await page.waitForTimeout(300);await page.keyboard.up('ArrowRight');await page.waitForTimeout(300);b=await position();assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<2,'Modal must stop world input');
  await page.locator('input[aria-label="表示倍率"]').fill('1.25');assert.match(await page.locator('.zoom-control output').innerText(),/1.25/);
  const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'記録を書き出す'}).click();const download=await downloadEvent;const backup=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(backup.version,1);assert.ok(backup.items.inventory.items.length>0);
  page.on('dialog',dialog=>dialog.accept());
  await page.locator('.backup-controls input[type="file"]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{broken')});
  await page.waitForFunction(()=>document.querySelector('.backup-controls [role="status"]').textContent.includes('復元できません'));
  backup.skills.mining=9;
  await page.locator('.backup-controls input[type="file"]').setInputFiles({name:'save.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
  await page.waitForFunction(()=>window.__probe?.positions.length>1&&!document.querySelector('.loading-screen'));
  await page.locator('[data-window="スキル"]').click();assert.match(await page.locator('.skill-list').innerText(),/9 回/);await page.keyboard.press('Escape');
  await page.keyboard.press('c');await page.locator('.appearance-open').click();assert.equal(await page.locator('[name="profession"]').inputValue(),'Mage','Profile persists across reload');await page.keyboard.press('Escape');
  await page.keyboard.press('e');await page.locator('.dialogue:not([hidden])').waitFor();await page.keyboard.press('Escape');await page.locator('.dialogue[hidden]').waitFor({state:'attached',timeout:2000});
  const requests=await page.evaluate(()=>performance.getEntriesByType('resource').filter(x=>x.name.includes('/assets/characters/')).map(x=>x.name));assert.equal(requests.length,11,'All packed character sheets load');
  fs.mkdirSync(path.join(__dirname,'../evidence'),{recursive:true});
  await page.screenshot({path:path.join(__dirname,'../evidence/desktop.png')});
  console.log('PASS: desktop movement, input guard, equipment, live portrait, saved profile, help, zoom and NPC conversation');

  const mobile=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});await instrument(mobile);
  const touch=await mobile.newPage();touch.on('pageerror',e=>errors.push(e.message));await touch.goto(url);await touch.waitForFunction(()=>window.__probe?.positions.length>1);
  assert.equal(await touch.locator('.stick').isVisible(),true);
  const stick=await touch.locator('.stick').boundingBox();a=await touch.evaluate(()=>window.__probe.positions.at(-1));
  await touch.mouse.move(stick.x+stick.width/2,stick.y+stick.height/2);await touch.mouse.down();await touch.mouse.move(stick.x+stick.width*.9,stick.y+stick.height/2);await touch.waitForTimeout(400);await touch.mouse.up();await touch.waitForTimeout(300);b=await touch.evaluate(()=>window.__probe.positions.at(-1));assert.ok(b.x-a.x>10,'Touch stick moves player');
  await touch.locator('[data-window="キャラクター"]').tap();assert.equal(await touch.locator('.paper-portrait').isVisible(),true);
  const box=await touch.locator('.item-window').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=391,'Equipment fits portrait screen');
  await touch.screenshot({path:path.join(__dirname,'../evidence/mobile-portrait.png')});
  await touch.locator('.item-close').tap();await touch.setViewportSize({width:844,height:390});await touch.waitForTimeout(300);await touch.screenshot({path:path.join(__dirname,'../evidence/mobile-landscape.png')});
  console.log('PASS: touch controls, portrait equipment layout and landscape resize');
  const recovery=await browser.newContext();const failure=await recovery.newPage();await failure.route('**/assets/characters/guard.png',route=>route.abort());
  await failure.goto(url);await failure.locator('.loading-screen[role="alert"]').waitFor();assert.match(await failure.locator('.loading-screen').innerText(),/読み込めません/);
  await failure.unroute('**/assets/characters/guard.png');await failure.locator('.loading-screen button').click();await failure.waitForFunction(()=>!document.querySelector('.loading-screen'));await recovery.close();
  console.log('PASS: offline backup export/import, invalid import refusal, asset failure and reload recovery');
  assert.deepEqual(errors,[],'No browser runtime errors');
 }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
