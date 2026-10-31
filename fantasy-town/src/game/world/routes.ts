import {WORLD_BLOCKS} from './collision';
const STEP=10,COLS=275,ROWS=171;
export const destinations=[{id:'west',name:'西の森',x:205,y:505},{id:'east',name:'東の野原',x:2505,y:505},{id:'south',name:'南の野原',x:1405,y:1455}] as const;
const blocked=(x:number,y:number)=>WORLD_BLOCKS.some(([a,b,w,h])=>x+6>a&&x-6<a+w&&y+6>b&&y-6<b+h);
/** Grid navigation is for directions only; physics remains authoritative. */
export function findRoute(x:number,y:number,goalX:number,goalY:number):{x:number;y:number}[]{
 const cell=(v:number,max:number)=>Math.max(0,Math.min(max-1,Math.floor(v/STEP)));
 const start=cell(y,ROWS)*COLS+cell(x,COLS),goal=cell(goalY,ROWS)*COLS+cell(goalX,COLS);
 const parent=new Int32Array(COLS*ROWS).fill(-1),queue=new Int32Array(COLS*ROWS);let head=0,tail=0;queue[tail++]=start;parent[start]=start;
 while(head<tail&&parent[goal]===-1){const p=queue[head++],cx=p%COLS,cy=Math.floor(p/COLS);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=COLS||ny>=ROWS)continue;const n=ny*COLS+nx;if(parent[n]!==-1||blocked(nx*STEP+5,ny*STEP+5))continue;parent[n]=p;queue[tail++]=n}}
 if(parent[goal]===-1)return [];
 const route:{x:number;y:number}[]=[];for(let p=goal;p!==start;p=parent[p])route.push({x:(p%COLS)*STEP+5,y:Math.floor(p/COLS)*STEP+5});route.push({x,y});return route.reverse();
}
