import {isSafe} from './model';
/** User feedback only; the authoritative engine still validates every attack. */
export function attackUnavailable(input:{dead:boolean;hasTarget:boolean;targetDead:boolean;distance:number;
 range:number;mana:number;cost:number;remaining:number;x:number;y:number}) {
 if(input.dead)return '倒れている間は攻撃できません。';
 if(!input.hasTarget||input.targetDead)return '敵をクリック・タップ、または Tab で選んでください。';
 if(isSafe(input.x,input.y))return '町の安全地帯では攻撃できません。';
 if(input.distance>input.range)return '攻撃が届きません。もう少し近づいてください。';
 if(input.mana<input.cost)return 'MP が足りません。魔力の薬か戦闘外の回復を利用してください。';
 if(input.remaining>0)return '次の攻撃を準備しています。';
 return null;
}
export function cycleTarget(ids:string[],current:string|null):string|null {
 if(!ids.length)return null;
 return ids[(ids.indexOf(current??'')+1)%ids.length];
}
