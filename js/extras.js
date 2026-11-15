/** MISSION ARCHITECT EXTRAS: NASA live data, compare, planner, learn/challenges, 3D view, share. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const rep = () => (window.__mission ? window.__mission.getReport() : null);
  let rocketState = null;
  const REAL = { // approximate public figures - verify before citing
    mars: { n: 'MAVEN (NASA, 2013)', kg: 2454, cost: 671 }, moon: { n: 'LRO (NASA, 2009)', kg: 1916, cost: 504 },
    europa: { n: 'Europa Clipper (NASA, 2024)', kg: 6065, cost: 5200 }, earth: { n: 'Landsat 9 (NASA/USGS, 2021)', kg: 2711, cost: 750 } };
  const HINTS = { LAUNCH_CAPACITY_EXCEEDED: 'Pick a bigger rocket, or cut propellant and instruments.', BUS_PAYLOAD_EXCEEDED: 'Choose a heavier bus or drop an instrument.',
    INSUFFICIENT_DELTA_V: 'Add propellant or use a higher-Isp engine (ion or biprop).', NEGATIVE_POWER_MARGIN: 'Use bigger arrays, or a nuclear source far from the Sun.',
    BATTERY_DEPLETED_IN_ECLIPSE: 'Upgrade the battery bank or add nuclear power.', THERMAL_FAILURE_ENVELOPE: 'Choose stronger thermal control for this destination.',
    LETHAL_RADIATION_EXPOSURE: 'Use a heavier radiation vault (tantalum at Europa).', BUDGET_CAP_EXCEEDED: 'Move up a mission class or choose cheaper parts.',
    DOWNLINK_BOTTLENECK: 'Use a bigger dish or laser comms.', HIGH_RADIATION_DEGRADATION: 'Add shielding to extend electronics life.' };
  window.MISSION_HINTS = HINTS;
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
  const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function mission(el) {
    const r = rep(), m = window.__mission;
    if (!r || !m) {
      el.innerHTML = '<h3>Mission overview</h3><p>Mission status is not ready yet. Reload the page if this message remains.</p>';
      return;
    }

    const d = m.getDesign(), cls = m.data.missionClasses[d.missionClassId] || {};
    const issues = [...r.alerts, ...r.warnings].slice(0, 3);
    const issueList = issues.length
      ? '<ul class="tb-issues">' + issues.map(issue => '<li>' + escapeHTML(issue.title) + '<span>' + escapeHTML(HINTS[issue.code] || issue.msg || 'Review this constraint in the Engineering Bay.') + '</span></li>').join('') + '</ul>'
      : '<p class="ok">No critical alerts or modeled warnings.</p>';
    const status = r.isLaunchReady ? 'CRITICAL CHECKS PASS' : 'NEEDS ENGINEERING';
    const next = r.alerts.length
      ? 'Resolve the highest-priority alert, then recheck the live margins.'
      : r.warnings.length
        ? 'Review the modeled warnings and compare the design risk before launch.'
        : 'Review risk and science coverage, then proceed to the launch sequence.';

    el.innerHTML = '<div class="tb-overview-head"><span>LIVE DESIGN SNAPSHOT</span><strong class="' + (r.isLaunchReady ? 'ready' : '') + '">' + status + '</strong></div>' +
      '<p class="tb-mission-name">' + escapeHTML(r.destination.name) + ' · ' + escapeHTML(cls.name || d.missionClassId) + '</p>' +
      '<div class="tb-kpis">' +
      '<div class="tb-kpi"><span>ENGINEERING SCORE</span><strong>' + escapeHTML(r.engineeringScore) + '/100</strong></div>' +
      '<div class="tb-kpi"><span>LAUNCH MASS MARGIN</span><strong>' + escapeHTML(r.mass.launchMassMarginPct) + '%</strong></div>' +
      '<div class="tb-kpi"><span>DELTA-V MARGIN</span><strong>' + escapeHTML(r.deltaV.marginPct) + '%</strong></div>' +
      '<div class="tb-kpi"><span>POWER MARGIN</span><strong>' + escapeHTML(r.power.sunlightMarginPct) + '%</strong></div>' +
      '</div>' +
      '<div class="tb-next"><b>Next step</b><br>' + escapeHTML(next) + '</div>' +
      '<h3 style="margin-top:16px">Top constraints</h3>' + issueList +
      '<p class="m">Educational model: estimates are not flight certification or a real reliability assessment.</p>' +
      '<div class="tb-overview-actions"><button type="button" id="mission-open-engineering">OPEN ENGINEERING BAY</button><button type="button" id="mission-open-rocket">OPEN ROCKET LAB</button><button type="button" id="mission-review-ai">REVIEW WITH MISSION INTELLIGENCE</button><button type="button" id="mission-open-risk">RUN RISK ANALYSIS</button></div>' +
      '<p id="mission-overview-status" class="m" role="status" aria-live="polite"></p>';

    $('#mission-open-engineering').onclick = () => {
      window.ToolboxAPI.close();
      m.switchTab('engineering');
    };
    $('#mission-open-rocket').onclick = () => window.ToolboxAPI.open('rocket');
    $('#mission-review-ai').onclick = () => {
      if (!window.MissionAI) {
        $('#mission-overview-status').textContent = 'Mission Intelligence is unavailable on this page.';
        return;
      }
      window.MissionAI.ask('Review my current mission design. Explain the top constraints and recommend one next step.');
    };
    $('#mission-open-risk').onclick = () => T.open('risk');
  }
  const css = `#quick-access-dock{position:fixed;right:20px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:1100;display:flex;align-items:center;gap:10px}
#quick-access-dock button{position:static!important;display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:48px;padding:0 17px;border:1px solid #303946!important;border-radius:999px!important;background:rgba(17,23,32,.94)!important;color:#e8edf5!important;box-shadow:0 10px 30px rgba(0,0,0,.4)!important;backdrop-filter:blur(16px);font-size:.75rem!important;font-weight:650!important;letter-spacing:.08em!important;white-space:nowrap}
#quick-access-dock button:hover{transform:translateY(-2px);border-color:#65758a!important;background:#202a38!important}
#quick-access-dock svg{width:17px;height:17px;flex:0 0 auto}
#quick-access-dock .quick-label{line-height:1}
#tb{position:fixed;top:auto;right:-460px;bottom:calc(84px + env(safe-area-inset-bottom));width:min(420px,calc(100vw - 32px));height:min(720px,calc(100vh - 120px));height:min(720px,calc(100dvh - 120px));z-index:1050;background:#0e1013;border:1px solid #29313d;border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.58);transition:right .35s cubic-bezier(.22,.61,.36,1);display:flex;flex-direction:column;overflow:hidden}
#tb.open{right:20px}#tb-top{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid #222a35;background:linear-gradient(135deg,rgba(74,163,255,.1),transparent 70%)}#tb-top .tb-title{display:flex;flex-direction:column;gap:4px}#tb-top .tb-title span{font-size:.62rem;letter-spacing:.15em;color:#8e9bac}#tb-top .tb-title strong{font-size:1rem;letter-spacing:.04em;color:#f2f5fa}
#tb-tool-nav{display:grid;grid-template-columns:92px minmax(0,1fr);align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid #22262c;background:#0b0e13}#tb-tool-nav label{font-size:.68rem;color:#91a1b4;letter-spacing:.08em;text-transform:uppercase}#tb-tool-nav select{width:100%;min-height:38px;padding:7px 10px;border-color:#344252!important;border-radius:7px!important;background:#111925!important;color:#e5edf7!important}
#tb-body{padding:16px;overflow:auto;flex:1;font-size:.9rem;line-height:1.5;color:#c9ccd2}#tb h3{margin:0 0 8px}#tb table{width:100%;border-collapse:collapse}#tb td,#tb th{padding:6px 4px;border-bottom:1px solid #22262c;text-align:left;font-size:.82rem}
#tb img{width:100%;border-radius:6px;margin:8px 0}#tb .ok{color:#3ecf8e}#tb .no{color:#ef5a5a}#tb .m{color:#7c828c;font-size:.78rem}#tb input{width:100%;padding:6px;margin:6px 0}#ls-chart{width:100%;max-width:960px;display:block;margin:8px auto}
#tb .rocket-lede{color:#aab8c7;font-size:.82rem;margin:4px 0 14px}#tb .rocket-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}#tb .rocket-field{display:block;color:#aab8c7;font-size:.72rem}#tb .rocket-field input{box-sizing:border-box;min-height:38px;margin:4px 0 0;padding:8px 9px;border-radius:6px!important}#tb .rocket-stage{margin:10px 0;padding:12px;border:1px solid #273344;border-radius:9px;background:#101722}#tb .rocket-stage-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;color:#e6edf6;font-size:.78rem;font-weight:600}#tb .rocket-stage-head button{min-height:30px;padding:4px 8px;color:#e8a4a4!important;border-color:#593838!important;font-size:.65rem!important}#tb .rocket-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}#tb .rocket-actions button{min-height:36px;padding:7px 10px;font-size:.68rem!important}#tb .rocket-results{margin-top:14px;padding:12px;border:1px solid #2a394a;border-radius:9px;background:linear-gradient(145deg,#111b27,#0c1118)}#tb .rocket-results strong{color:#edf5fb}#tb .rocket-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0}#tb .rocket-kpi{padding:9px;border-radius:7px;background:#0a1018}#tb .rocket-kpi span{display:block;color:#91a1b4;font-size:.62rem;text-transform:uppercase;letter-spacing:.06em}#tb .rocket-kpi strong{display:block;margin-top:3px;font-size:.95rem;font-family:var(--font-mono,monospace)}#tb .rocket-stage-result{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;padding:9px 0;border-top:1px solid #273344;font-size:.67rem}#tb .rocket-stage-result span{color:#91a1b4}#tb .rocket-stage-result b{display:block;color:#e4edf7;margin-top:3px;font-family:var(--font-mono,monospace)}#tb .rocket-note{color:#91a1b4;font-size:.72rem}#tb .rocket-status{min-height:1.25em;color:#e9b86c;font-size:.75rem}#tb .trade-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin-top:10px}#tb .trade-card{padding:11px;border:1px solid #29394a;border-radius:8px;background:#101722}#tb .trade-card strong{display:block;color:#e8eef6;font-size:.78rem}#tb .trade-card .trade-tag{color:#8fbded;font-size:.62rem}#tb .trade-metrics{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:9px;color:#9eacb8;font-size:.68rem}#tb .trade-metrics b{display:block;color:#dce7f1;font-size:.76rem}
#tb .tb-overview-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px;border:1px solid #29394a;border-radius:9px;background:#111b27}#tb .tb-overview-head>span{font-size:.64rem;letter-spacing:.1em;color:#9eb0bd}#tb .tb-overview-head strong{font-size:.65rem;letter-spacing:.06em;color:#e9ba73;text-align:right}#tb .tb-overview-head strong.ready{color:#80d7ad}#tb .tb-mission-name{margin:12px 0 4px;color:#eff4f6;font-weight:600}#tb .tb-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}#tb .tb-kpi{padding:10px;border:1px solid #29394a;border-radius:8px;background:#111a25}#tb .tb-kpi span{display:block;color:#90a2af;font-size:.59rem;letter-spacing:.06em}#tb .tb-kpi strong{display:block;margin-top:5px;color:#e8f1f3;font-size:.94rem}#tb .tb-next{padding:10px 12px;border-left:2px solid #78d7e4;background:rgba(120,215,228,.06);color:#cbd8df;font-size:.82rem}#tb .tb-issues{margin:8px 0 14px;padding-left:18px}#tb .tb-issues li{margin:7px 0;color:#e5c28a;font-size:.8rem}#tb .tb-issues li span{display:block;color:#9eacb8;font-size:.74rem}#tb .tb-overview-actions{display:grid;gap:7px;margin-top:14px}#tb .tb-overview-actions button{min-height:38px;border:1px solid #34485a!important;border-radius:7px!important;background:#152434!important;color:#d9eef0!important;font-size:.69rem!important;font-weight:600;letter-spacing:.04em}#tb .tb-overview-actions button:hover{border-color:#78d7e4!important;background:#1a3542!important}
@media(max-width:600px){#quick-access-dock{right:12px;bottom:calc(12px + env(safe-area-inset-bottom));gap:7px}#quick-access-dock button{min-height:46px;padding:0 13px;font-size:.68rem!important}#quick-access-dock svg{width:16px;height:16px}#tb{right:-100vw;bottom:calc(72px + env(safe-area-inset-bottom));width:calc(100vw - 24px);height:calc(100vh - 106px);height:calc(100dvh - 106px)}#tb.open{right:12px}}`;
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: css }));
  const tb = document.createElement('div'); tb.id = 'tb';
  tb.innerHTML = '<div id="tb-top"><div class="tb-title"><span>MISSION ARCHITECT</span><strong>MISSION TOOLBOX</strong></div><button type="button" id="tb-x" aria-label="Close mission toolbox">✕</button></div><div id="tb-tool-nav"><label for="tb-tool">Browse tools</label><select id="tb-tool" aria-label="Choose a mission tool"></select></div><div id="tb-body"></div>'; document.body.appendChild(tb);
  const dock = Object.assign(document.createElement('div'), { id: 'quick-access-dock' }); dock.setAttribute('role', 'group'); dock.setAttribute('aria-label', 'Quick access'); document.body.appendChild(dock);
  const btn = Object.assign(document.createElement('button'), { id: 'tb-btn', type: 'button', title: 'Open mission toolbox' });
  btn.setAttribute('aria-label', 'Open mission toolbox');
  btn.setAttribute('aria-controls', 'tb');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg><span class="quick-label">TOOLBOX</span>';
  dock.appendChild(btn);
  const TABS = { mission: ['MISSION', mission, 'mission'], plan: ['PLANNER', plan, 'mission'], share: ['SHARE', share, 'mission'], rocket: ['ROCKET LAB', rocket, 'design'], view3d: ['3D VIEW', view3d, 'design'], compare: ['COMPARE', compare, 'analysis'], nasa: ['NASA LIVE', nasa, 'data'], learn: ['LEARN', learn, 'learn'] };
  const toolSelect = $('#tb-tool'), GROUPS = [['mission', 'MISSION'], ['design', 'DESIGN'], ['analysis', 'ANALYSIS'], ['learn', 'LEARN'], ['data', 'DATA & REPORTS']];
  let cur = 'mission';
  const renderToolOptions = () => {
    toolSelect.innerHTML = '';
    GROUPS.forEach(([key, title]) => {
      const tools = Object.entries(TABS).filter(([, value]) => value[2] === key);
      if (!tools.length) return;
      const group = document.createElement('optgroup'); group.label = title;
      tools.forEach(([id, value]) => group.appendChild(Object.assign(document.createElement('option'), { value: id, textContent: value[0] })));
      toolSelect.appendChild(group);
    });
    toolSelect.value = cur;
  };
  const open = k => {
    if (k && !TABS[k]) return;
    cur = k || cur;
    toolSelect.value = cur;
    const body = $('#tb-body'); body.innerHTML = ''; TABS[cur][1](body);
  };
  renderToolOptions();
  btn.onclick = () => { const ai = document.getElementById('ai'); if (ai) ai.classList.remove('open'); tb.classList.toggle('open'); const isOpen = tb.classList.contains('open'); btn.setAttribute('aria-expanded', String(isOpen)); if (isOpen) open(); };
  $('#tb-x').onclick = () => { tb.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
  document.addEventListener('mousedown', ev => { if (tb.classList.contains('open') && !ev.target.closest('#tb, #tb-btn')) { tb.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } });
  toolSelect.onchange = () => open(toolSelect.value);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { tb.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } });
  window.ToolboxAPI = {
    add(k, t, f, group) { TABS[k] = [t, f, GROUPS.some(([id]) => id === group) ? group : 'analysis']; renderToolOptions(); },
    open(k) { const ai = document.getElementById('ai'); if (ai) ai.classList.remove('open'); tb.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); open(k); },
    close() { tb.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
  };
  const getKey = () => localStorage.getItem('nasaKey') || 'DEMO_KEY';
  const NASA_CACHE_TTL = 6 * 60 * 60 * 1000;
  const NASA_COOLDOWN_KEY = 'missionArchitect.nasa.retryAfter';
  const NASA_DEFAULT_COOLDOWN = 60 * 60 * 1000;
  const nasaCacheKey = id => 'missionArchitect.nasa.' + id;
  function getNasaCooldown() {
    try {
      const retryAt = Number(localStorage.getItem(NASA_COOLDOWN_KEY));
      return Number.isFinite(retryAt) ? retryAt : 0;
    } catch (error) {
      console.warn('NASA retry status could not be read.', error);
      return 0;
    }
  }
  function makeNasaRateLimitError(retryAt) {
    const error = new Error('NASA rate limit reached.');
    error.status = 429;
    error.retryAt = retryAt;
    return error;
  }
  function readNasaCache(id) {
    try {
      const value = localStorage.getItem(nasaCacheKey(id));
      const entry = value && JSON.parse(value);
      return entry && entry.data && Number.isFinite(entry.savedAt) ? entry : null;
    } catch (error) {
      console.warn('NASA cache read failed; requesting a fresh response.', error);
      return null;
    }
  }
  async function getNasaData(id, url) {
    const cached = readNasaCache(id), now = Date.now();
    if (cached && now - cached.savedAt < NASA_CACHE_TTL) return { data: cached.data, savedAt: cached.savedAt, cached: true };
    const retryAt = getNasaCooldown();
    if (retryAt > now) {
      const error = makeNasaRateLimitError(retryAt);
      if (cached) return { data: cached.data, savedAt: cached.savedAt, cached: true, stale: true, error };
      throw error;
    }
    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 429) {
          const header = response.headers.get('Retry-After'), seconds = Number(header);
          const headerTime = Number.isFinite(seconds) && seconds > 0 ? now + seconds * 1000 : Date.parse(header || '');
          const duration = Math.max(NASA_DEFAULT_COOLDOWN, Number.isFinite(headerTime) ? headerTime - now : 0);
          const retryAt = now + Math.min(24 * 60 * 60 * 1000, duration);
          try { localStorage.setItem(NASA_COOLDOWN_KEY, String(retryAt)); } catch (error) { console.warn('NASA retry status could not be saved.', error); }
          throw makeNasaRateLimitError(retryAt);
        }
        const error = new Error('NASA returned HTTP ' + response.status);
        error.status = response.status;
        throw error;
      }
      const data = await response.json(), entry = { savedAt: now, data };
      try { localStorage.setItem(nasaCacheKey(id), JSON.stringify(entry)); } catch (error) { console.warn('NASA response could not be cached.', error); }
      return { data, savedAt: now, cached: false };
    } catch (error) {
      if (cached) return { data: cached.data, savedAt: cached.savedAt, cached: true, stale: true, error };
      throw error;
    }
  }
  const NASA_CACHE_NOTE = 'Cached locally for 6 hours to reduce NASA API requests.';
  function nasaFailure(error) {
    if (error.status === 429) return 'NASA rate limit reached. Requests pause until ' + escapeHTML(new Date(error.retryAt || Date.now() + NASA_DEFAULT_COOLDOWN).toLocaleTimeString()) + '. Add a personal free NASA API key or wait before trying again.';
    if (error.status === 403) return 'NASA rejected this key. Check it at api.nasa.gov or remove it to use the demo key.';
    return 'NASA data is temporarily unavailable (' + escapeHTML(error.message) + ').';
  }
  function nasaCacheLabel(result) {
    const stamp = new Date(result.savedAt).toLocaleString();
    return '<div class="m">' + (result.stale ? 'Showing cached data; refresh failed.' : result.cached ? 'Cached response.' : 'Live response.') + ' Updated ' + escapeHTML(stamp) + '.</div>';
  }
  function secureNasaUrl(value) {
    const url = new URL(value);
    if (url.protocol === 'http:' && (url.hostname === 'nasa.gov' || url.hostname.endsWith('.nasa.gov'))) url.protocol = 'https:';
    if (url.protocol !== 'https:') throw new Error('NASA returned a non-secure media URL.');
    return url;
  }
  async function nasa(el) {
    el.innerHTML = '<h3>NASA live data</h3><div class="m">Public data from api.nasa.gov. ' + NASA_CACHE_NOTE + ' A personal free key avoids the shared DEMO_KEY limit.</div><label class="m" for="nk">NASA API key (stored only in this browser)</label><input id="nk" type="password" autocomplete="off" placeholder="Optional personal NASA API key"><div id="nl" role="status" aria-live="polite">Loading NASA data…</div>';
    const day = new Date().toISOString().slice(0, 10);
    $('#nk').value = getKey() === 'DEMO_KEY' ? '' : getKey();
    $('#nk').onchange = e => {
      localStorage.setItem('nasaKey', e.target.value.trim() || 'DEMO_KEY');
      ['apod-' + day, 'neo-' + day, 'perseverance-' + day].forEach(id => localStorage.removeItem(nasaCacheKey(id)));
      localStorage.removeItem(NASA_COOLDOWN_KEY);
      open('nasa');
    };
    const k = getKey(), box = $('#nl'); let html = '', rateLimitReported = false;
    const fail = (label, error) => {
      const message = error.status === 429 && rateLimitReported
        ? 'Skipped while the NASA quota cooldown is active.'
        : nasaFailure(error);
      if (error.status === 429) rateLimitReported = true;
      return '<div class="no">' + label + ': ' + message + '</div>';
    };
    try {
      const result = await getNasaData('apod-' + day, 'https://api.nasa.gov/planetary/apod?api_key=' + encodeURIComponent(k)), a = result.data;
      const url = secureNasaUrl(a.url);
      html += '<h3>Picture of the day</h3><b>' + escapeHTML(a.title) + '</b>' +
        (a.media_type === 'image' ? '<img src="' + escapeHTML(url.href) + '" alt="">' : '<div class="m">(video) <a href="' + escapeHTML(url.href) + '" target="_blank" rel="noopener">open</a></div>') +
        '<div class="m">' + escapeHTML(a.copyright || 'NASA APOD') + '</div>' + nasaCacheLabel(result);
      if (result.stale) html += '<div class="m">' + nasaFailure(result.error) + '</div>';
    } catch (error) { html += fail('APOD unavailable', error); }
    try {
      const result = await getNasaData('neo-' + day, 'https://api.nasa.gov/neo/rest/v1/feed?start_date=' + day + '&end_date=' + day + '&api_key=' + encodeURIComponent(k)), n = result.data;
      const objects = n.near_earth_objects[day] || [], closest = objects.map(o => +o.close_approach_data[0].miss_distance.kilometers).sort((a, b) => a - b)[0];
      html += '<h3>Near-Earth objects today</h3>' + objects.length + ' tracked, ' + objects.filter(o => o.is_potentially_hazardous_asteroid).length +
        ' flagged potentially hazardous. Closest pass: ' + (closest ? Math.round(closest).toLocaleString() + ' km' : 'n/a') + nasaCacheLabel(result);
      if (result.stale) html += '<div class="m">' + nasaFailure(result.error) + '</div>';
    } catch (error) { html += fail('NeoWs unavailable', error); }
    try {
      const result = await getNasaData('perseverance-' + day, 'https://api.nasa.gov/mars-photos/api/v1/rovers/perseverance/latest_photos?api_key=' + encodeURIComponent(k)), photos = result.data.latest_photos || [], photo = photos[0];
      if (!photo) throw new Error('No Perseverance photo is available yet.');
      const url = secureNasaUrl(photo.img_src);
      html += '<h3>Latest Perseverance photo</h3><img src="' + escapeHTML(url.href) + '" alt="Latest Perseverance rover image"><div class="m">' + escapeHTML(photo.camera.full_name) + ', Earth date ' + escapeHTML(photo.earth_date) + '</div>' + nasaCacheLabel(result);
      if (result.stale) html += '<div class="m">' + nasaFailure(result.error) + '</div>';
    } catch (error) { html += fail('Mars photos unavailable', error); }
    box.innerHTML = html;
  }
  function compare(el) {
    const r = rep(); if (!r) return el.textContent = 'Build a design first.'; const x = REAL[r.destination.id] || REAL.mars;
    const row = (l, a, b, u) => '<tr><td>' + l + '</td><td>' + Math.round(a).toLocaleString() + u + '</td><td>' + Math.round(b).toLocaleString() + u + '</td></tr>';
    const m = window.__mission, d = m.getDesign(), D = m.data;
    const launcherRows = Object.entries(D.launchVehicles).map(([id, vehicle]) => {
      const trial = m.engine.evaluateMissionArchitecture(Object.assign({}, d, { launchVehicleId: id }));
      return '<article class="trade-card"><div class="trade-tag">' + (id === d.launchVehicleId ? 'SELECTED VEHICLE' : '&nbsp;') +
        '</div><strong>' + escapeHTML(vehicle.name) + '</strong><div class="trade-metrics"><span>Capacity<b>' +
        trial.mass.launchMassLimitKg.toLocaleString() + ' kg</b></span><span>Mass margin<b class="' +
        (trial.mass.launchMassMarginKg >= 0 ? 'ok' : 'no') + '">' + trial.mass.launchMassMarginKg.toLocaleString() +
        ' kg</b></span><span>Mission cost<b>$' + trial.cost.totalCostMillions.toLocaleString() +
        'M</b></span><span>Checks<b class="' + (trial.isLaunchReady ? 'ok' : 'no') + '">' +
        (trial.isLaunchReady ? 'Pass' : trial.alerts.length + ' alerts') + '</b></span></div></article>';
    }).join('');
    el.innerHTML = '<h3>Design vs. ' + escapeHTML(x.n) + '</h3><table><tr><th></th><th>Yours</th><th>Reference</th></tr>' +
      row('Launch mass', r.mass.wetMassKg, x.kg, ' kg') + row('Cost', r.cost.totalCostMillions, x.cost, ' M$') +
      '</table><p class="m">Real-mission figures are approximate public numbers. Verify before citing.</p><p>Engineering score: <b>' +
      r.engineeringScore + '/100</b>. Science coverage: <b>' + r.science.coveragePct + '%</b>.</p><h3 style="margin-top:20px">Launch vehicle trade study</h3>' +
      '<p class="m">Same spacecraft design evaluated against each catalog vehicle. Margins and costs are model estimates.</p>' +
      '<div class="trade-grid">' + launcherRows + '</div>';
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
  function presetStages(vehicleId) {
    const vehicle = window.LAUNCH_NASA && window.LAUNCH_NASA.VEHICLES[vehicleId];
    if (!vehicle) return null;
    const stages = vehicle.stages.map((stage, index) => {
      const coreThrottle = index === 0 ? (vehicle.coreThrottle || 1) : 1;
      const coreThrust = stage.thrustVac * coreThrottle;
      let totalThrust = coreThrust, flowFactor = coreThrust / stage.ispVac;
      let dryMassKg = stage.dryKg, propellantMassKg = stage.propKg;
      if (index === 0 && vehicle.boost) {
        const boosterThrust = vehicle.boost.thrustVac;
        totalThrust += boosterThrust;
        flowFactor += boosterThrust / vehicle.boost.ispVac;
        dryMassKg += vehicle.boost.dryKg;
        propellantMassKg += vehicle.boost.propKg;
      }
      return {
        dryMassKg,
        propellantMassKg,
        ispSeconds: totalThrust / flowFactor,
        thrustKN: totalThrust
      };
    });
    return { stages, boostersAggregated: Boolean(vehicle.boost) };
  }
  function rocket(el) {
    const m = window.__mission, r = rep();
    if (!m || !r || !window.MissionMath || !window.LAUNCH_NASA) {
      el.innerHTML = '<h3>Rocket sizing lab</h3><p>Mission data or the launch model is not ready yet. Reload the page if this message remains.</p>';
      return;
    }
    const vehicles = Object.entries(m.data.launchVehicles);
    const reset = (vehicleId, payloadKg) => {
      const preset = presetStages(vehicleId);
      if (!preset) return false;
      rocketState = { vehicleId, payloadKg, stages: preset.stages, boostersAggregated: preset.boostersAggregated };
      return true;
    };
    if (!rocketState && !reset(m.getDesign().launchVehicleId, r.mass.wetMassKg)) {
      el.innerHTML = '<h3>Rocket sizing lab</h3><p>The selected launch vehicle has no staged performance data.</p>';
      return;
    }
    const format = (value, places) => Number.isFinite(value) ? value.toLocaleString(undefined, { minimumFractionDigits: places, maximumFractionDigits: places }) : '—';
    const stageHtml = () => rocketState.stages.map((stage, index) => {
      const field = (key, label, unit, step) => '<label class="rocket-field">' + label + ' (' + unit + ')<input type="number" min="0.1" step="' + step + '" data-stage-index="' + index + '" data-stage-field="' + key + '" value="' + escapeHTML(stage[key]) + '"></label>';
      return '<section class="rocket-stage"><div class="rocket-stage-head"><span>STAGE ' + (index + 1) + (index === 0 ? ' · FIRST STAGE' : ' · UPPER STAGE') +
        '</span>' + (rocketState.stages.length > 1 ? '<button type="button" data-remove-stage="' + index + '" aria-label="Remove stage ' + (index + 1) + '">Remove</button>' : '') +
        '</div><div class="rocket-form-grid">' + field('dryMassKg', 'Dry mass', 'kg', '10') + field('propellantMassKg', 'Propellant', 'kg', '10') +
        field('ispSeconds', 'Vacuum Isp', 's', '1') + field('thrustKN', 'Vacuum thrust', 'kN', '1') + '</div></section>';
    }).join('');
    const render = () => {
      const payload = Number.isFinite(rocketState.payloadKg) ? rocketState.payloadKg : '';
      el.innerHTML = '<h3>Rocket sizing lab</h3><p class="rocket-lede">Explore how staging, payload and engine performance shape ideal rocket delta-v. Start from a catalog vehicle or edit a custom stack.</p>' +
        '<label class="rocket-field" for="rocket-preset">Catalog starting point</label><select id="rocket-preset">' +
        vehicles.map(([id, vehicle]) => '<option value="' + escapeHTML(id) + '"' + (id === rocketState.vehicleId ? ' selected' : '') + '>' + escapeHTML(vehicle.name) + '</option>').join('') +
        '</select><div class="rocket-form-grid"><label class="rocket-field" for="rocket-payload">Spacecraft payload (kg)<input id="rocket-payload" type="number" min="1" step="10" value="' + escapeHTML(payload) + '"></label>' +
        '<div class="rocket-field">Stage order<span class="m" style="display:block;margin-top:8px">Stage 1 is the bottom stage; upper stages follow.</span></div></div>' +
        '<div id="rocket-stages">' + stageHtml() + '</div><div class="rocket-actions"><button type="button" id="rocket-add-stage">ADD UPPER STAGE</button>' +
        '<button type="button" id="rocket-reset">RESET TO MISSION VEHICLE</button><button type="button" id="rocket-apply-vehicle">USE CATALOG VEHICLE IN MISSION</button></div>' +
        '<div id="rocket-status" class="rocket-status" role="status" aria-live="polite"></div><div id="rocket-results" class="rocket-results"></div>' +
        '<p class="rocket-note">Ideal Tsiolkovsky estimate: vacuum Isp, constant thrust and instantaneous stage separation. It excludes gravity, drag, steering and engine throttling. Parallel boosters are combined with Stage 1 here; the ascent replay models their separation separately.</p>';
      const update = () => {
        rocketState.payloadKg = Number(el.querySelector('#rocket-payload').value);
        rocketState.stages = [...el.querySelectorAll('.rocket-stage')].map((row, index) => {
          const value = key => Number(row.querySelector('[data-stage-field="' + key + '"]').value);
          return { dryMassKg: value('dryMassKg'), propellantMassKg: value('propellantMassKg'), ispSeconds: value('ispSeconds'), thrustKN: value('thrustKN'), index };
        });
        const status = el.querySelector('#rocket-status'), results = el.querySelector('#rocket-results');
        try {
          const estimate = window.MissionMath.stagedRocketBudget(rocketState.stages, rocketState.payloadKg);
          status.textContent = estimate.stageResults[0].thrustToWeight < 1.1 ? 'Low initial T/W: the ascent model is likely to report no liftoff.' : '';
          results.innerHTML = '<div class="rocket-kpis"><div class="rocket-kpi"><span>Ideal stack delta-v</span><strong>' + format(estimate.totalDeltaVMS / 1000, 2) + ' km/s</strong></div>' +
            '<div class="rocket-kpi"><span>Stack wet mass</span><strong>' + format(estimate.wetMassKg, 0) + ' kg</strong></div></div>' +
            '<div class="m" style="margin:8px 0">Stage performance at ignition</div>' +
            estimate.stageResults.map(stage => '<div class="rocket-stage-result"><span>Stage ' + stage.stage + '</span><span>Ignition mass<b>' + format(stage.ignitionMassKg, 0) + ' kg</b></span>' +
              '<span>Ideal delta-v<b>' + format(stage.deltaVMS / 1000, 2) + ' km/s</b></span><span>Burn / T/W<b>' + format(stage.burnTimeS, 0) + ' s / ' + format(stage.thrustToWeight, 2) + '</b></span></div>').join('');
        } catch (error) {
          status.textContent = error.message;
          results.innerHTML = '<span class="m">Correct the inputs above to calculate the stack.</span>';
        }
      };
      el.querySelector('#rocket-preset').onchange = event => {
        const payloadKg = rocketState.payloadKg;
        reset(event.target.value, payloadKg);
        render();
      };
      el.querySelector('#rocket-payload').oninput = update;
      el.querySelectorAll('[data-stage-field]').forEach(input => { input.oninput = update; });
      el.querySelector('#rocket-add-stage').onclick = () => {
        if (rocketState.stages.length >= 4) {
          el.querySelector('#rocket-status').textContent = 'The editor supports up to four stages.';
          return;
        }
        rocketState.stages.push({ dryMassKg: 100, propellantMassKg: 600, ispSeconds: 340, thrustKN: 25 });
        render();
      };
      el.querySelectorAll('[data-remove-stage]').forEach(button => {
        button.onclick = () => { rocketState.stages.splice(Number(button.dataset.removeStage), 1); render(); };
      });
      el.querySelector('#rocket-reset').onclick = () => { reset(m.getDesign().launchVehicleId, r.mass.wetMassKg); render(); };
      el.querySelector('#rocket-apply-vehicle').onclick = () => {
        m.apply({ launchVehicleId: el.querySelector('#rocket-preset').value });
        el.querySelector('#rocket-status').textContent = 'Catalog vehicle applied. Recheck mission launch-mass margins in the Engineering Bay.';
      };
      update();
    };
    render();
  }
  window.MissionRocket = {
    estimateForVehicle(vehicleId, payloadKg) {
      const preset = presetStages(vehicleId);
      if (!preset || !window.MissionMath) return null;
      return Object.assign(window.MissionMath.stagedRocketBudget(preset.stages, payloadKg), {
        stageCount: preset.stages.length,
        boostersAggregated: preset.boostersAggregated
      });
    }
  };
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
