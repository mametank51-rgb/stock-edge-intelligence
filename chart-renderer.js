__modules.chart = (() => {
// Dependency-free SVG chart with observed OHLCV and optional analysis overlays.
const ns = 'http://www.w3.org/2000/svg';
let chartClipSequence=0;
function el(name, attrs = {}, text = '') {
  const node = document.createElementNS(ns, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (text) node.textContent = text;
  return node;
}
const fmt = value => new Intl.NumberFormat('ja-JP', {maximumFractionDigits: 2}).format(value);

function drawCandles(container, all, count = 60, meta = {}) {
  const data = count>0?all.slice(-count):all.slice();
  const overlays=meta.overlayAnalysis||ChartOverlays.build(all,{count,options:meta.overlayOptions});
  const retainedSvg=meta.reuseSvg?container.querySelector('svg'):null;
  const retainedTooltip=meta.reuseSvg?container.querySelector('.chart-tooltip'):null;
  if(!retainedSvg)container.replaceChildren();
  if (!data.length) { container.textContent = 'ローソク足データがありません。'; return; }
  const width = Math.max(container.clientWidth, 280);
  const height = meta.height||420, right = 76, left = 10, top = 34, bottom = 35;
  const plotW = width - right - left, plotH = height-140;
  const offset=all.length-data.length;
  const forecast=meta.forecast?.ready&&meta.interval!=='1wk'?meta.forecast:null,future=forecast?.horizon||0;
  const extra=[...overlays.series.flatMap(s=>s.points?.map(p=>p.value)||s.segments?.flat().map(p=>p.value)||[...s.upper,...s.lower].map(p=>p.value)),...overlays.levels.map(p=>p.value)];
  if(forecast)extra.push(...forecast.scenarios.flatMap(s=>s.path));
  const min = Math.min(...data.map(d => d.low),...extra), max = Math.max(...data.map(d => d.high),...extra);
  const pad = Math.max((max - min) * .12, max * .005);
  const lo = min - pad, hi = max + pad;
  const y = price => top + (hi - price) / (hi - lo) * plotH;
  const step = plotW / (data.length+future), bodyW = Math.max(1, step * .59);
  const svg = retainedSvg||el('svg');svg.replaceChildren();for(const [k,v]of Object.entries({viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':`${meta.is_dummy===false?'実データ':'参考'}のOHLCVローソク足チャート ${data.length}本。終値${fmt(data.at(-1).close)} ${meta.stock?.currency||'JPY'}`}))svg.setAttribute(k,v);
  const description = el('desc', {}, `${meta.is_dummy===false?'提供元 '+meta.source+' の日次データです。':'合成データです。'}緑は陽線、赤は陰線。下段は出来高。`);
  description.textContent=meta.description||description.textContent+' チャート分析は観測済み価格に重ねて表示。支20・抵20は20本の安値・高値、①②はW/Mの転換点です。';
  svg.append(description);
  for (let i = 0; i <= 4; i++) {
    const py = top + i * plotH / 4;
    svg.append(el('line', {x1:left, x2:width-right, y1:py, y2:py, class:'chart-grid'}));
    svg.append(el('text', {x:width-right+10, y:py+4, class:'chart-label'}, fmt(hi-(hi-lo)*i/4)));
  }
  if(forecast){const split=left+step*(data.length-.5);svg.append(el('rect',{x:split,y:top,width:step*(future+.5),height:plotH,fill:'#b9c9de',opacity:.06}));svg.append(el('line',{x1:split,x2:split,y1:top,y2:height-bottom,stroke:'#9ca9b8','stroke-dasharray':'3 4'}));}
  const maxVolume = Math.max(1, ...data.map(d => d.volume));
  data.forEach((d, i) => {
    const x = left + step * (i + .5), color = d.close >= d.open ? 'var(--up)' : 'var(--down)';
    svg.append(el('line', {x1:x, x2:x, y1:y(d.high), y2:y(d.low), stroke:color, 'stroke-width':1}));
    svg.append(el('rect', {x:x-bodyW/2, y:Math.min(y(d.open),y(d.close)), width:bodyW,
      height:Math.max(1,Math.abs(y(d.open)-y(d.close))), fill:color, rx:.6}));
    const volumeH = d.volume / maxVolume * 40;
    svg.append(el('rect', {x:x-bodyW/2, y:height-bottom-volumeH, width:bodyW, height:volumeH, fill:color, opacity:.23}));
  });
  [0, Math.floor(data.length/3), Math.floor(data.length*2/3), data.length-1].forEach(i => {
    svg.append(el('text', {x:left+step*(i+.5), y:height-10, class:'chart-label', 'text-anchor':'middle'}, meta.formatTime?meta.formatTime(data[i].time):data[i].time.slice(5).replace('-', '/')));
  });
  const last = data.at(-1), lastY = y(last.close);
  svg.append(el('line', {x1:left, x2:width-right, y1:lastY, y2:lastY, stroke:'var(--accent)', 'stroke-dasharray':'4 5', opacity:.5}));
  svg.append(el('rect', {x:width-right, y:lastY-10, width:right, height:20, rx:3, fill:'var(--accent)'}));
  svg.append(el('text', {x:width-right+right/2, y:lastY+4, fill:'var(--accent-text)', 'text-anchor':'middle', 'font-size':10}, fmt(last.close)));
  const px=i=>left+step*(i-offset+.5),observedEnd=left+step*(data.length-.5);
  const clipId='observed-price-clip-'+(++chartClipSequence),defs=el('defs'),clip=el('clipPath',{id:clipId});clip.append(el('rect',{x:left,y:top,width:step*data.length,height:plotH}));defs.append(clip);svg.append(defs);
  const layer=el('g',{'clip-path':`url(#${clipId})`,'data-chart-overlays':''});
  const poly=(points,attrs)=>{if(points.length>1)layer.append(el('polyline',{points:points.map(p=>px(p.i)+','+y(p.value)).join(' '),fill:'none',...attrs}));};
  const label=(x,value,text,color)=>{const n=el('text',{x:Math.max(left+3,Math.min(observedEnd-8,x)),y:Math.max(top+13,Math.min(top+plotH-4,y(value)-6)),fill:color,'font-size':12,'font-weight':700,'paint-order':'stroke',stroke:'var(--panel)','stroke-width':3,'stroke-linejoin':'round'},text);n.setAttribute('pointer-events','none');layer.append(n);};
  for(const s of overlays.series){if(s.segments){for(const segment of s.segments)poly(segment,{stroke:s.color,'stroke-width':1.8,'data-overlay':s.key,'aria-label':s.name});}else if(s.points)poly(s.points,{stroke:s.color,'stroke-width':1.7,'data-overlay':s.key,'aria-label':s.name});else{const points=[...s.upper,...s.lower.slice().reverse()];layer.append(el('polygon',{points:points.map(p=>px(p.i)+','+y(p.value)).join(' '),fill:s.color,opacity:.07,'data-overlay':'band-fill'}));for(const side of ['upper','lower'])poly(s[side],{stroke:s.color,'stroke-width':1,'stroke-dasharray':'3 3','data-overlay':'bands','aria-label':s.name});}}
  for(const l of overlays.levels){layer.append(el('line',{x1:px(l.from),x2:observedEnd,y1:y(l.value),y2:y(l.value),stroke:l.color,'stroke-width':1.2,'stroke-dasharray':'6 4','data-overlay':l.key,'aria-label':l.name+' '+fmt(l.value)}));label(left+3,l.value,l.shortLabel||(l.key==='support'?'支20':'抵20'),l.color);}
  for(const t of overlays.trends){poly([{i:t.a.i,value:t.a.price},{i:all.length-1,value:t.end}],{stroke:t.broken?'#a0a8b0':t.color,'stroke-width':1.8,'stroke-dasharray':t.broken?'3 5':'','data-overlay':'trend-'+t.key,'aria-label':t.name+(t.broken?'・終値で逸脱あり':'')});for(const a of [t.a,t.b])layer.append(el('circle',{cx:px(a.i),cy:y(a.price),r:3,fill:t.color,'data-overlay-anchor':'trend-'+t.key}));}
  for(const p of overlays.patterns){const points=p.points.filter(p=>p.i>=offset);poly(points,{stroke:p.color,'stroke-width':2.5,'data-overlay':'pattern-'+p.kind,'aria-label':p.name+' '+p.status});layer.append(el('line',{x1:px(p.a.i),x2:observedEnd,y1:y(p.neckline),y2:y(p.neckline),stroke:p.color,'stroke-width':1.3,'stroke-dasharray':'7 3','data-overlay':'neckline-'+p.kind}));label(px(p.neck.i),p.neckline,p.kind+(p.status==='candidate'?'候補':p.status==='breakout'?(p.kind==='W'?'上抜け':'下抜け'):'抜け後'),p.color);for(const [a,text] of [[p.a,'①'],[p.b,'②']]){layer.append(el('circle',{cx:px(a.i),cy:y(a.price),r:4,fill:p.color,stroke:'var(--panel)','stroke-width':1.5,'data-overlay-anchor':p.kind}));const marker=el('text',{x:px(a.i),y:Math.max(top+12,Math.min(top+plotH-3,y(a.price)+(p.kind==='W'?18:-10))),fill:p.color,'text-anchor':'middle','font-size':13,'font-weight':700,'paint-order':'stroke',stroke:'var(--panel)','stroke-width':3},text);layer.append(marker);}}
  svg.append(layer);
  if(forecast){
    for(const scenario of forecast.scenarios){if(!scenario.path.length)continue;const points=scenario.path.map((value,j)=>`${left+step*(data.length-.5+j)},${y(value)}`).join(' ');svg.append(el('polyline',{points,fill:'none',stroke:scenario.color,'stroke-width':2,'stroke-dasharray':'5 4','data-forecast-line':scenario.id,'aria-label':scenario.label+'シナリオ 参考確率'+(scenario.probability*100).toFixed(1)+'%'}));}
    svg.append(el('text',{x:width-right-3,y:height-10,class:'chart-label','text-anchor':'end'},'+'+future+'日足'));
  }
  const cross = el('line', {y1:top, y2:height-bottom, class:'crosshair', visibility:'hidden'});
  svg.append(cross);
  const tooltip = retainedTooltip||document.createElement('div'); tooltip.className = 'chart-tooltip';
  tooltip.textContent = `日付に触れると OHLC・出来高を表示 · ${data.length}本${meta.interval==='1wk'?' / 週足':''}`;
  function select(index) {
    const d = data[index], x = left + step * (index + .5);
    cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('visibility', 'visible');
    tooltip.textContent = `${meta.formatTooltipTime?meta.formatTooltipTime(d.time):d.time}${d.end_date?'〜'+d.end_date:''}${d.is_partial||meta.isPartial?.(d)?' (未確定の可能性)':''}  始 ${fmt(d.open)}  高 ${fmt(d.high)}  安 ${fmt(d.low)}  終 ${fmt(d.close)}  出来高 ${fmt(d.volume)}`;
  }
  let selected = data.length - 1;
  svg.setAttribute('tabindex', '0');
  svg.setAttribute('aria-description', '左右キーで日付を選択できます。');
  svg.onpointermove = event => {
    const rect = svg.getBoundingClientRect();
    selected = Math.max(0, Math.min(data.length-1, Math.floor(((event.clientX-rect.left)*width/rect.width-left)/step)));
    select(selected);
  };
  svg.onkeydown = event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      selected = Math.max(0, Math.min(data.length-1, selected+(event.key==='ArrowLeft'?-1:1)));
      select(selected);
    }
  };
  container.append(tooltip, svg);
}

function sparkline(seed, positive = true) {
  const points = Array.from({length:25}, (_,i) => `${i*3.5},${22-Math.sin(i*.55+seed)*6-i*.43+(seed%3)*2}`).join(' ');
  return `<svg class="sparkline" viewBox="0 0 88 32" aria-hidden="true"><polyline points="${points}" fill="none" stroke="${positive?'var(--up)':'var(--down)'}" stroke-width="1.5"/></svg>`;
}

return {drawCandles, sparkline};
})();
