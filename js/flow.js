/** FLOW: starfield, mission progress, staggered reveals, and mission hero. */
(function () {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 1. parallax starfield that drifts with scroll/mouse
  const cv = Object.assign(document.createElement('canvas'), { id: 'flow-stars' }); document.body.prepend(cv);
  const x = cv.getContext('2d'); let W, H, mx = 0, my = 0; const S = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random() * 0.9 + 0.1 }));
  const fit = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; }; fit(); addEventListener('resize', fit);
  addEventListener('pointermove', e => { mx = (e.clientX / W - 0.5); my = (e.clientY / H - 0.5); });
  (function loop(t) { x.clearRect(0, 0, W, H);
    S.forEach(s => { s.y += 0.00008 * s.z; if (s.y > 1) s.y = 0; const px = ((s.x + mx * 0.02 * s.z) % 1) * W, py = s.y * H + my * 12 * s.z; x.fillStyle = 'rgba(200,220,255,' + (0.25 + 0.6 * s.z * (0.7 + 0.3 * Math.sin(t / 900 + s.x * 50))) + ')'; x.fillRect(px, py, s.z * 1.8, s.z * 1.8); });
    if (!still) requestAnimationFrame(loop); })(0);
  // 2. mission-flow progress line follows the active step
  const bar = Object.assign(document.createElement('div'), { id: 'flow-progress' }); document.body.appendChild(bar);
  const tabs = [...document.querySelectorAll('.nav-tab')];
  const upd = () => { const i = Math.max(0, tabs.findIndex(t => t.classList.contains('active'))); bar.style.width = (i + 1) / tabs.length * 100 + '%'; };
  tabs.forEach(t => new MutationObserver(upd).observe(t, { attributes: true, attributeFilter: ['class'] })); upd();
  // 3. staggered reveal when a screen becomes active
  const reveal = sec => { if (still) return; [...sec.querySelectorAll('h2, [class*="card"], .section-badge, canvas, .launch-controls, [class*="ledger"]')].slice(0, 24).forEach((el, i) => { el.classList.remove('flow-rise'); void el.offsetWidth; el.style.animationDelay = i * 55 + 'ms'; el.classList.add('flow-rise'); }); };
  document.querySelectorAll('.view-section').forEach(s => new MutationObserver(() => s.classList.contains('active') && reveal(s)).observe(s, { attributes: true, attributeFilter: ['class'] }));
  reveal(document.querySelector('.view-section.active'));
  // 4. glow follows the pointer on buttons
  document.addEventListener('pointermove', e => { const b = e.target.closest && e.target.closest('button'); if (b) { const r = b.getBoundingClientRect(); b.style.setProperty('--mx', e.clientX - r.left + 'px'); b.style.setProperty('--my', e.clientY - r.top + 'px'); } });
  // 5. mission hero with a locally cached NASA image and optional Blender render
  const brief = document.getElementById('view-briefing'); if (!brief) return;
  const hero = document.createElement('div'); hero.className = 'flow-hero';
  hero.innerHTML = '<img class="fh-image" src="assets/mars-murray-buttes.jpg" alt="Curiosity rover panorama across the Murray Buttes on Mars" fetchpriority="high">' +
    '<div class="fh-text"><span class="fh-eyebrow"><i></i> MISSION ARCHITECT · FLIGHT DESIGN</span>' +
    '<h2>Design for the <em>journey beyond.</em></h2>' +
    '<p>Shape a spacecraft around its destination, balance real engineering trade-offs, and fly the mission.</p>' +
    '<div class="fh-actions"><a class="fh-cta" href="#destination-grid">CHOOSE A DESTINATION <span aria-hidden="true">→</span></a>' +
    '<span class="fh-fact"><strong>04</strong> DESTINATIONS</span><span class="fh-fact"><strong>06</strong> MISSION PHASES</span></div></div>' +
    '<div class="fh-feature"><span>FEATURED LANDSCAPE</span><strong>Murray Buttes</strong><small>GALE CRATER · MARS</small></div>' +
    '<a class="fh-credit" href="https://photojournal.jpl.nasa.gov/catalog/PIA20840" target="_blank" rel="noopener noreferrer">IMAGE: NASA / JPL-CALTECH / MSSS</a>';
  brief.insertBefore(hero, brief.firstChild);
  const videoConfig = document.querySelector('meta[name="mission-hero-video"]');
  if (videoConfig && videoConfig.content.trim()) {
    const video = Object.assign(document.createElement('video'), {
      src: videoConfig.content.trim(),
      autoplay: true,
      muted: true,
      loop: true,
      playsInline: true,
      preload: 'metadata'
    });
    video.addEventListener('loadeddata', () => hero.classList.add('has-hero-video'), { once: true });
    video.addEventListener('error', () => {
      console.warn('Mission hero video could not be loaded; keeping the NASA image.');
      video.remove();
    }, { once: true });
    hero.insertBefore(video, hero.firstChild);
  }
})();
