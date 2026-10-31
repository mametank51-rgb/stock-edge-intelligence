const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const manifest=require('../art/characters/manifest.json');
async function main(){const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage();let originalBytes=0,packedBytes=0,maxDelta=0;
 for(const [name,spec] of Object.entries(manifest)){
  const original=fs.readFileSync(path.join(__dirname,'../art/characters',spec.source));
  const packed=fs.readFileSync(path.join(__dirname,'../public/assets/characters',name+'.png'));
  originalBytes+=original.length;packedBytes+=packed.length;
  const result=await page.evaluate(async({original,packed,spec})=>{
   const a=new Image(),b=new Image();a.src='data:image/png;base64,'+original;b.src='data:image/png;base64,'+packed;await Promise.all([a.decode(),b.decode()]);

   let maxDelta=0,worst;for(let row=0;row<4;row++)for(let col=0;col<4;col++){const canvas=document.createElement('canvas');canvas.width=32;canvas.height=40;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;
    ctx.clearRect(0,0,32,40);ctx.drawImage(a,spec.columns?.[col]??a.width*col/4,spec.rows?.[row]??a.height*row/4,spec.width??a.width/4,spec.height??a.height/4,0,0,32,40);
    const expected=ctx.getImageData(0,0,32,40).data;
    ctx.clearRect(0,0,32,40);ctx.drawImage(b,col*32,row*40,32,40,0,0,32,40);const actual=ctx.getImageData(0,0,32,40).data;
    for(let i=0;i<actual.length;i++){const alpha=i-i%4+3;const delta=i%4===3?Math.abs(expected[i]-actual[i]):Math.abs(expected[i]*expected[alpha]/255-actual[i]*actual[alpha]/255);if(delta>maxDelta){maxDelta=delta;worst={row,col,pixel:Math.floor(i/4),expected:Array.from(expected.slice(i-i%4,i-i%4+4)),actual:Array.from(actual.slice(i-i%4,i-i%4+4))}}}
   }return {maxDelta,worst,width:b.width,height:b.height};
  },{original:original.toString('base64'),packed:packed.toString('base64'),spec});
  assert.equal(result.width,128);assert.equal(result.height,160);assert.ok(result.maxDelta<=2,name+' '+JSON.stringify(result));maxDelta=Math.max(maxDelta,result.maxDelta);
 }
 assert.ok(packedBytes<originalBytes*.04);console.log('PASS: 176 frames match within PNG alpha rounding (max channel delta '+maxDelta+'/255); '+originalBytes+' → '+packedBytes+' bytes');
 }finally{await browser.close()}}
main().catch(error=>{console.error(error);process.exitCode=1});
