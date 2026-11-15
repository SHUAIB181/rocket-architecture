/** AI COACH: server-side Gemini when configured, otherwise the built-in offline coach. */
(function () {
  if (typeof document === 'undefined') return;
  const KEYS = ['busId', 'powerId', 'batteryId', 'propulsionId', 'thermalId', 'shieldingId', 'telecomId', 'avionicsId', 'launchVehicleId'];
  const CATS = { busId: 'bus', powerId: 'power', batteryId: 'batteries', propulsionId: 'propulsion', thermalId: 'thermal', shieldingId: 'shielding', telecomId: 'telecom', avionicsId: 'avionics' };
  const CLASSES = ['cubesat_tech', 'discovery', 'new_frontiers', 'flagship'];
  const M = () => window.__mission, hist = []; let backup = null;
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const inl = s => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
  function md(t) { // tiny safe markdown; also hides the apply block while it streams in
    const lines = esc(t).replace(/```[\s\S]*?(```|$)/g, '').trim().split('\n'); let h = '', ul = false;
    lines.forEach(l => { const m = l.match(/^\s*[-*]\s+(.*)/); if (m) { if (!ul) { h += '<ul>'; ul = true; } h += '<li>' + inl(m[1]) + '</li>'; } else { if (ul) { h += '</ul>'; ul = false; } if (l.trim()) h += '<p>' + inl(l) + '</p>'; } });
    return h + (ul ? '</ul>' : '');
  }
  const css = `#ai-btn{position:fixed;right:118px;bottom:18px;z-index:999}#ai{position:fixed;top:0;right:-440px;width:420px;max-width:100vw;height:100%;z-index:1001;background:#0e1013;border-left:1px solid #22262c;transition:right .35s cubic-bezier(.22,.61,.36,1);display:flex;flex-direction:column}#ai.open{right:0}
#ai-head{padding:12px 16px;border-bottom:1px solid #22262c;display:flex;justify-content:space-between;align-items:center;gap:8px}#ai-head .r{display:flex;gap:6px;align-items:center}#ai-st{font-size:.7rem;padding:2px 8px;border-radius:10px;border:1px solid #3a3f47;color:#9a9ea6}#ai-st.on{color:#3ecf8e;border-color:#245f47}
#ai-log{flex:1;overflow:auto;padding:14px;font-size:.9rem;line-height:1.55}
.ai-m{margin:0 0 12px;padding:10px 12px;border-radius:8px;max-width:92%}.ai-u{background:#1a1e24;margin-left:auto;white-space:pre-wrap}.ai-a{background:#12151a;border:1px solid #22262c}.ai-a p{margin:0 0 8px}.ai-a p:last-child{margin:0}.ai-a ul{margin:0 0 8px 18px;padding:0}.ai-a code{background:#1a1e24;padding:1px 4px;border-radius:3px}.ai-s{color:#7c828c;font-size:.75rem;margin-top:8px}
 #ai-q{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 8px}#ai-q button{font-size:.75rem;padding:5px 9px}#ai-in{display:flex;gap:8px;padding:12px 14px calc(12px + env(safe-area-inset-bottom));border-top:1px solid #22262c}#ai-in input{flex:1;padding:9px;min-width:0}
@media(max-width:480px){#ai-btn{right:104px;bottom:calc(12px + env(safe-area-inset-bottom))}#ai{width:100vw}}`;
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: css }));
  const panel = document.createElement('section');
  panel.id = 'ai';
  panel.setAttribute('aria-label', 'AI Coach');
  panel.innerHTML = '<div id="ai-head"><strong>AI COACH</strong><div class="r"><span id="ai-st" role="status" aria-live="polite">Ready</span><button type="button" id="ai-x" aria-label="Close AI Coach">×</button></div></div><div id="ai-log" aria-live="polite"></div><div id="ai-q"></div><div id="ai-in"><input id="ai-i" type="text" aria-label="Ask the AI Coach" placeholder="Ask about your mission..."><button type="button" id="ai-s">Send</button></div>';
  document.body.appendChild(panel);
  const btn = Object.assign(document.createElement('button'), { id: 'ai-btn', type: 'button', textContent: 'AI COACH' });
  document.body.appendChild(btn);
  const $ = s => panel.querySelector(s), log = $('#ai-log'), inp = $('#ai-i');
  const add = (cls, html) => { const d = document.createElement('div'); d.className = 'ai-m ' + cls; d.innerHTML = html; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; };
  const setStatus = (on, txt) => { const s = $('#ai-st'); s.textContent = txt; s.classList.toggle('on', on); };
  async function checkAIStatus() {
    try {
      const response = await fetch('/api/health', { cache: 'no-store' });
      if (!response.ok) throw new Error('health_check_failed');
      const health = await response.json();
      const configured = health.configured === true;
      setStatus(configured, configured ? 'Gemini configured' : 'Offline coach');
    } catch (error) {
      setStatus(false, 'Offline coach');
    }
  }
  [['What is earth observation?', 'What is earth observation?'], ['Why is my design failing?', 'Why is my design failing and how do I fix it?'], ['Fix it for me', 'Fix my design with the fewest changes.'], ['Explain delta-v', 'Explain delta-v simply and where my design stands.']]
    .forEach(([l, q]) => { const b = Object.assign(document.createElement('button'), { type: 'button', textContent: l }); b.onclick = () => ask(q); $('#ai-q').appendChild(b); });
  function ctx() {
    const m = M(), r = m.getReport(), d = m.getDesign(), D = m.data, cat = {};
    Object.entries(CATS).forEach(([k, c]) => cat[k] = Object.entries(D.subsystems[c]).map(([id, v]) => id + ' = ' + (v.name || id)));
    cat.launchVehicleId = Object.entries(D.launchVehicles).map(([id, v]) => id + ' = ' + (v.name || id)); cat.instruments = Object.entries(D.instruments).map(([id, v]) => id + ' = ' + (v.name || id)); cat.missionClassId = CLASSES;
    return { design: d, status: { destination: r.destination.id, wetMassKg: r.mass.wetMassKg, dryMassKg: r.mass.dryMassKg, costMillions: r.cost.totalCostMillions, deltaVMarginPct: r.deltaV.marginPct, powerMarginPct: r.power.sunlightMarginPct, launchMassMarginPct: r.mass.launchMassMarginPct, score: r.engineeringScore, launchReady: r.isLaunchReady, alerts: r.alerts.map(a => a.code + ': ' + a.title), warnings: r.warnings.map(a => a.code + ': ' + a.title) }, catalog: cat };
  }
  function validate(o) {
    const m = M(), D = m.data, out = {};
    KEYS.forEach(k => { if (o[k] == null) return; const pool = k === 'launchVehicleId' ? D.launchVehicles : D.subsystems[CATS[k]]; if (pool && pool[o[k]]) out[k] = o[k]; });
    if (CLASSES.includes(o.missionClassId)) out.missionClassId = o.missionClassId;
    if (typeof o.propellantMassKg === 'number') out.propellantMassKg = Math.max(20, Math.min(2200, Math.round(o.propellantMassKg / 20) * 20));
    if (Array.isArray(o.selectedInstrumentIds)) { const ok = o.selectedInstrumentIds.filter(i => D.instruments[i]); if (ok.length) out.selectedInstrumentIds = ok; }
    return out;
  }
  function finish(el, text, note) { // render final text, attach Apply button if the AI proposed a valid change
    let change = null; const m = text.match(/```apply\s*([\s\S]*?)```/);
    if (m) { try { change = validate(JSON.parse(m[1])); } catch (e) { change = null; } }
    el.innerHTML = md(text) + (note ? '<div class="ai-s">' + note + '</div>' : '');
    if (change && Object.keys(change).length) {
      const b = Object.assign(document.createElement('button'), { type: 'button', textContent: 'APPLY SUGGESTION (' + Object.keys(change).length + ' changes)' }); b.style.marginTop = '8px';
      b.onclick = () => { backup = JSON.parse(JSON.stringify(M().getDesign())); M().apply(change); b.textContent = 'APPLIED - UNDO'; b.onclick = () => { M().apply(backup); b.remove(); }; };
      el.appendChild(b);
    }
    log.scrollTop = log.scrollHeight;
  }
  async function readStream(resp, onText) {
    const rd = resp.body.getReader(), dec = new TextDecoder(), st = { buf: '' }; let acc = '';
    for (;;) { const { done, value } = await rd.read(); if (done) break; window.AICore.parseSSE(st, dec.decode(value, { stream: true })).forEach(t => { acc += t; }); onText(acc); }
    if (!acc) throw new Error('empty'); return acc;
  }
