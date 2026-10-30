import type {MoveState} from './protocol';
export interface Sample {time:number;move:MoveState}
export function interpolate(a:Sample,b:Sample|undefined,now:number):MoveState {if(!b)return {...a.move};const t=Math.max(0,Math.min(1,(now-a.time)/Math.max(1,b.time-a.time)));return {x:a.move.x+(b.move.x-a.move.x)*t,y:a.move.y+(b.move.y-a.move.y)*t,direction:(t>=1?b:a).move.direction,movementState:(t>=1?b:a).move.movementState}}
