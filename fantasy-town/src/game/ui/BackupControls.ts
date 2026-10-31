import {OfflineStore} from '../persistence/OfflineStore';
import {identity} from '../network/identity';

export function appendBackupControls(parent:HTMLElement) {
 const section=document.createElement('div');section.className='backup-controls';
 const label=document.createElement('p');label.textContent='オフラインの持ち物・装備・製作経験を JSON で保存・復元できます。外見、オンラインの記録は含みません。';
 const save=document.createElement('button');save.textContent='記録を書き出す';
 const restore=document.createElement('button');restore.textContent='記録を読み込む';
 const file=document.createElement('input');file.type='file';file.accept='.json,application/json';file.hidden=true;
 const status=document.createElement('p');status.setAttribute('role','status');
 save.addEventListener('click',()=>{
  const data=new OfflineStore(identity().id).exportBackup();
  if(!data){status.textContent='保存済みの記録がありません。装備や採取などを行うと記録されます。';return}
  const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='ashenvale-offline-'+new Date().toISOString().slice(0,10)+'.json';link.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='端末へ記録を書き出しました。';
 });
 restore.addEventListener('click',()=>file.click());
 file.addEventListener('change',async()=>{
  const selected=file.files?.[0];if(!selected)return;
  if(selected.size>1024*1024){status.textContent='記録ファイルが大きすぎます。';file.value='';return}
  let raw:string;
  try{raw=await selected.text()}catch(error){console.warn('Backup file could not be read.',error);status.textContent='ファイルを読み取れませんでした。';return}
  if(!confirm('現在のオフラインの持ち物・装備・製作経験を置き換えて再読み込みします。よろしいですか？')){file.value='';return}
  if(new OfflineStore(identity().id).importBackup(raw)){location.reload();return}
  status.textContent='復元できませんでした。記録の形式または端末の保存領域を確認してください。';file.value='';
 });
 section.append(label,save,restore,file,status);parent.append(section);
}