async function callLLM(onText) {
  const c = ctx();
  const msgs = hist.slice(-12);

  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: msgs,
        context: c
      })
    });

    if (!r.ok) {
      throw new Error('http_' + r.status);
    }

    const data = await r.json();

    const text = data.content || 'No response';

    onText(text);

    return text;
  } catch (e) {
    throw e;
  }
}
  function offline(q, why) {
    const m = M(), r = m.getReport(), s = window.AutoDebug && window.AutoDebug.solve(m.engine, m.data, m.getDesign());
    if (/fix|debug|fail|wrong|problem|alert|error|why is my/i.test(q)) {
      if (!r.alerts.length) return 'No critical alerts: your design is launch-ready (score ' + r.engineeringScore + '/100).' + (r.warnings.length ? ' Warnings to consider: ' + r.warnings.map(w => w.title).join(', ') + '.' : '');
      const diff = s ? Object.fromEntries(Object.keys(s.design).filter(k => JSON.stringify(s.design[k]) !== JSON.stringify(m.getDesign()[k])).map(k => [k, s.design[k]])) : {};
      return 'Problems found: ' + r.alerts.map(a => a.title).join('; ') + '.\n' + (s && s.changes.length ? 'Smallest fix I found:\n- ' + s.changes.join('\n- ') + (s.solved ? '' : '\n(Some issues may remain.)') : '') + '\n```apply\n' + JSON.stringify(diff) + '\n```';
    }
    if (/cheap|cost|budget|money/i.test(q)) return 'Current cost is about $' + r.cost.totalCostMillions + 'M. The biggest levers are the launch vehicle, propulsion and instruments. Use a smaller rocket only if the launch-mass margin (' + r.mass.launchMassMarginPct + '%) allows it, and drop instruments you do not need.';
    if (/where.*(stand|design)|my design|my rocket|my spacecraft|status|score/i.test(q)) return 'Your design: score ' + r.engineeringScore + '/100, cost $' + r.cost.totalCostMillions + 'M, ' + r.alerts.length + ' critical alert(s), delta-v margin ' + r.deltaV.marginPct + '%.';
    const kb = window.AIKB && window.AIKB.answer(q, m.data); if (kb) return kb;
    const why2 = { http_429: 'The AI service is rate-limited. Try again in a minute.', network: 'I could not reach the AI service (check your internet connection).' }[why] || '';
    return (why2 ? why2 + '\n\n' : '') + 'I can answer common space and rocket questions and help fix your design offline. For broader AI answers, run the project server with GEMINI_API_KEY configured.';
  }
