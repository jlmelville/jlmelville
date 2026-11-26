(() => {
  const d=window.FORCES, el=id=>document.getElementById(id);
  const methods = {bh:[['bh3','0.3'],['bh5','0.5'],['bh8','0.8']],
                   fft:[['fft025','0.25'],['fft05','0.5'],['fft1','1']]};
  const names={bh:'Barnes–Hut',fft:'FFT interpolation'}, chosen={bh:'bh5',fft:'fft05'};
  const mode=el('engine'), setting=el('precision');
  const all=limits(d.xy);
  let idx=0, inspected='';
  const relative=(estimate,exact)=>100*Math.hypot(estimate[0]-exact[0],estimate[1]-exact[1])/Math.hypot(...exact);
  function orderFor(method) {
    return d.fields[method].map((v,i)=>[i,relative(v,d.fields.exact[i])]).sort((a,b)=>a[1]-b[1]);
  }
  function chooseTypical() {const order=orderFor(chosen[mode.value]);idx=order[Math.floor(order.length/2)][0];inspected='Median error';}
  const draw=pointMap(el('layout-canvas'),d.xy,(ctx,pts)=>{
    const [x,y]=pts[idx];dot(ctx,x,y,6.5,'#172f36','#fffefa',2);
  },i=>{idx=i;inspected='';update();});
  function vector() {
    const a=d.fields.exact[idx], b=d.fields[chosen[mode.value]][idx];
    const magnify=el('magnify').checked?10:1;
    const end=[a[0]+magnify*(b[0]-a[0]),a[1]+magnify*(b[1]-a[1])];
    const scale=51/Math.max(Math.hypot(...a),Math.hypot(...end),1e-20);
    const svg=el('arrows'), ns='http://www.w3.org/2000/svg';
    svg.replaceChildren();
    const node=(tag,attrs)=>{let e=document.createElementNS(ns,tag); for(let [k,v] of Object.entries(attrs))e.setAttribute(k,v);svg.append(e);return e;};
    node('circle',{cx:90,cy:63,r:51,fill:'none',stroke:'#cbd4c6','stroke-dasharray':'2 5'});
    node('line',{x1:32,y1:63,x2:148,y2:63,stroke:'#cbd4c6'});
    node('line',{x1:90,y1:6,x2:90,y2:120,stroke:'#cbd4c6'});
    function arrow(v,c,w,dash) {
      const x=90+v[0]*scale,y=63-v[1]*scale,angle=Math.atan2(y-63,x-90), L=8;
      node('line',{x1:90,y1:63,x2:x,y2:y,stroke:c,'stroke-width':w,'stroke-dasharray':dash,'stroke-linecap':'round'});
      const p=[-.53,.53].map(off=>[x-L*Math.cos(angle+off),y-L*Math.sin(angle+off)].join(','));
      node('polyline',{points:p[0]+' '+x+','+y+' '+p[1],fill:'none',stroke:c,'stroke-width':w,'stroke-linejoin':'round'});
    }
    arrow(a,'#176772',5,'none');arrow(end,'#a94725',2.2,'4 3');
    node('circle',{cx:90,cy:63,r:2.6,fill:'#172f36'});
    const value=relative(b,a);
    svg.setAttribute('aria-label','Exact and approximate force arrows at point '+(idx+1)+'. Relative error '+value.toFixed(2)+' percent.');
    el('point-label').textContent='Point '+(idx+1).toLocaleString('en-US')+' · '+value.toFixed(2)+'% error';
    el('arrow-caption').textContent=magnify===10?'Tip difference enlarged 10×':'Both arrows at the same scale';
  }
  function update() {
    const active=chosen[mode.value], ms=d.ms, err=d.error;
    const speed=ms.exact/ms[active];
    el('finding').textContent='About '+Math.round(speed)+'× faster, with '+err[active].toPrecision(2)+'% force error.';
    const body=el('values');body.replaceChildren();
    for(const [type,key,label] of [['exact','exact','Exact'],['bh',chosen.bh,'Barnes–Hut'],['fft',chosen.fft,'FFT']]){
      const row=body.insertRow();if(type===mode.value)row.className='active';
      const title=document.createElement('th');title.scope='row';
      const v=type==='exact'?'':methods[type].find(([k])=>k===key)[1];
      title.textContent=label+(v?(type==='bh'?' · θ ':' · grid ')+v:'');row.append(title);
      for(const [isError,n,max] of [[false,ms[key],ms.exact],[true,err[key],Math.max(...Object.values(err))]]){
        const td=row.insertCell();let span=document.createElement('span');span.className='numberline';
        span.textContent=isError?(n?n.toPrecision(2):'0')+'%':n.toFixed(n<100?1:0)+' ms';
        const bar=document.createElement('span');bar.className='bar'+(isError?' err':'');
        const fill=document.createElement('i');fill.style.width=100*n/max+'%';bar.append(fill);td.append(span,bar);
      }
    }
    el('point-kind').textContent=inspected?'At one point · '+inspected:'At one point';
    el('point-number').value=idx+1;vector();draw(all);
  }
  function controls(){
    const type=mode.value;setting.replaceChildren(...methods[type].map(([key,val])=>new Option(val,key)));
    el('setting-label').textContent=type==='bh'?'Opening angle θ':'Grid interval';
    setting.value=chosen[type]; update();
  }
  mode.onchange=()=>{inspected='';controls();};setting.onchange=()=>{chosen[mode.value]=setting.value;inspected='';update();};
  el('magnify').onchange=vector;
  el('typical').onclick=()=>{chooseTypical();update();};
  function selectHighError(){const o=orderFor(chosen[mode.value]);idx=o[Math.floor(o.length*.99)][0];inspected='99th-percentile error';}
  el('large-error').onclick=()=>{selectHighError();update();};
  let pointInput=el('point-number');
  pointInput.onchange=()=>{if(pointInput.value && pointInput.checkValidity()){idx=Number(pointInput.value)-1;inspected='';update();}};
  new ResizeObserver(()=>draw(all)).observe(el('layout-canvas'));
  selectHighError();controls();
})();
