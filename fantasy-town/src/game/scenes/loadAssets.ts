import type Phaser from 'phaser';
import {characterArt} from '../characters/art';

export function loadTownAssets(scene:Phaser.Scene) {
  const base = import.meta.env.BASE_URL + 'assets/';
  let failed = false;
  const report = (progress:number, error?:string) => window.dispatchEvent(
    new CustomEvent('town-loading', {detail:{progress, error}}));
  scene.load.on('progress', (value:number) => { if (!failed) report(value); });
  scene.load.on('loaderror', (file:Phaser.Loader.File) => {
    failed = true;
    console.error('Game asset failed to load:', file.key, file.url);
    report(0, '素材を読み込めませんでした。通信を確認して再読み込みしてください。');
  });
  scene.load.image('town-expanded', base + 'town-expanded.jpg');
  scene.load.image('square-stone-art', base + 'square-stone-v1.webp');
  scene.load.image('square-fountain-art', base + 'square-fountain-v1.webp');
  for (const name of characterArt) scene.load.image(name + '-art', base + 'characters/' + name + '.png');
  return () => !failed;
}