async function ask(q) {
  if (!M()) return;

  add('ai-u', esc(q));
  hist.push({ role: 'user', content: q });

  const el = add('ai-a',
    '<span class="ai-s">Thinking</span>'
  );

  let dots = 0;

  const typingTimer = setInterval(() => {
    dots = (dots + 1) % 4;

    el.innerHTML =
      '<span class="ai-s">Thinking' +
      '.'.repeat(dots) +
      '</span>';

    log.scrollTop = log.scrollHeight;
  }, 500);

  try {
    const text = await callLLM(() => {});

    clearInterval(typingTimer);

    hist.push({
      role: 'assistant',
      content: text
    });

    finish(el, text);

    setStatus(true, 'AI online');
  }
  catch (e) {

    clearInterval(typingTimer);

    console.error("AI ERROR:", e);

    const t = offline(q, e.message);

    hist.push({
      role: 'assistant',
      content: t
    });

    finish(
      el,
      t,
      'Offline coach (AI unavailable)'
    );

    setStatus(false, 'Offline');
  }
}
  const greeting = 'Hi! Ask me anything about space, rockets or your design: **"what is delta-v?"**, **"why do rockets stage?"**, **"why is my design failing?"**.';
  btn.onclick = () => { const t = document.getElementById('tb'); if (t) t.classList.remove('open'); panel.classList.toggle('open'); if (!log.children.length) add('ai-a', md(greeting)); };
  $('#ai-x').onclick = () => panel.classList.remove('open');
  document.addEventListener('keydown', e => { if (e.key === 'Escape') panel.classList.remove('open'); });
  $('#ai-s').onclick = () => { const q = inp.value.trim(); if (q) { inp.value = ''; ask(q); } };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') $('#ai-s').click(); });
  add('ai-a', md(greeting));
  panel.classList.add('open');
  checkAIStatus();
})();
