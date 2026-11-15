/** FLOW: starfield, mission progress line, staggered reveals, hero (Blender video with animated SVG fallback). */
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
  // 5. hero: Blender render if present, otherwise animated SVG rocket
  const brief = document.getElementById('view-briefing'); if (!brief) return;
  const hero = document.createElement('div'); hero.className = 'flow-hero';
  hero.innerHTML = '<div class="fh-text"><b>Design. Launch. Explore.</b><span>Build a spacecraft from real engineering trade-offs and fly it to the Moon, Mars or Europa.</span></div>' +
    '<svg viewBox="0 0 120 300" aria-hidden="true"><g class="trail"><rect x="58" y="205" width="4" height="40" rx="2" fill="#4aa3ff" opacity=".5"/></g>' +
    '<g class="flame"><path d="M48 214 Q60 300 72 214 Z" fill="#ff9d3c"/><path d="M53 214 Q60 270 67 214 Z" fill="#fff3c4"/></g>' +
    '<path d="M60 20 Q84 60 84 130 L84 214 L36 214 L36 130 Q36 60 60 20 Z" fill="#eef0f3"/><path d="M60 20 Q72 40 77 70 L43 70 Q48 40 60 20 Z" fill="#4aa3ff"/>' +
    '<circle cx="60" cy="112" r="14" fill="#0b0d11" stroke="#9aa0aa" stroke-width="4"/><circle cx="60" cy="112" r="7" fill="#2a6df4"/>' +
    '<path d="M36 170 L8 224 L36 214 Z M84 170 L112 224 L84 214 Z" fill="#9aa0aa"/><rect x="48" y="214" width="24" height="10" rx="3" fill="#5b616b"/></svg>';
  brief.insertBefore(hero, brief.firstChild);
  fetch('assets/rocket_flow.mp4', { method: 'HEAD' }).then(r => { if (!r.ok) return; const v = Object.assign(document.createElement('video'), { src: 'assets/rocket_flow.mp4', autoplay: true, muted: true, loop: true, playsInline: true }); v.setAttribute('muted', ''); hero.insertBefore(v, hero.firstChild); hero.querySelector('svg').remove(); }).catch(() => {});
})();
