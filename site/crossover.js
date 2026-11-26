(() => {
  const {n, samples} = window.CROSSOVER;
  const plot = document.getElementById('crossover-chart');
  const slider = document.getElementById('layout-scale');
  const jump = document.getElementById('jump-switch');
  const firstTree = samples.findIndex(sample => sample.choice === 'tree');
  const switchScale = samples[firstTree].scale.toFixed(1) + '×';
  const methods = {fft: 'FFT', tree: 'Mutual tree'};
  const maxTime = Math.ceil(Math.max(...samples.map(p => Math.max(p.fft, p.tree))) / 20) * 20;
  const left = 31, right = 12, top = 28, bottom = 167;
  slider.max = samples.length - 1;
  jump.textContent = 'Go to the switch at ' + switchScale + ' →';

  function mark(tag, attributes, label) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    if (label !== undefined) element.textContent = label;
    plot.append(element);
  }

  function draw() {
    const width = plot.clientWidth;
    if (!width) return;
    const index = Number(slider.value);
    const x = i => left + (width - left - right) * i / (samples.length - 1);
    const y = ms => bottom - (bottom - top) * ms / maxTime;
    plot.setAttribute('viewBox', '0 0 ' + width + ' 194');
    plot.replaceChildren();
    for (let tick = 0; tick <= maxTime; tick += 20) {
      mark('line', {x1:left, x2:width-right, y1:y(tick), y2:y(tick), class:'gridline'});
      mark('text', {x:left-7, y:y(tick)+4, 'text-anchor':'end'}, tick);
    }
    mark('text', {x:left-7, y:14, 'text-anchor':'end'}, 'ms');
    samples.forEach((sample, i) => {
      if (Number.isInteger(sample.scale)) {
        mark('text', {x:x(i), y:bottom+20, 'text-anchor':'middle'}, sample.scale + '×');
      }
    });
    const switchX = x(firstTree);
    mark('line', {x1:switchX, x2:switchX, y1:19, y2:bottom, class:'switch-line'});
    mark('text', {x:switchX, y:13, 'text-anchor':'middle', class:'switch-label'},
         'Hybrid switches');
    mark('line', {x1:x(index), x2:x(index), y1:top, y2:bottom, class:'scale-guide'});
    for (const method of Object.keys(methods)) {
      const points = samples.map((s, i) => x(i) + ',' + y(s[method])).join(' ');
      mark('polyline', {points, class:'series ' + method});
      const cx = x(index), cy = y(samples[index][method]);
      if (method === 'fft') {
        mark('circle', {cx, cy, r:4.7, class:'marker fft'});
      } else {
        mark('rect', {x:cx-4, y:cy-4, width:8, height:8, class:'marker tree'});
      }
    }
  }

  function update() {
    const sample = samples[Number(slider.value)];
    const scale = sample.scale.toFixed(1) + '×';
    const cells = (sample.nx * sample.ny / n).toFixed(1);
    const choice = methods[sample.choice];
    document.getElementById('scale-value').textContent = scale;
    document.getElementById('chosen-method').textContent = choice;
    document.getElementById('fft-time').textContent = sample.fft.toFixed(1) + ' ms';
    document.getElementById('tree-time').textContent = sample.tree.toFixed(1) + ' ms';
    const relation = sample.choice === 'fft' ? 'within' : 'over';
    document.getElementById('grid-reason').textContent =
      'The grid needs ' + cells + ' cells per point, ' + relation + ' the limit of 14.';
    slider.setAttribute('aria-valuetext', scale + ' original size. Hybrid uses ' + choice +
      '. FFT ' + sample.fft.toFixed(1) + ' milliseconds, mutual tree ' +
      sample.tree.toFixed(1) + ' milliseconds.');
    draw();
  }

  slider.addEventListener('input', update);
  jump.addEventListener('click', () => {
    slider.value = firstTree;
    update();
    slider.focus({preventScroll:true});
  });
  plot.addEventListener('click', event => {
    const offset = event.clientX - plot.getBoundingClientRect().left - left;
    slider.value = Math.round(offset / (plot.clientWidth - left - right) * (samples.length - 1));
    update();
  });
  new ResizeObserver(draw).observe(plot);
  update();
})();
