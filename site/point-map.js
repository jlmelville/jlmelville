// Draw points at equal horizontal and vertical scales. Keep picking in CSS pixels.
function pointMap(canvas, xy, paint, choose) {
  const ctx = canvas.getContext('2d');
  let projected = [];
  function draw(bounds) {
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(box.width * ratio);
    canvas.height = Math.round(box.height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const [x0,x1,y0,y1] = bounds;
    const scale = Math.min((box.width-30) / Math.max(.001,x1-x0),
                           (box.height-22) / Math.max(.001,y1-y0));
    projected = xy.map(([x,y]) => [box.width/2+(x-(x0+x1)/2)*scale,
                                      box.height/2-(y-(y0+y1)/2)*scale]);
    ctx.fillStyle = 'rgba(43,88,82,.23)';
    for (const [x,y] of projected) {
      if (x < 0 || y < 0 || x > box.width || y > box.height) continue;
      ctx.beginPath(); ctx.arc(x,y,1.45,0,Math.PI*2);ctx.fill();
    }
    paint(ctx,projected);
  }
  canvas.addEventListener('click', e => {
    const r=canvas.getBoundingClientRect();
    let best=-1, distance=13*13;
    projected.forEach(([x,y],i) => {
      const d = (e.clientX-r.left-x)**2 + (e.clientY-r.top-y)**2;
      if (d < distance) {distance=d;best=i;}
    });
    if (best >= 0) choose(best);
  });
  return draw;
}
function limits(points) {
  const x=points.map(p=>p[0]), y=points.map(p=>p[1]);
  return [Math.min(...x),Math.max(...x),Math.min(...y),Math.max(...y)];
}
function dot(ctx,x,y,r,fill,stroke,width=1.5) {
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.stroke();}
}
