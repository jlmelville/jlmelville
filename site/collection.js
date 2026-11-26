(() => {
  const cards = new Map(
    Array.from(document.querySelectorAll('.experiment-card'), card => [card.dataset.experiment, card])
  );
  const assets = {
    austen: ['study/austen-data.js', 'site/point-map.js', 'site/austen.js'],
    forces: ['study/crossover-data.js', 'site/crossover.js'],
    'force-inspector': ['study/forces-data.js', 'site/point-map.js', 'site/forces.js']
  };
  const scripts = new Map();
  const studies = new Map();
  let current = '';

  function loadScript(path) {
    if (!scripts.has(path)) {
      scripts.set(path, new Promise((resolve, reject) => {
        const tag = document.createElement('script');
        tag.onload = resolve;
        tag.onerror = () => {
          scripts.delete(path);
          tag.remove();
          reject(new Error('Could not load ' + path));
        };
        tag.src = path;
        document.head.append(tag);
      }));
    }
    return scripts.get(path);
  }

  async function prepare(panel) {
    const frame = panel.querySelector('iframe');
    if (frame) {
      if (!frame.getAttribute('src')) frame.src = frame.dataset.src;
      return;
    }
    const stage = panel.querySelector('.stage');
    const status = document.createElement('div');
    status.className = 'load-state';
    status.setAttribute('role', 'status');
    status.textContent = 'Loading the experiment…';
    stage.before(status);
    stage.hidden = true;
    try {
      for (const path of assets[panel.id]) await loadScript(path);
      stage.hidden = false;
      status.remove();
    } catch {
      studies.delete(panel.id);
      status.textContent = 'The experiment couldn’t load. ';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = 'Try again';
      retry.onclick = () => {
        status.remove();
        start(panel);
      };
      status.append(retry);
    }
  }

  function start(panel) {
    if (!studies.has(panel.id)) studies.set(panel.id, prepare(panel));
  }

  function setOpen(key) {
    current = key;
    for (const [id, card] of cards) {
      const open = id === key;
      const panel = document.getElementById(id);
      panel.hidden = !open;
      card.setAttribute('aria-expanded', String(open));
      const action = document.getElementById('action-' + id);
      action.textContent = open ? 'Close experiment' : action.dataset.action;
      panel.classList.toggle('is-opening', open);
      if (open) start(panel);
    }
  }

  function goTo(element, {focus = false, smooth = false, block = 'start'} = {}) {
    if (!element) return;
    if (focus) element.focus({preventScroll:true});
    const animate = smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({behavior:animate ? 'smooth' : 'instant', block});
  }

  function show(key, smooth) {
    setOpen(key);
    const panel = document.getElementById(key);
    panel.querySelector('h2').focus({preventScroll:true});
    goTo(panel, {smooth});
  }

  function close(key) {
    history.pushState(null, '', '#experiments');
    setOpen('');
    goTo(cards.get(key), {focus:true, smooth:true, block:'nearest'});
  }

  function readLocation() {
    const id = location.hash.slice(1);
    if (cards.has(id)) {
      show(id, false);
    } else {
      const former = current;
      setOpen('');
      if (id) goTo(document.getElementById(id));
      else if (former) goTo(cards.get(former), {focus:true, block:'nearest'});
    }
  }

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
        event.shiftKey || event.altKey) return;
    const closeControl = event.target.closest('[data-close]');
    if (closeControl) {
      event.preventDefault();
      close(closeControl.dataset.close);
      return;
    }
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const key = link.hash.slice(1);
    if (!cards.has(key)) return;
    event.preventDefault();
    if (link === cards.get(key) && current === key) {
      close(key);
    } else {
      if (location.hash !== link.hash) history.pushState(null, '', link.hash);
      show(key, true);
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === ' ' && event.target.matches('.experiment-card')) {
      event.preventDefault();
      event.target.click();
    }
  });

  const inspector = document.getElementById('force-inspector');
  inspector.addEventListener('toggle', () => {
    if (inspector.open) start(inspector);
  });

  window.addEventListener('hashchange', readLocation);
  readLocation();
})();
