import type {Quality} from '../items/model';
/** Experience is successful crafts in this discipline; probabilities stay bounded. */
export function rollQuality(experience:number,roll:number):Quality {
 const xp=Math.max(0,experience),r=Math.max(0,Math.min(.999999,roll));
 const master=Math.min(.06,xp*.001),exceptional=Math.min(.15,.02+xp*.003),fine=Math.min(.35,.10+xp*.004),poor=Math.max(.03,.18-xp*.003);
 if(r<master)return 'Masterwork';if(r<master+exceptional)return 'Exceptional';if(r<master+exceptional+fine)return 'Fine';if(r>=1-poor)return 'Poor';return 'Normal';
}
export const QUALITY_FACTOR:Record<Quality,number>={Poor:.8,Normal:1,Fine:1.2,Exceptional:1.4,Masterwork:1.6};
