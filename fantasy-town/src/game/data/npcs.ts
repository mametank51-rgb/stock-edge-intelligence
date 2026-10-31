import {appearancePresets} from '../characters/definitions';import type {NpcDefinition,MovementType} from '../npc/types';import type {Profession,Race} from '../characters/definitions';
import {ORIGINAL_OFFSET_X} from '../world/collision';
function npc(id:string,name:string,role:string,x:number,y:number,race:Race,profession:Profession,preset:number,movementType:MovementType,line:string,extra:Partial<NpcDefinition>={}):NpcDefinition{return {id,name,role,x,y,race,profession,appearance:{...appearancePresets[preset%appearancePresets.length]},movementType,dialogueSet:[line],interactionRadius:90,...extra}}
export const npcDefinitions:NpcDefinition[]=[
 npc('guard_north','ロウェン','衛兵',740,265,'Human','Warrior',0,'PATROL','町の外へ行くなら、支度をしておけ。',{patrolPoints:[{x:740,y:265},{x:835,y:265}],art:'guard'}),
 npc('guard_south','ブラム','衛兵',830,680,'Dwarf','Warrior',2,'PATROL','南の道は穏やかだが、油断は禁物だ。',{patrolPoints:[{x:830,y:680},{x:830,y:760}]}),
 npc('smith','ドラン','鍛冶屋',880,695,'Dwarf','Craftsman',2,'STATIC','北の鉱山から、良い鉄が届くといいんだがな。'),
 npc('innkeeper','マレナ','宿屋主人',566,250,'Human','Merchant',1,'STATIC','旅の疲れは、温かい食事で癒やすのが一番よ。'),
 npc('merchant','セラ','商人',944,405,'Elf','Merchant',1,'STATIC','今日は森の向こうから布が届いたの。'),
 npc('trader','オズ','行商人',1020,415,'Human','Merchant',3,'STATIC','市が立つ日は、いろんな話が集まるんだ。'),
 npc('traveler','フィン','旅人',620,465,'Elf','Archer',0,'WANDER','森の奥で妙な光を見たよ。',{wanderRadius:35}),
 npc('villager','エダ','村人',703,500,'Human','Merchant',3,'WANDER','噴水の音を聞くと、なんだか落ち着くわ。',{wanderRadius:30,art:'townswoman'}),
 npc('farmer','ハル','農民',560,690,'Human','Craftsman',0,'WANDER','今年は雨がちょうど良かったよ。',{wanderRadius:25}),
 npc('priest','エリス','僧侶',891,260,'Elf','Priest',1,'STATIC','旅の道に、静かな光がありますように。'),
 npc('fisher','コル','漁師',365,580,'Human','Archer',2,'STATIC','川が澄んでいる日は、魚の影が見えるんだ。'),
 npc('craftsman','トマ','職人',865,585,'Dwarf','Craftsman',0,'WANDER','良い道具は、手入れをすれば長持ちする。',{wanderRadius:25}),
 npc('elder','オルナ','長老',404,300,'Human','Priest',3,'STATIC','この町の木々は、昔から旅人を見守っている。'),
 npc('child','ミア','子ども',610,390,'Human','Rogue',1,'WANDER','橋の向こうまで競争しよう！',{wanderRadius:25}),
];

// Source-image coordinates are projected into the appropriate district once.
const districtOffsets:Record<string,{x:number;y:number}>={elder:{x:-330,y:0},child:{x:1685,y:0},farmer:{x:405,y:853},craftsman:{x:1140,y:853},guard_south:{x:-330,y:853}};
export const townNpcs:NpcDefinition[]=npcDefinitions.map(d=>{const offset=districtOffsets[d.id]??{x:ORIGINAL_OFFSET_X,y:0};return {...d,x:d.x+offset.x,y:d.y+offset.y,patrolPoints:d.patrolPoints?.map(p=>({x:p.x+offset.x,y:p.y+offset.y}))}});
