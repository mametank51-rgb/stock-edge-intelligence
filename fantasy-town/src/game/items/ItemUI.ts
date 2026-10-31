import {ITEM_BY_ID} from './items';import {ItemAssetRegistry} from './ItemAssetRegistry';import type {EquipSlot,ItemAction,ItemInstance,ItemPlayer,Stats} from './model';
import {QUALITY_FACTOR} from '../crafting/quality';
const slots:EquipSlot[]=['head','chest','hands','legs','feet','mainHand','offHand','cape','accessory1','accessory2'];
const slotNames:Record<EquipSlot,string>={head:'頭',chest:'胴',hands:'手',legs:'脚',feet:'足',mainHand:'利き手',offHand:'盾',cape:'外套',accessory1:'装飾 1',accessory2:'装飾 2'};
export class ItemUI {
 private panel:HTMLElement;private content:HTMLElement;private detail:HTMLElement;private state:ItemPlayer|null=null;private stats:Stats|null=null;private selected:string|null=null;private mode:'inventory'|'equipment'='inventory';private selectedSlot:EquipSlot|null=null;private preview='';
 constructor(private root:HTMLElement){this.panel=document.createElement('section');this.panel.className='item-window panel';this.panel.hidden=true;this.panel.innerHTML='<header><div><small>ASHENVALE / BELONGINGS</small><h2></h2></div><button class="item-close" aria-label="閉じる">×</button></header><div class="item-summary"></div><div class="item-content"></div><div class="item-detail">品物を選んでください。</div>';root.append(this.panel);this.panel.setAttribute('role','dialog');this.panel.setAttribute('aria-label','持ち物と装備');window.addEventListener('town-character-preview',((e:CustomEvent<string>)=>{this.preview=e.detail;const image=this.panel.querySelector<HTMLImageElement>('.paper-portrait');if(image)image.src=this.preview}) as EventListener);this.content=this.panel.querySelector('.item-content')!;this.detail=this.panel.querySelector('.item-detail')!;this.panel.querySelector('.item-close')!.addEventListener('click',()=>this.panel.hidden=true);
 for(const [name,mode] of [['持ち物','inventory'],['キャラクター','equipment']] as const){const b=root.querySelector<HTMLButtonElement>(`[data-window="${name}"]`)!;b.addEventListener('click',e=>{e.stopImmediatePropagation();this.toggle(mode)},true)}
 window.addEventListener('town-items-update',((e:CustomEvent<{player:ItemPlayer;stats:Stats}>)=>{this.state=e.detail.player;this.stats=e.detail.stats;if(!this.panel.hidden)this.render()}) as EventListener);window.addEventListener('town-item-error',((e:CustomEvent<string>)=>{this.detail.textContent=e.detail}) as EventListener);
 window.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||e.target instanceof HTMLTextAreaElement)return;if(e.key.toLowerCase()==='i'){e.preventDefault();this.toggle('inventory')}else if(e.key.toLowerCase()==='c'){e.preventDefault();this.toggle('equipment')}else if(e.key==='Escape')this.panel.hidden=true});
 }
 private toggle(mode:'inventory'|'equipment'){if(!this.panel.hidden&&this.mode===mode){this.panel.hidden=true;return}this.mode=mode;this.selected=null;this.selectedSlot=null;this.panel.hidden=false;this.render()}
 private emit(action:ItemAction){window.dispatchEvent(new CustomEvent('town-item-action',{detail:action}))}
 private render(){if(!this.state)return;const {inventory,equipment}=this.state;this.panel.querySelector('h2')!.textContent=this.mode==='inventory'?'持ち物':'装備';this.panel.querySelector('.item-summary')!.textContent=`${inventory.items.length} / ${inventory.capacity} 枠　${inventory.currentWeight} / ${inventory.maxWeight} 重量　攻 ${this.stats?.attack??0}　防 ${this.stats?.defense??0}　魔 ${this.stats?.magicPower??0}　速 ${this.stats?.attackSpeed??0}`;this.content.replaceChildren();
 if(this.mode==='inventory'){const grid=document.createElement('div');grid.className='item-grid';for(let i=0;i<inventory.capacity;i++){const it=inventory.items[i],button=document.createElement('button');button.className='item-slot';button.setAttribute('aria-label',it?ITEM_BY_ID[it.definitionId]?.name??'品物':'空き枠');if(it){const def=ITEM_BY_ID[it.definitionId];if(!def)continue;button.dataset.rarity=def.rarity;button.dataset.itemId=it.instanceId;button.setAttribute('aria-pressed',String(this.selected===it.instanceId));const img=document.createElement('img');img.src=ItemAssetRegistry.icon(def);img.alt='';button.append(img);if(it.quantity>1){const n=document.createElement('span');n.className='item-count';n.textContent=String(it.quantity);button.append(n)}if(it.maxDurability){const bar=document.createElement('i');bar.style.width=`${Math.max(0,it.durability/it.maxDurability)*90}%`;button.append(bar)}button.addEventListener('click',()=>this.showItem(it));button.addEventListener('mouseenter',()=>this.showItem(it));button.addEventListener('focus',()=>this.showItem(it));button.addEventListener('dblclick',()=>{if(def.equipSlot)this.emit({action:'EQUIP',id:it.instanceId})})}else button.disabled=true;grid.append(button)}this.content.append(grid)}
 else{const figure=document.createElement('img');figure.className='paper-portrait';figure.alt='現在の外見と装備';if(this.preview)figure.src=this.preview;this.content.append(figure);const paper=document.createElement('div');paper.className='equipment-slots';for(const slot of slots){const button=document.createElement('button'),it=equipment[slot];button.className='equip-slot';button.textContent=`${slotNames[slot]}  ${it?ITEM_BY_ID[it.definitionId]?.name??it.definitionId:'—'}`;if(it)button.addEventListener('click',()=>{this.selectedSlot=slot;this.showEquipped(it,slot)});else button.disabled=true;paper.append(button)}this.content.append(paper);const appearance=document.createElement('button');appearance.className='appearance-open';appearance.textContent='外見設定';appearance.addEventListener('click',()=>{this.panel.hidden=true;window.dispatchEvent(new Event('town-open-appearance'))});this.content.append(appearance)}
 if(this.mode==='equipment'){
  const item=this.selectedSlot?equipment[this.selectedSlot]:undefined;
  if(item&&this.selectedSlot)this.showEquipped(item,this.selectedSlot);
  else {this.selectedSlot=null;this.selected=null;this.detail.textContent='装備スロットを選ぶと詳細と解除を表示します。'}
 }else{
  const item=inventory.items.find(i=>i.instanceId===this.selected);
  if(item)this.showItem(item);else{this.selected=null;this.detail.textContent='品物を選んでください。'}
 }

 }
 private showEquipped(item:ItemInstance,slot:EquipSlot){
  this.showItem(item);const remove=document.createElement('button');remove.textContent='装備解除';
  remove.addEventListener('click',()=>this.emit({action:'UNEQUIP',slot}));this.detail.append(remove);
 }
 private showItem(item:ItemInstance){
  const def=ITEM_BY_ID[item.definitionId];if(!def)return;
  this.selected=item.instanceId;
  this.content.querySelectorAll<HTMLElement>('[data-item-id]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.itemId===item.instanceId)));
  window.dispatchEvent(new CustomEvent('town-item-selected',{detail:item.instanceId}));
  this.detail.replaceChildren();
  const title=document.createElement('strong');title.textContent=def.name+'  ['+def.rarity+']';
  const info=document.createElement('p'),broken=item.maxDurability>0&&item.durability<=0;
  const stats=Object.entries(def.stats??{}).map(([k,v])=>k+' +'+(broken?0:Math.round(v*(QUALITY_FACTOR[item.quality]??1)))).join(' ');
  info.textContent=def.description+'\n'+def.category+' / 重量 '+def.weight+' / 品質 '+item.quality+(item.craftedBy?' / 製作者 '+item.craftedBy:'')+'\n耐久 '+(item.maxDurability?item.durability+'/'+item.maxDurability:'—')+(broken?'（補正無効）':'')+'  '+stats;
  this.detail.append(title,info);
  if(this.mode==='inventory'){
   const button=(label:string,fn:()=>void)=>{const b=document.createElement('button');b.textContent=label;b.addEventListener('click',fn);this.detail.append(b)};
   if(def.equipSlot)button('装備',()=>this.emit({action:'EQUIP',id:item.instanceId}));
   if(def.equipSlot==='accessory1')button('装飾 2 に装備',()=>this.emit({action:'EQUIP',id:item.instanceId,slot:'accessory2'}));
   if(def.category==='CONSUMABLE')button('使う',()=>this.emit({action:'USE',id:item.instanceId}));
   button('地面に置く',()=>{if(confirm(def.name+' を地面に置きますか？'))this.emit({action:'DROP',id:item.instanceId})});
  }
 }
}
