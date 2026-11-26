(() => {
  const d=window.AUSTEN, el=id=>document.getElementById(id);
  const starts = new Map([
    [1263, ['A famous opening','It is a truth universally acknowledged, that a single man in possession…']],
    [7292, ['Wentworth’s letter','You pierce my soul. I am half agony, half hope.']],
    [5816, ['A taste for horrid novels','Yes, pretty well; but are they all horrid, are you sure they are all horrid?']],
    [5357, ['Knightley has had enough','Her situation should secure your compassion. It was badly done, indeed!']],
    [285, ['Marianne remembers Norland','The woods and walks thickly covered with dead leaves.']],
    [2784, ['Miss Crawford excuses herself','Selfishness must always be forgiven, you know, because there is no hope of a cure.']]
  ]);
  const select=el('start-passage'), back=el('previous-passage');
  starts.forEach(([label],i)=>select.add(new Option(label+' · '+d.books[d.book[i]],i)));
  let current=1263, history=[];
  const all=limits(d.xy);
  const clean=t=>t.replace(/_/g,'').replace(/--/g,'—');
  const snippet=(t,n)=>t.length<=n?t:t.slice(0,n).replace(/\s+\S*$/,'')+'…';
  function go(i,remember=true) {
    if (remember && i!==current) history.push(current);
    current=i; update();
  }
  const draw=pointMap(el('austen-canvas'),d.xy,(ctx,pts)=>{
    const w=d.words[current], m=d.map[current], [x,y]=pts[current];
    const neighbors=[...new Set([...w,...m])];
    neighbors.forEach(i=>{
      const [a,b]=pts[i];ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(a,b);
      ctx.lineWidth=1;ctx.strokeStyle=w.includes(i)?'#367b7c':'#ae704f';
      ctx.setLineDash(w.includes(i)?[]:[3,3]);ctx.stroke();ctx.setLineDash([]);
    });
    for(const i of neighbors) {
      const [a,b]=pts[i], inWords=w.includes(i), inMap=m.includes(i);
      if(inWords) {
        dot(ctx,a,b,5.5,'#fffefa','#146c70',2);
        if(inMap)dot(ctx,a,b,3,'#a74a27');
      } else {
        ctx.save();ctx.translate(a,b);ctx.rotate(Math.PI/4);ctx.fillStyle='#a74a27';
        ctx.fillRect(-4,-4,8,8);ctx.strokeStyle='#fffefa';ctx.strokeRect(-4,-4,8,8);ctx.restore();
      }
    }
    dot(ctx,x,y,6.5,'#192f35','#fffefa',2);
    if(current===1263 && el('map-view').value==='near') {
      const width=ctx.canvas.clientWidth,height=ctx.canvas.clientHeight;
      const compact=width<415;
      const short=['Sense & S.','Pride & P.','Mansfield P.','Emma','Northanger A.','Persuasion'];
      const caption=i=>i===6510?'End note':(compact?short[d.book[i]]:d.books[d.book[i]]);
      ctx.font='12px system-ui, sans-serif';ctx.lineWidth=.8;
      const left=[2566,6511,4101,5725],right=[0,current,6510];
      for (const [ids,align] of [[left,'left'],[right,'right']]){
        const sorted=ids.slice().sort((a,b)=>pts[a][1]-pts[b][1]);
        const rows=sorted.map(i=>Math.max(9,Math.min(height-9,pts[i][1])));
        for(let k=1;k<rows.length;k++) rows[k]=Math.max(rows[k],rows[k-1]+22);
        for(let k=rows.length-1;k>=0;k--)rows[k]=Math.min(rows[k],k===rows.length-1?height-9:rows[k+1]-22);
        sorted.forEach((i,k)=>{
          const [px,py]=pts[i], label=caption(i),isLeft=align==='left';
          const margin=compact?2:8,tx=isLeft?margin:width-margin;
          const edge=tx+(isLeft?1:-1)*(ctx.measureText(label).width+5);
          const near=px+(isLeft?-1:1)*8;
          ctx.beginPath();ctx.moveTo(near,py);ctx.lineTo((edge+near)/2,rows[k]);ctx.lineTo(edge,rows[k]);
          ctx.strokeStyle='#899c8d';ctx.stroke();
          ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle='#314d4c';ctx.fillText(label,tx,rows[k]);
        });
      }
    }
  },go);
  function redraw() {
    let bounds=all;
    if(el('map-view').value==='near'){
      const near=[current,...d.words[current],...d.map[current]].map(i=>d.xy[i]);
      let [x0,x1,y0,y1]=limits(near), pad=Math.max(x1-x0,y1-y0,.001)*.15;
      bounds=[x0-pad,x1+pad,y0-pad,y1+pad];
    }
    draw(bounds);
  }
  function update() {
    const i=current, w=d.words[i], m=d.map[i], book=d.books[d.book[i]], full=clean(d.text[i]);
    select.querySelector('[data-dynamic]')?.remove();
    if(!starts.has(i)){
      const opt=new Option(book+' · passage '+d.passage[i],i);opt.dataset.dynamic='';select.add(opt);
    }
    select.value=i;back.disabled=!history.length;
    el('bookline').textContent=book+' · Passage '+d.passage[i];
    el('active-quote').textContent='“'+(starts.get(i)?.[1]||snippet(full.replace(/^"/,''),170).replace(/"$/,''))+'”';
    el('full-passage').textContent=full;el('passage-details').open=false;
    const count=w.filter(j=>m.includes(j)).length;
    el('overlap').textContent=count+' of 5 neighbors appear in both lists.';
    el('passage-note').textContent=i===1263?'All five word neighbors are the opening passages of other novels. The title and byline are part of this passage, too.':'Select a neighbor to read it and see where its own neighbors fall.';
    for(const [key,ids] of [['word-list',w],['map-list',m]]) {
      const list=el(key);list.replaceChildren();
      ids.forEach((j,k)=>{
        const li=document.createElement('li'), b=document.createElement('button');
        const rank=document.createElement('span');rank.className='rank';rank.textContent=k+1;
        const s=document.createElement('span');s.className='excerpt';s.textContent=snippet(clean(d.text[j]),78);
        b.append(rank,s);const matched=w.includes(j)&&m.includes(j);
        if(matched){const a=document.createElement('span');a.className='match';a.textContent='In both';b.append(a);}
        b.title=d.books[d.book[j]]+' · passage '+d.passage[j]+' — '+s.textContent;
        b.setAttribute('aria-label',b.title+(matched?' (in both lists)':''));
        b.onclick=()=>{go(j); el('bookline').focus({preventScroll:true});};
        li.append(b);list.append(li);
      });
    }
    redraw();
  }
  select.onchange=()=>go(Number(select.value));
  back.onclick=()=>go(history.pop(),false);
  el('map-view').onchange=redraw;
  new ResizeObserver(redraw).observe(el('austen-canvas'));
  update();
})();
