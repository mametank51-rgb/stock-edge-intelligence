/* JPX sessions in JST. Holiday source: Cabinet Office (2026/2027 published calendar).
 * Unknown calendar years are explicitly unavailable, never assumed to be trading days. */
(function(root){'use strict';
const holidays=new Set([
 '2026-01-01','2026-01-12','2026-02-11','2026-02-23','2026-03-20','2026-04-29','2026-05-03','2026-05-04','2026-05-05','2026-05-06','2026-07-20','2026-08-11','2026-09-21','2026-09-22','2026-09-23','2026-10-12','2026-11-03','2026-11-23',
 '2027-01-01','2027-01-11','2027-02-11','2027-02-23','2027-03-21','2027-03-22','2027-04-29','2027-05-03','2027-05-04','2027-05-05','2027-07-19','2027-08-11','2027-09-20','2027-09-23','2027-10-11','2027-11-03','2027-11-23']);
const date=t=>new Date(Number(t)+32400000).toISOString().slice(0,10);
const minute=t=>{const d=new Date(Number(t)+32400000);return d.getUTCHours()*60+d.getUTCMinutes();};
const at=(day,min)=>Date.parse(day+'T00:00:00+09:00')+min*60000;
function business(day){const year=+day.slice(0,4);if(![2026,2027].includes(year))return null;const d=new Date(day+'T00:00:00Z'),md=day.slice(5);return ![0,6].includes(d.getUTCDay())&&!holidays.has(day)&&!['01-01','01-02','01-03','12-31'].includes(md);}
function previous(day){let t=at(day,0);for(let n=0;n<20;n++){t-=86400000;const d=date(t);if(business(d)===null)return null;if(business(d))return d;}return null;}
function status(now=Date.now()){const day=date(now),m=minute(now),b=business(day);let phase=b===null?'unknown':!b?'holiday':m<540?'preopen':m<690?'morning':m<750?'lunch':m<930?'afternoon':'closed';return {day,minute:m,phase,open:['morning','afternoon'].includes(phase),label:({unknown:'休場日カレンダー未対応',holiday:'休場日',preopen:'寄付き前',morning:'前場',lunch:'昼休み',afternoon:'後場',closed:'市場終了'})[phase]};}
function barEnd(row,interval){const t=Date.parse(row.time),m=minute(t),day=date(t);if(interval==='1d')return at(day,930);const size=parseInt(interval);return Math.min(t+size*60000,at(day,m<690?690:930));}
function expected(now,interval){const s=status(now);if(s.phase==='unknown')return null;let day=s.day,m=s.minute;if(!business(day)||m<540){day=previous(day);return day?at(day,930):null;}if(interval==='1d')return m>=930?at(day,930):(day=previous(day))?at(day,930):null;const n=parseInt(interval);if(m>=930)return at(day,930);if(m>=690&&m<750)return at(day,690);if(m<690){const end=540+Math.floor((m-540)/n)*n;if(end===540){day=previous(day);return day?at(day,930):null;}return at(day,end);}return at(day,750+Math.floor((m-750)/n)*n===750?690:750+Math.floor((m-750)/n)*n);}
function assess(rows,interval,now=Date.now()){const market=status(now),completed=rows.filter(r=>barEnd(r,interval)<=now),last=completed.at(-1),end=last?barEnd(last,interval):null,expect=expected(now,interval),tolerance=(interval==='1d'?0:Math.max(15,parseInt(interval)*2))*60000;return {market,completed,last,end,expected:expect,stale:expect===null||end===null||end<expect-tolerance,forming:rows.length>completed.length};}
const api={date,minute,at,business,previous,status,barEnd,expected,assess};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MarketClock=api;
})(typeof globalThis!=='undefined'?globalThis:this);
