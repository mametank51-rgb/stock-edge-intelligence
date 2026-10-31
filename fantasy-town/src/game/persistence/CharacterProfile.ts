import {appearancePresets, professions, races} from '../characters/definitions';
import type {Profession,Race} from '../characters/definitions';
export interface CharacterProfile {version:1;race:Race;profession:Profession;preset:number}
const KEY='ashenvale.character.v1';
export const DEFAULT_PROFILE:CharacterProfile={version:1,race:'Human',profession:'Warrior',preset:0};
export function parseCharacterProfile(raw:string):CharacterProfile|null {
  let value:unknown;
  try { value=JSON.parse(raw); } catch { return null; }
  if(typeof value!=='object'||!value||Array.isArray(value))return null;
  const v=value as Record<string,unknown>;
  if(v.version!==1||!races.includes(v.race as Race)||!professions.includes(v.profession as Profession)
    ||!Number.isInteger(v.preset)||typeof v.preset!=='number'||v.preset<0||v.preset>=appearancePresets.length)return null;
  return {version:1,race:v.race as Race,profession:v.profession as Profession,preset:v.preset};
}
export function loadCharacterProfile():CharacterProfile {
  try {
    const raw=localStorage.getItem(KEY);
    if(!raw)return {...DEFAULT_PROFILE};
    const profile=parseCharacterProfile(raw);
    if(profile)return profile;
    console.warn('Character profile is invalid; using defaults.');
  } catch(error) { console.warn('Character profile could not be read.',error); }
  return {...DEFAULT_PROFILE};
}
export function saveCharacterProfile(profile:CharacterProfile) {
  try { localStorage.setItem(KEY,JSON.stringify(profile)); }
  catch(error) {
    console.warn('Character profile could not be saved.',error);
    window.dispatchEvent(new CustomEvent('town-save-error',{detail:'外見設定を端末に保存できませんでした。'}));
  }
}
