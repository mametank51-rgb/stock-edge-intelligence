import {destinations,findRoute} from '../world/routes';
import {WORLD_WIDTH,WORLD_HEIGHT} from '../world/Town';
export function installRouteGuide(root:HTMLElement){
 const map=root.querySelector<HTMLElement>('.map-art')!;
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`);svg.setAttribute('preserveAspectRatio','none');svg.classList.add('route-overlay');
 const path=document.createElementNS(svg.namespaceURI,'polyline');path.setAttribute('class','route-line');svg.append(path);map.append(svg);
 const controls=document.createElement('div');controls.className='route-controls';controls.setAttribute('aria-label','町の外への道案内');
 const hint=document.createElement('div');hint.className='route-hint';hint.textContent='行き先を選ぶと道順を表示';
 let position={x:1415,y:480},last={x:0,y:0},selected:typeof destinations[number]|null=null;
 const update=()=>{if(!selected)return;const route=findRoute(position.x,position.y,selected.x,selected.y);last={...position};path.setAttribute('points',route.map(p=>`${p.x},${p.y}`).join(' '));const near=Math.hypot(position.x-selected.x,position.y-selected.y)<35;hint.textContent=near?`${selected.name}に到着`:route.length?`${selected.name}まで金色の線を進む`:'道順を表示できません。少し移動して再度選んでください。'};
 for(const dest of destinations){const mark=document.createElement('span');mark.className='route-marker';mark.style.left=`${dest.x/WORLD_WIDTH*100}%`;mark.style.top=`${dest.y/WORLD_HEIGHT*100}%`;mark.textContent=dest.id==='west'?'西':dest.id==='east'?'東':'南';map.append(mark);const button=document.createElement('button');button.textContent=dest.name;button.addEventListener('click',()=>{selected=dest;follow.disabled=false;controls.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));update()});controls.append(button)}
 const follow=document.createElement('button');follow.textContent='案内に沿って歩く';follow.className='route-follow';follow.disabled=true;follow.addEventListener('click',()=>{if(selected)window.dispatchEvent(new CustomEvent('town-route-follow',{detail:selected}))});root.querySelector('.map')!.append(follow);
 const clear=document.createElement('button');clear.textContent='消す';clear.addEventListener('click',()=>{selected=null;follow.disabled=true;window.dispatchEvent(new Event('town-route-cancel'));path.removeAttribute('points');controls.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed','false'));hint.textContent='行き先を選ぶと道順を表示'});controls.append(clear);root.querySelector('.map')!.append(controls,follow,hint);
 window.addEventListener('town-route-status',((e:CustomEvent<string>)=>{hint.textContent=e.detail}) as EventListener);
 window.addEventListener('town-position',((event:CustomEvent<{x:number;y:number}>)=>{position=event.detail;if(selected&&Math.hypot(position.x-last.x,position.y-last.y)>60)update()}) as EventListener);
}
