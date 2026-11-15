/** MISSION ARCHITECT EXTRAS: NASA live data, compare, planner, learn/challenges, 3D view, share. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const rep = () => (window.__mission ? window.__mission.getReport() : null);
  const REAL = { // approximate public figures - verify before citing
    mars: { n: 'MAVEN (NASA, 2013)', kg: 2454, cost: 671 }, moon: { n: 'LRO (NASA, 2009)', kg: 1916, cost: 504 },
    europa: { n: 'Europa Clipper (NASA, 2024)', kg: 6065, cost: 5200 }, earth: { n: 'Landsat 9 (NASA/USGS, 2021)', kg: 2711, cost: 750 } };
  const HINTS = { LAUNCH_CAPACITY_EXCEEDED: 'Pick a bigger rocket, or cut propellant and instruments.', BUS_PAYLOAD_EXCEEDED: 'Choose a heavier bus or drop an instrument.',
    INSUFFICIENT_DELTA_V: 'Add propellant or use a higher-Isp engine (ion or biprop).', NEGATIVE_POWER_MARGIN: 'Use bigger arrays, or a nuclear source far from the Sun.',
    BATTERY_DEPLETED_IN_ECLIPSE: 'Upgrade the battery bank or add nuclear power.', THERMAL_FAILURE_ENVELOPE: 'Choose stronger thermal control for this destination.',
    LETHAL_RADIATION_EXPOSURE: 'Use a heavier radiation vault (tantalum at Europa).', BUDGET_CAP_EXCEEDED: 'Move up a mission class or choose cheaper parts.',
    DOWNLINK_BOTTLENECK: 'Use a bigger dish or laser comms.', HIGH_RADIATION_DEGRADATION: 'Add shielding to extend electronics life.' };
  const CHALLENGES = [
    ['Mars on a Discovery budget', r => r.destination.id === 'mars' && r.missionClass.id === 'discovery' && r.alerts.length === 0],
    ['Reach Europa with no critical alerts', r => r.destination.id === 'europa' && r.alerts.length === 0],
    ['Lunar mission with 15%+ delta-v margin', r => r.destination.id === 'moon' && r.alerts.length === 0 && r.deltaV.marginPct >= 15],
    ['Launch-ready mission under $100M', r => r.isLaunchReady && r.cost.totalCostMillions < 100]];
  // Hohmann planner using mean longitudes at J2000 (circular coplanar approximation)
  const BODIES = { Venus: [0.723, 181.98, 1.602136], Earth: [1, 100.46, 0.9856474], Mars: [1.524, 355.45, 0.5240207], Jupiter: [5.203, 34.40, 0.0830853] };
  function windows(target, count) {
    const [a2, L2, w2] = BODIES[target], [a1, L1, w1] = BODIES.Earth, aT = (a1 + a2) / 2, tt = 0.5 * Math.pow(aT, 1.5) * 365.25;
    const need = 180 - w2 * tt, J2000 = Date.UTC(2000, 0, 1, 12), out = []; let d = Math.floor((Date.now() - J2000) / 864e5) - 45; // include a window that is open right now
    const diff = day => (((L2 + w2 * day) - (L1 + w1 * day) - need) % 360 + 360) % 360;
    let prev = diff(d);
    for (let i = 1; out.length < count && i < 5000; i++) { const cur = diff(d + i); if (cur < prev && prev - cur < 5 && Math.abs(cur) < 1.5 || (prev > 355 && cur < 5)) { out.push({ date: new Date(J2000 + (d + i) * 864e5), days: tt }); i += 60; } prev = diff(d + i); }
    const mu = 1.327e11, r1 = a1 * 1.496e8, r2 = a2 * 1.496e8, vc = Math.sqrt(mu / r1), dv = Math.sqrt(mu / r1) * (Math.sqrt(2 * r2 / (r1 + r2)) - 1);
    return { out, dvInf: Math.abs(dv), c3: dv * dv };
  }
  const css = `#tb-btn{position:fixed;right:18px;bottom:18px;z-index:999}#tb{position:fixed;top:0;right:-420px;width:400px;max-width:100vw;height:100%;z-index:1000;background:#0e1013;border-left:1px solid #22262c;transition:right .35s cubic-bezier(.22,.61,.36,1);display:flex;flex-direction:column}
#tb.open{right:0}#tb-top{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #22262c}#tb-tabs{display:flex;gap:2px;border-bottom:1px solid #22262c;overflow-x:auto}#tb-tabs button{border:0!important;border-radius:0!important;font-size:.78rem;padding:12px 10px;flex:0 0 auto}#tb-tabs button.on{border-bottom:2px solid #4aa3ff!important}
#tb-body{padding:16px;overflow:auto;flex:1;font-size:.9rem;line-height:1.5;color:#c9ccd2}#tb h3{margin:0 0 8px}#tb table{width:100%;border-collapse:collapse}#tb td,#tb th{padding:6px 4px;border-bottom:1px solid #22262c;text-align:left;font-size:.82rem}
#tb img{width:100%;border-radius:6px;margin:8px 0}#tb .ok{color:#3ecf8e}#tb .no{color:#ef5a5a}#tb .m{color:#7c828c;font-size:.78rem}#tb input{width:100%;padding:6px;margin:6px 0}#ls-chart{width:100%;max-width:960px;display:block;margin:8px auto}`;
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: css }));
  const tb = document.createElement('div'); tb.id = 'tb';
  tb.innerHTML = '<div id="tb-top"><b>TOOLBOX</b><button type="button" id="tb-x" aria-label="Close">✕</button></div><div id="tb-tabs"></div><div id="tb-body"></div>'; document.body.appendChild(tb);
  const btn = Object.assign(document.createElement('button'), { id: 'tb-btn', textContent: 'TOOLBOX' }); document.body.appendChild(btn);
  const TABS = { nasa: ['NASA LIVE', nasa], compare: ['COMPARE', compare], plan: ['PLANNER', plan], learn: ['LEARN', learn], view3d: ['3D VIEW', view3d], share: ['SHARE', share] };
  const tabs = $('#tb-tabs'); Object.entries(TABS).forEach(([k, [t]]) => { const b = Object.assign(document.createElement('button'), { textContent: t }); b.dataset.k = k; tabs.appendChild(b); });
  let cur = 'nasa'; const open = k => { cur = k || cur; tabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.k === cur)); const body = $('#tb-body'); body.innerHTML = ''; TABS[cur][1](body); };
  btn.onclick = () => { const ai = document.getElementById('ai'); if (ai) ai.classList.remove('open'); tb.classList.toggle('open'); if (tb.classList.contains('open')) open(); };
  $('#tb-x').onclick = () => tb.classList.remove('open');
  document.addEventListener('mousedown', ev => { if (tb.classList.contains('open') && !ev.target.closest('#tb, #tb-btn')) tb.classList.remove('open'); });
  tabs.onclick = e => e.target.dataset.k && open(e.target.dataset.k);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') tb.classList.remove('open'); });
  window.ToolboxAPI = { add(k, t, f) { TABS[k] = [t, f]; const b = Object.assign(document.createElement('button'), { textContent: t }); b.dataset.k = k; tabs.appendChild(b); }, open(k) { const ai = document.getElementById('ai'); if (ai) ai.classList.remove('open'); tb.classList.add('open'); open(k); } };
  const getKey = () => localStorage.getItem('nasaKey') || 'DEMO_KEY';
  async function nasa(el) {
    el.innerHTML = '<h3>NASA live data</h3><div class="m">Fetched in your browser from api.nasa.gov. DEMO_KEY is rate-limited; get a free key at api.nasa.gov.</div><input id="nk" placeholder="Your NASA API key (optional)"><div id="nl">Loading...</div>';
    $('#nk').value = getKey() === 'DEMO_KEY' ? '' : getKey(); $('#nk').onchange = e => { localStorage.setItem('nasaKey', e.target.value.trim() || 'DEMO_KEY'); open('nasa'); };
    const k = getKey(), day = new Date().toISOString().slice(0, 10), box = $('#nl'); let html = '';
    const get = async u => { const r = await fetch(u); if (!r.ok) throw new Error(r.status); return r.json(); };
    try { const a = await get('https://api.nasa.gov/planetary/apod?api_key=' + k); html += '<h3>Picture of the day</h3><b>' + a.title + '</b>' + (a.media_type === 'image' ? '<img src="' + a.url + '" alt="">' : '<div class="m">(video) <a href="' + a.url + '" target="_blank" rel="noopener" style="color:#4aa3ff">open</a></div>') + '<div class="m">' + (a.copyright ? 'Credit: ' + a.copyright : 'NASA APOD') + '</div>'; } catch (e) { html += '<div class="no">APOD unavailable (' + e.message + ')</div>'; }
    try { const n = await get('https://api.nasa.gov/neo/rest/v1/feed?start_date=' + day + '&end_date=' + day + '&api_key=' + k); const l = n.near_earth_objects[day] || []; const c = l.map(o => +o.close_approach_data[0].miss_distance.kilometers).sort((a, b) => a - b)[0]; html += '<h3>Near-Earth objects today</h3>' + l.length + ' tracked, ' + l.filter(o => o.is_potentially_hazardous_asteroid).length + ' flagged hazardous. Closest pass: ' + (c ? Math.round(c).toLocaleString() + ' km' : 'n/a'); } catch (e) { html += '<div class="no">NeoWs unavailable (' + e.message + ')</div>'; }
    try { const m = await get('https://api.nasa.gov/mars-photos/api/v1/rovers/perseverance/latest_photos?api_key=' + k); const p = m.latest_photos[0]; html += '<h3>Latest Perseverance photo</h3><img src="' + p.img_src.replace('http:', 'https:') + '" alt=""><div class="m">' + p.camera.full_name + ', Earth date ' + p.earth_date + '</div>'; } catch (e) { html += '<div class="no">Mars photos unavailable (' + e.message + ')</div>'; }
    box.innerHTML = html;
  }
  function compare(el) {
    const r = rep(); if (!r) return el.textContent = 'Build a design first.'; const x = REAL[r.destination.id] || REAL.mars;
    const row = (l, a, b, u) => '<tr><td>' + l + '</td><td>' + Math.round(a).toLocaleString() + u + '</td><td>' + Math.round(b).toLocaleString() + u + '</td></tr>';
    el.innerHTML = '<h3>Your design vs ' + x.n + '</h3><table><tr><th></th><th>Yours</th><th>Real</th></tr>' + row('Launch mass', r.mass.wetMassKg, x.kg, ' kg') + row('Cost', r.cost.totalCostMillions, x.cost, ' M$') + '</table><p class="m">Real-mission figures are approximate public numbers. Verify before citing.</p><p>Engineering score: <b>' + r.engineeringScore + '/100</b>. Science coverage: <b>' + r.science.coveragePct + '%</b>.</p>';
  }
  function plan(el) {
    const r = rep(), t = r && r.destination.id === 'europa' ? 'Jupiter' : r && r.destination.id === 'mars' ? 'Mars' : 'Mars';
    el.innerHTML = '<h3>Transfer-window planner</h3><select id="pt"><option>Mars</option><option>Venus</option><option>Jupiter</option></select><div id="po"></div><p class="m">Circular coplanar Hohmann model with J2000 mean longitudes. Good to within weeks; real missions need full ephemerides (NASA JPL Horizons).</p>';
    const go = () => { const w = windows($('#pt').value, 3); $('#po').innerHTML = '<p>Launch windows:</p><ul>' + w.out.map(o => '<li>' + o.date.toDateString() + ' (transfer ' + Math.round(o.days) + ' days)</li>').join('') + '</ul>Departure v-infinity: ' + w.dvInf.toFixed(2) + ' km/s, C3 ' + w.c3.toFixed(1) + ' km2/s2'; };
    $('#pt').value = t; $('#pt').onchange = go; go();
  }
  function learn(el) {
    const r = rep(); let h = '<h3>Guided mode</h3><ol><li>Pick a destination and mission class.</li><li>Build the spacecraft in the Engineering Bay; watch the margin ledger.</li><li>Fix any red alert using the hints below.</li><li>Launch, then compare with a real mission.</li></ol><h3>Challenges</h3>';
    h += r ? CHALLENGES.map(c => '<div class="' + (c[1](r) ? 'ok' : 'no') + '">' + (c[1](r) ? '✓ ' : '✗ ') + c[0] + '</div>').join('') : 'Build a design first.';
    if (r && (r.alerts.length || r.warnings.length)) h += '<h3>Why it fails</h3>' + [...r.alerts, ...r.warnings].map(a => '<p><b>' + a.title + '</b><br><span class="m">' + (HINTS[a.code] || a.msg) + '</span></p>').join('');
    el.innerHTML = h;
  }
  function view3d(el) {
    const r = rep(); el.innerHTML = '<h3>3D view</h3><canvas id="c3" width="360" height="420" style="width:100%"></canvas><div class="m">' + (r ? r.launchVehicle.name : '') + '</div>';
    const cv = $('#c3'), x = cv.getContext('2d'), v = r ? r.launchVehicle.id : 'falcon_9', wide = { electron_smallsat: 18, falcon_9: 24, falcon_heavy: 30, sls_block1: 38 }[v] || 24; let a = 0;
    (function f() { if (!cv.isConnected) return; x.clearRect(0, 0, 360, 420); x.strokeStyle = '#9aa0aa'; x.lineWidth = 1; a += 0.015;
      const P = (R, y, t) => [180 + R * Math.cos(t + a), 210 - y + R * Math.sin(t + a) * 0.22];
      const ring = (R, y) => { x.beginPath(); for (let i = 0; i <= 28; i++) { const p = P(R, y, i / 28 * 6.283); i ? x.lineTo(...p) : x.moveTo(...p); } x.stroke(); };
      for (let y = -170; y <= 110; y += 20) ring(wide, y); ring(wide, 110);
      for (let i = 0; i < 12; i++) { const t = i / 12 * 6.283, b = P(wide, -170, t), tp = P(wide, 110, t); x.beginPath(); x.moveTo(...b); x.lineTo(...tp); x.stroke(); }
      for (let y = 110; y <= 170; y += 15) ring(wide * (1 - (y - 110) / 80), y);
      x.strokeStyle = '#4aa3ff'; for (let i = 0; i < 12; i++) { const t = i / 12 * 6.283, tp = P(wide, 110, t), n = P(0, 190, t); x.beginPath(); x.moveTo(...tp); x.lineTo(...n); x.stroke(); }
      requestAnimationFrame(f); })();
  }
  function share(el) {
    const m = window.__mission; if (!m) return; const url = location.origin === 'null' || location.protocol === 'file:' ? location.href.split('#')[0] : location.origin + location.pathname;
    const link = url + '#d=' + btoa(JSON.stringify(m.getDesign()));
    el.innerHTML = '<h3>Share your design</h3><p>This link recreates your exact design when opened.</p><input readonly id="sl" aria-label="Shareable design link"><div><button id="sc" type="button">Share design</button> <button id="copy-share" type="button">Copy link</button></div><p id="share-status" class="m" role="status" aria-live="polite"></p><p class="m">' + (location.protocol === 'file:' ? 'To open this on another device, deploy the site to GitHub Pages first; local file links only work on this computer.' : 'Share this link with anyone who can access the hosted site.') + '</p>';
    const field = $('#sl'), status = $('#share-status');
    field.value = link;
    const copy = async () => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(link);
        } else {
          field.focus();
          field.select();
          if (!document.execCommand('copy')) throw new Error('Clipboard access is unavailable');
        }
        status.textContent = 'Link copied. Open it on another device to load this design.';
      } catch (error) {
        field.focus();
        field.select();
        status.textContent = 'Copy is unavailable here. The link is selected so you can copy it manually.';
      }
    };
    $('#sc').onclick = async () => {
      if (!navigator.share) return copy();
      try {
        await navigator.share({ title: 'Mission Architect design', text: 'Open my spacecraft design in Mission Architect:', url: link });
        status.textContent = 'Design shared.';
      } catch (error) {
        if (error.name !== 'AbortError') status.textContent = 'Sharing failed. Use Copy link instead.';
      }
    };
    $('#copy-share').onclick = copy;
  }
})();
