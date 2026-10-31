// Optional authoring tool: npm install --no-save --package-lock=false playwright
// Uses the same browser canvas sampling as the original runtime. No creative edits.
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.join(__dirname, '..');
const manifest = require('../art/characters/manifest.json');
async function main() {
  const browser = await chromium.launch({channel:'chrome', headless:true});
  try {
    const page = await browser.newPage();
    fs.mkdirSync(path.join(root, 'public/assets/characters'), {recursive:true});
    for (const [name, spec] of Object.entries(manifest)) {
      const data = fs.readFileSync(path.join(root, 'art/characters', spec.source)).toString('base64');
      const png = await page.evaluate(async ({data, spec}) => {
        const image = new Image(); image.src = 'data:image/png;base64,' + data;
        await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 160;
        const ctx = canvas.getContext('2d',{willReadFrequently:true}); ctx.imageSmoothingEnabled = false;
        for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
          const cell=document.createElement('canvas');cell.width=32;cell.height=40;
          const cellCtx=cell.getContext('2d',{willReadFrequently:true});cellCtx.imageSmoothingEnabled=false;
          cellCtx.drawImage(image, spec.columns?.[col] ?? image.width*col/4,
            spec.rows?.[row] ?? image.height*row/4, spec.width ?? image.width/4,
            spec.height ?? image.height/4, 0, 0, 32, 40);
          ctx.drawImage(cell,col*32,row*40);
        }
        return canvas.toDataURL('image/png').split(',')[1];
      }, {data, spec});
      const output = path.join(root, 'public/assets/characters', name + '.png');
      fs.writeFileSync(output, Buffer.from(png, 'base64'));
      console.log(name, fs.statSync(output).size + ' bytes');
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
