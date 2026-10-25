// Loopback-only RSS relay, no dependencies and no arbitrary upstream URLs.
const http=require('node:http'),https=require('node:https'),fs=require('node:fs'),path=require('node:path');
const allowed=new Set(['news.google.com','www.bing.com']);
const cache=new Map();
function valid(u){return u.protocol==='https:'&&allowed.has(u.hostname)&&!u.username&&!u.password&&(!u.port||u.port==='443')&&(u.pathname==='/rss/search'||u.pathname==='/news/search');}
function feed(u,depth=0){return new Promise((resolve,reject)=>{
 if(!valid(u)||depth>2)return reject(Error('Upstream not allowed'));
 const req=https.get(u,{headers:{'User-Agent':'StockEdgeLocal/1.0','Accept':'application/rss+xml, application/xml'}},res=>{
  if([301,302,303,307,308].includes(res.statusCode)){res.resume();try{resolve(feed(new URL(res.headers.location,u),depth+1));}catch(e){reject(e);}return;}
  if(res.statusCode!==200){res.resume();reject(Error('Upstream HTTP '+res.statusCode));return;}
  let data='',bytes=0;res.setEncoding('utf8');res.on('data',c=>{bytes+=Buffer.byteLength(c);if(bytes>2e6){req.destroy(Error('Feed too large'));return;}data+=c;});res.on('error',reject);res.on('end',()=>{if(!/<(?:rss|feed)[\s>]/i.test(data))reject(Error('Invalid RSS'));else resolve(data);});
 });req.setTimeout(10000,()=>req.destroy(Error('Upstream timeout')));req.on('error',reject);
});}
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
 if(req.headers.host!=='127.0.0.1:8765'){res.writeHead(403);res.end('Host denied');return;}
 if(req.method!=='GET'){res.writeHead(405);res.end();return;}
 const u=new URL(req.url,'http://127.0.0.1:8765');
 if(u.pathname==='/api/feed'){
  if(req.headers.origin&&req.headers.origin!=='http://127.0.0.1:8765'){res.writeHead(403);res.end();return;}
  try{const target=new URL(u.searchParams.get('url'));if(!valid(target))throw Error('Feed URL denied');const k=target.href,old=cache.get(k);let body;if(old&&Date.now()-old.at<300000)body=old.body;else{body=await feed(target);if(cache.size>200)cache.delete(cache.keys().next().value);cache.set(k,{at:Date.now(),body});}res.writeHead(200,{'Content-Type':'application/xml; charset=utf-8'});res.end(body);}catch(e){res.writeHead(502,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:e.message}));}return;
 }
 const files={'/':'index.html','/index.html':'index.html','/STOCK_EDGE_INTELLIGENCE_EVOLVED.html':'index.html','/community-data.json':'community-data.json'};
 if(!files[u.pathname]){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':u.pathname.endsWith('.json')?'application/json; charset=utf-8':'text/html; charset=utf-8'});fs.createReadStream(path.join(__dirname,files[u.pathname])).pipe(res);
});
server.listen(8765,'127.0.0.1',()=>console.log('Stock Edge: http://127.0.0.1:8765 (Ctrl+C to stop)'));
