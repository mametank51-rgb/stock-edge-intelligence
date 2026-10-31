import {destinations,findRoute} from '../world/routes';
type Point={x:number;y:number};
export class RouteFollower {
 private route:Point[]=[];private index=0;private last:Point={x:0,y:0};private stuck=0;
 constructor(private position:()=>Point){window.addEventListener('town-route-follow',this.start as EventListener);window.addEventListener('town-route-cancel',this.cancel)}
 private notice(text:string){window.dispatchEvent(new CustomEvent('town-route-status',{detail:text}))}
 private start=(event:CustomEvent<{id:string}>)=>{const goal=destinations.find(d=>d.id===event.detail.id);if(!goal)return;const p=this.position();this.route=findRoute(p.x,p.y,goal.x,goal.y);this.index=1;this.last={...p};this.stuck=0;this.notice(this.route.length?'案内に沿って移動中。スティックで中断できます。':'通れる道が見つかりません。少し移動して再度お試しください。')};
 private cancel=()=>{this.route=[]};
 update(manual:Point,delta:number,dead:boolean):Point {
  if(!this.route.length)return manual;
  if(dead||Math.hypot(manual.x,manual.y)>.05){this.cancel();this.notice(dead?'倒れたため移動を中断しました。':'案内移動を中断しました。');return manual}
  const p=this.position();while(this.index<this.route.length&&Math.hypot(this.route[this.index].x-p.x,this.route[this.index].y-p.y)<7)this.index++;
  if(this.index>=this.route.length){this.cancel();this.notice('目的地に到着しました。');return {x:0,y:0}}
  this.stuck+=delta;if(this.stuck>1500){if(Math.hypot(p.x-this.last.x,p.y-this.last.y)<4){this.cancel();this.notice('道に詰まりました。少し移動してから再度お試しください。');return {x:0,y:0}}this.stuck=0;this.last={...p}}
  const target=this.route[this.index],dx=target.x-p.x,dy=target.y-p.y,n=Math.hypot(dx,dy);return {x:dx/n,y:dy/n};
 }
 destroy(){window.removeEventListener('town-route-follow',this.start as EventListener);window.removeEventListener('town-route-cancel',this.cancel)}
}
