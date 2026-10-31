import {appendBackupControls} from './BackupControls';
import {installInputGuard} from '../input/InputGuard';
import type {SkillLevels} from '../crafting/data';
const skillNames:Record<string,string>={woodcutting:'木こり',mining:'採掘',fishing:'釣り',herbalism:'薬草採取',fiber:'繊維採取',smithing:'鍛冶',tailoring:'裁縫',carpentry:'大工',cooking:'料理'};
const symbols:Record<string,string>={
 '持ち物':'<path d="M7 8V5h10v3M4 8h16v13H4zM4 12h16M9 8v5h6V8"/>',
 'キャラクター':'<path d="M9 4h6v6H9zM7 12h10l3 9H4zM10 12v9M14 12v9"/>',
 'スキル':'<path d="m5 20 14-14M16 3l5 5M4 12l8 8M3 21l4-1-3-3zM12 3v4M6 5l2 2"/>',
 '設定':'<path d="M5 3v18M12 3v18M19 3v18M2 8h6M9 16h6M16 7h6"/>'
};
export function installJourneyUI(root:HTMLElement) {
 installInputGuard(root);
 for(const button of Array.from(root.querySelectorAll<HTMLButtonElement>('[data-window]'))){
  const shape=symbols[button.dataset.window!];
  if(shape)button.querySelector('span')!.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.3">${shape}</svg>`;
 }
 const loading=document.createElement('section');loading.className='loading-screen';loading.setAttribute('role','status');
 loading.innerHTML='<div class="loading-card panel"><small>ASHENVALE</small><h1>灰樹の町</h1><p>旅の支度をしています…</p><progress max="1" value="0"></progress><button hidden>再読み込み</button></div>';
 root.append(loading);
 const loadText=loading.querySelector('p')!,progress=loading.querySelector('progress')!,retry=loading.querySelector('button')!;
 retry.addEventListener('click',()=>location.reload());
 window.addEventListener('town-loading',((e:CustomEvent<{progress:number;error?:string}>)=>{
  progress.value=e.detail.progress;
  if(e.detail.error){loadText.textContent=e.detail.error;retry.hidden=false;progress.hidden=true;loading.setAttribute('role','alert')}
 }) as EventListener);
 window.addEventListener('town-ready',()=>loading.remove());

 const modal=root.querySelector<HTMLElement>('.modal-backdrop')!,content=document.createElement('div');
 content.className='menu-information';content.hidden=true;root.querySelector('.modal')!.append(content);
 let skills:SkillLevels={};let page='';
 const render=()=>{
  content.replaceChildren();
  if(page==='スキル'){
   const intro=document.createElement('p');intro.textContent='採取・製作の経験回数です。手しごとから素材とレシピを確認できます。';content.append(intro);
   const list=document.createElement('dl');list.className='skill-list';
   for(const [id,name] of Object.entries(skillNames)){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=`${skills[id as keyof SkillLevels]??0} 回`;list.append(dt,dd)}content.append(list);
  }else{
   content.innerHTML='<p class="connection-explanation"></p><label class="zoom-control">表示倍率 <input aria-label="表示倍率" type="range" min="0.65" max="1.5" step="0.05" value="1"><output>1.00 ×</output></label><dl class="controls-list"><dt>移動 / 走る</dt><dd>WASD・矢印 / Shift</dd><dt>会話 / 拾う</dt><dd>E / F（近づいて操作）</dd><dt>敵を選ぶ / 攻撃</dt><dd>クリック・Tab / Space</dd><dt>持ち物 / 人物</dt><dd>I / C</dd><dt>チャット / 閉じる</dt><dd>Enter / Esc</dd><dt>ズーム / Debug</dt><dd>ホイール / F3</dd></dl><p>タッチ操作：左のスティックで移動。人物・敵・地面の品物はタップで選択します。戦闘は「攻撃」を押してください。</p><p class="muted">持ち物・装備・製作経験と外見設定は端末に保存します。オンラインの持ち物は別管理です。町の外には敵がいます。</p>';
   content.querySelector('.connection-explanation')!.textContent=connectionText;
   const slider=content.querySelector<HTMLInputElement>('input')!,output=content.querySelector('output')!;slider.value=String(zoom);output.textContent=zoom.toFixed(2)+' ×';
   slider.addEventListener('input',()=>{window.dispatchEvent(new CustomEvent('town-camera-zoom',{detail:Number(slider.value)}))});appendBackupControls(content);
  }
 };
 let connectionText='Offline：探索・NPC・戦闘・採取・装備を端末内で遊べます。チャットと取引にはサーバー接続が必要です。';
 const chatInput=root.querySelector<HTMLInputElement>('.chat-form input')!,sendButton=root.querySelector<HTMLButtonElement>('.chat-form button')!;
 sendButton.disabled=true;chatInput.placeholder='Offline：通信は接続後';
 let zoom=1;
 const open=(name:string)=>{
  page=name;root.querySelector('#modal-title')!.textContent=name==='設定'?'設定・操作案内':name;
  root.querySelectorAll<HTMLElement>('.modal > p,.appearance-controls').forEach(p=>p.hidden=true);
  content.hidden=false;render();modal.hidden=false;
 };
 for(const name of ['設定','スキル'])root.querySelector(`[data-window="${name}"]`)!.addEventListener('click',()=>open(name));
 root.querySelector('[data-window="キャラクター"]')!.addEventListener('click',()=>content.hidden=true);
 window.addEventListener('town-open-appearance',()=>content.hidden=true);
 window.addEventListener('keydown',e=>{if(e.key==='?'&&!(e.target instanceof HTMLElement&&e.target.matches('input,textarea,select'))){e.preventDefault();open('設定')}});
 window.addEventListener('town-craft-state',((e:CustomEvent<{skills:SkillLevels}>)=>{skills=e.detail.skills;if(!modal.hidden&&page==='スキル')render()}) as EventListener);
 window.addEventListener('town-zoom-current',((e:CustomEvent<number>)=>{zoom=e.detail;const slider=content.querySelector<HTMLInputElement>('input[type="range"]');if(slider){slider.value=String(zoom);content.querySelector('output')!.textContent=zoom.toFixed(2)+' ×'}}) as EventListener);
 window.addEventListener('town-network-state',((e:CustomEvent<string>)=>{
  sendButton.disabled=e.detail!=='CONNECTED';chatInput.placeholder=e.detail==='CONNECTED'?'Enter で会話':'Offline：通信は接続後';
  connectionText=e.detail==='CONNECTED'?'Online：同じ町のプレイヤーとチャット・取引ができます。':e.detail==='CONNECTING'||e.detail==='RECONNECTING'?'接続を試みています。操作はそのまま続けられます。':'Offline：端末内の冒険を続けられます。チャットと取引にはサーバー接続が必要です。';
  const explanation=content.querySelector('.connection-explanation');if(explanation)explanation.textContent=connectionText;
 }) as EventListener);
 window.addEventListener('town-profile-current',((e:CustomEvent<{race:string;profession:string;preset:number}>)=>{
  for(const [key,value] of Object.entries(e.detail)){const select=root.querySelector<HTMLSelectElement>(`.appearance-controls [name="${key}"]`);if(select)select.value=String(value)}
 }) as EventListener);
 window.addEventListener('town-item-error',((e:CustomEvent<string>)=>{window.dispatchEvent(new CustomEvent('town-craft-message',{detail:e.detail}))}) as EventListener);
}
