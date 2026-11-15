/** AI COACH: server-side Gemini when configured, otherwise the built-in offline coach. */
(function () {
  if (typeof document === 'undefined') return;
  const KEYS = ['busId', 'powerId', 'batteryId', 'propulsionId', 'thermalId', 'shieldingId', 'telecomId', 'avionicsId', 'launchVehicleId'];
  const CATS = { busId: 'bus', powerId: 'power', batteryId: 'batteries', propulsionId: 'propulsion', thermalId: 'thermal', shieldingId: 'shielding', telecomId: 'telecom', avionicsId: 'avionics' };
  const CLASSES = ['cubesat_tech', 'discovery', 'new_frontiers', 'flagship'];
  const M = () => window.__mission, hist = []; let busy = false;
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const inl = s => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
  function md(t) { // tiny safe markdown; also hides the apply block while it streams in
    const lines = esc(t).replace(/```[\s\S]*?(```|$)/g, '').trim().split('\n'); let h = '', ul = false;
    lines.forEach(l => { const m = l.match(/^\s*[-*]\s+(.*)/); if (m) { if (!ul) { h += '<ul>'; ul = true; } h += '<li>' + inl(m[1]) + '</li>'; } else { if (ul) { h += '</ul>'; ul = false; } if (l.trim()) h += '<p>' + inl(l) + '</p>'; } });
    return h + (ul ? '</ul>' : '');
  }
  const css = `#quick-access-dock #ai-btn{background:linear-gradient(135deg,#2776d2,#1754a1)!important;border-color:rgba(110,177,255,.65)!important;color:#fff!important}
#quick-access-dock #ai-btn:hover{background:linear-gradient(135deg,#3288eb,#1d65bb)!important;border-color:#9acbff!important;box-shadow:0 12px 34px rgba(40,117,210,.35)!important}
#ai{position:fixed;top:auto;right:-480px;bottom:calc(84px + env(safe-area-inset-bottom));width:min(440px,calc(100vw - 32px));height:min(720px,calc(100vh - 120px));height:min(720px,calc(100dvh - 120px));max-width:100vw;z-index:1050;background:#0b1018;border:1px solid #293648;border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.62);transition:right .35s cubic-bezier(.22,.61,.36,1);display:flex;flex-direction:column;overflow:hidden}#ai.open{right:20px}
#ai-head{padding:17px 18px;border-bottom:1px solid #222d3b;display:flex;justify-content:space-between;align-items:center;gap:12px;background:linear-gradient(135deg,rgba(58,133,220,.16),rgba(15,22,32,.94) 72%)}#ai-head .ai-brand{display:flex;align-items:center;gap:11px;min-width:0}#ai-head .ai-mark{width:40px;height:40px;display:grid;place-items:center;flex:0 0 auto;border:1px solid rgba(108,174,255,.45);border-radius:13px;background:linear-gradient(145deg,rgba(74,163,255,.24),rgba(25,75,134,.16));color:#8cc4ff}#ai-head .ai-mark svg{width:21px;height:21px}#ai-head .ai-title{display:flex;flex-direction:column;gap:2px;min-width:0}#ai-head .ai-title span{font-size:.59rem;letter-spacing:.15em;color:#8b9db3}#ai-head .ai-title strong{font-size:.9rem;letter-spacing:.04em;color:#f2f6fc}#ai-head .ai-title small{font-size:.62rem;letter-spacing:.1em;color:#8290a1}#ai-head .r{display:flex;gap:8px;align-items:center;flex:0 0 auto}#ai-head #ai-x{width:34px;height:34px;padding:0;border-radius:10px!important;font-size:1.1rem!important}
#ai-st{font-size:.62rem;padding:5px 9px;border-radius:999px;border:1px solid #3a4655;color:#aab5c2;white-space:nowrap}#ai-st.on{color:#8ae0b9;border-color:#286448;background:rgba(48,160,103,.1)}
#ai-log{flex:1;overflow:auto;padding:16px;font-size:.88rem;line-height:1.6;display:flex;flex-direction:column;gap:9px}
.ai-m{margin:0;padding:12px 14px;border-radius:14px;max-width:92%}.ai-u{background:#17345a;border:1px solid #28558c;color:#f4f8ff;margin-left:auto;white-space:pre-wrap}.ai-a{background:#111925;border:1px solid #253344;color:#e0e7f0}.ai-a p{margin:0 0 8px}.ai-a p:last-child{margin:0}.ai-a ul{margin:0 0 8px 18px;padding:0}.ai-a code{background:#1a2737;padding:1px 4px;border-radius:4px}.ai-s{color:#91a1b4;font-size:.73rem;margin-top:8px}
#ai-q{display:flex;flex-wrap:wrap;gap:7px;padding:0 14px 12px}#ai-q button{font-size:.68rem!important;padding:7px 10px;border-radius:999px!important;color:#cbd8e8!important;border-color:#2b3a4c!important;background:#111925!important}#ai-q button:hover{background:#1a2a3e!important;border-color:#4b79ad!important}
#ai-in{display:flex;align-items:center;gap:9px;padding:12px 14px calc(12px + env(safe-area-inset-bottom));border-top:1px solid #222d3b;background:#0e141e}#ai-in input{flex:1;padding:11px 13px;min-width:0;min-height:44px;border-radius:12px!important;background:#0a1018!important;border-color:#2b394b!important}#ai-in #ai-s{width:44px;height:44px;padding:0;border-radius:12px!important;background:#2c78c8!important;border-color:#4a9cf0!important;color:#fff!important;font-size:1.15rem!important}
@media(max-width:600px){#ai{right:-100vw;bottom:calc(72px + env(safe-area-inset-bottom));width:calc(100vw - 24px);height:calc(100vh - 106px);height:calc(100dvh - 106px);max-width:none}#ai.open{right:12px}#ai-head{padding:14px}#ai-head .ai-mark{width:36px;height:36px}#ai-head .ai-title strong{font-size:.78rem}#ai-st{font-size:.58rem;padding:5px 7px}}`;
  document.head.appendChild(Object.assign(document.createElement('style'), { textContent: css }));
  const panel = document.createElement('section');
  panel.id = 'ai';
  panel.setAttribute('aria-label', 'Mission Intelligence');
  panel.innerHTML = '<div id="ai-head"><div class="ai-brand"><div class="ai-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2.8 14.3 9.7 21.2 12l-6.9 2.3L12 21.2l-2.3-6.9L2.8 12l6.9-2.3L12 2.8Z"/><circle cx="12" cy="12" r="2.1"/></svg></div><div class="ai-title"><span>MISSION ARCHITECT</span><strong>MISSION INTELLIGENCE</strong><small>DESIGN ASSISTANT · ENGINEERING TUTOR</small></div></div><div class="r"><span id="ai-st" role="status" aria-live="polite">Checking...</span><button type="button" id="ai-x" aria-label="Close Mission Intelligence">×</button></div></div><div id="ai-log" aria-live="polite"></div><div id="ai-q"></div><div id="ai-in"><input id="ai-i" type="text" aria-label="Ask Mission Intelligence" placeholder="Ask about your mission..."><button type="button" id="ai-s" aria-label="Send message">↑</button></div>';
  document.body.appendChild(panel);
  const btn = Object.assign(document.createElement('button'), { id: 'ai-btn', type: 'button', title: 'Open Mission Intelligence' });
  btn.setAttribute('aria-label', 'Open Mission Intelligence');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 2.8 14.3 9.7 21.2 12l-6.9 2.3L12 21.2l-2.3-6.9L2.8 12l6.9-2.3L12 2.8Z"/><circle cx="12" cy="12" r="2.1"/></svg><span class="quick-label">MISSION AI</span>';
  const dock = document.getElementById('quick-access-dock');
  (dock || document.body).appendChild(btn);
  const $ = s => panel.querySelector(s), log = $('#ai-log'), inp = $('#ai-i');
  const add = (cls, html) => { const d = document.createElement('div'); d.className = 'ai-m ' + cls; d.innerHTML = html; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; };
  const setStatus = (on, txt, detail) => { const s = $('#ai-st'); s.textContent = txt; s.title = detail || ''; s.classList.toggle('on', on); };
  async function checkAIStatus() {
    try {
      const response = await fetch('/api/health', { cache: 'no-store' });
      if (!response.ok) {
        setStatus(false, 'API offline', 'The Gemini Node API is not reachable here. Run npm start locally or deploy the Node server for online AI.');
        return;
      }
      const health = await response.json();
      const configured = health.configured === true;
      setStatus(configured, configured ? 'Gemini ready' : 'No Gemini key', configured
        ? 'A Gemini API key is configured. The first message will verify that the model is reachable.'
        : 'The Node server is reachable, but GEMINI_API_KEY is not configured. Set it in .env or your hosting environment.');
    } catch (error) {
      setStatus(false, 'API offline', 'The Gemini Node API is not reachable here. Run npm start locally or deploy the Node server for online AI.');
    }
  }
  [['Plan a mission', 'Help me design a mission for my current destination. Recommend an objective, architecture, key trade-offs, and next step.'], ['Review my design', 'Review my current spacecraft design. Cite its actual margins and identify the most important next improvement.'], ['Teach me', 'Teach me one important engineering concept from my current design and explain why it matters.'], ['Fix top alert', 'Fix my most serious design alert with the smallest reasonable catalog-valid changes. Explain the trade-off.']]
    .forEach(([l, q]) => { const b = Object.assign(document.createElement('button'), { type: 'button', textContent: l }); b.onclick = () => ask(q); $('#ai-q').appendChild(b); });
  function ctx() {
    const m = M(), r = m.getReport(), d = m.getDesign(), D = m.data, cat = {};
    Object.entries(CATS).forEach(([k, c]) => cat[k] = Object.entries(D.subsystems[c]).map(([id, v]) => id + ' = ' + (v.name || id)));
    cat.launchVehicleId = Object.entries(D.launchVehicles).map(([id, v]) => id + ' = ' + (v.name || id));
    cat.instruments = Object.entries(D.instruments).map(([id, v]) => id + ' = ' + (v.name || id));
    cat.missionClassId = Object.values(D.missionClasses).map(v => v.id + ' = ' + v.name + ' (budget cap $' + v.budgetCapMillions + 'M)');
    return {
      design: d,
      status: {
        destination: { id: r.destination.id, name: r.destination.name },
        missionClass: { id: d.missionClassId, name: (D.missionClasses[d.missionClassId] || {}).name },
        launchVehicle: r.launchVehicle.name,
        wetMassKg: r.mass.wetMassKg,
        dryMassKg: r.mass.dryMassKg,
        launchMassLimitKg: r.mass.launchMassLimitKg,
        launchMassMarginPct: r.mass.launchMassMarginPct,
        costMillions: r.cost.totalCostMillions,
        budgetCapMillions: r.cost.budgetCapMillions,
        deltaVMarginPct: r.deltaV.marginPct,
        powerMarginPct: r.power.sunlightMarginPct,
        scienceCoveragePct: r.science.coveragePct,
        thermalViable: r.thermal.isViable,
        radiationViable: r.radiation.isViable,
        score: r.engineeringScore,
        launchReady: r.isLaunchReady,
        alerts: r.alerts.map(a => a.code + ': ' + a.title),
        warnings: r.warnings.map(a => a.code + ': ' + a.title)
      },
      catalog: cat
    };
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
    let change = null, applyNotice = '';
    const m = text.match(/```apply\s*([\s\S]*?)```/);
    if (m) {
      try {
        const proposed = JSON.parse(m[1]);
        change = validate(proposed);
        const ignored = Object.keys(proposed).filter(k => !Object.prototype.hasOwnProperty.call(change, k));
        if (ignored.length) applyNotice = 'Some suggested fields were unsupported and were not applied.';
      } catch (e) {
        applyNotice = 'The suggested changes could not be validated, so no design changes were applied.';
      }
    }
    el.innerHTML = md(text) + (note ? '<div class="ai-s">' + note + '</div>' : '') + (applyNotice ? '<div class="ai-s">' + applyNotice + '</div>' : '');
    if (change && Object.keys(change).length) {
      const b = Object.assign(document.createElement('button'), { type: 'button', textContent: 'APPLY SUGGESTION (' + Object.keys(change).length + ' changes)' }); b.style.marginTop = '8px';
      let previousDesign = null;
      b.onclick = () => {
        if (!previousDesign) {
          previousDesign = JSON.parse(JSON.stringify(M().getDesign()));
          M().apply(change);
          b.textContent = 'APPLIED - UNDO';
          return;
        }
        M().apply(previousDesign);
        previousDesign = null;
        b.textContent = 'UNDONE';
        b.disabled = true;
      };
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
  const m = M(), r = m.getReport(), d = m.getDesign(), D = m.data;
  const missionClass = D.missionClasses[d.missionClassId] || {};
  const destination = D.destinations[d.destinationId] || {};
  const issue = r.alerts[0] || r.warnings[0];
  const hint = issue && window.MISSION_HINTS && window.MISSION_HINTS[issue.code];
  if (/fix|debug|fail|problem|critical alert|what is wrong|why is my design failing|broken/i.test(q)) {
    if (!r.alerts.length && !r.warnings.length) return 'No critical alerts or warnings. The current design passes its modeled checks with a score of ' + r.engineeringScore + '/100.';
    const s = window.AutoDebug && window.AutoDebug.solve(m.engine, D, d);
    const diff = s ? Object.fromEntries(Object.keys(s.design).filter(k => JSON.stringify(s.design[k]) !== JSON.stringify(d[k])).map(k => [k, s.design[k]])) : {};
    const explanation = r.alerts.length
      ? 'Critical issues: ' + r.alerts.map(a => a.title).join('; ') + '.'
      : 'No critical alerts; the remaining modeled warnings are: ' + r.warnings.map(w => w.title).join('; ') + '.';
    const fixes = s && s.changes.length
      ? '\nSmallest candidate fix:\n- ' + s.changes.join('\n- ') + (s.solved ? '' : '\n(Some issues may remain.)')
      : hint ? '\nSuggested next step: ' + hint : '';
    const applyBlock = Object.keys(diff).length ? '\n```apply\n' + JSON.stringify(diff) + '\n```' : '';
    return explanation + fixes + applyBlock;
  }
  if (/review|assess|audit|evaluate|ready to launch|how does my design look/i.test(q)) {
    const next = issue
      ? (hint || 'Address the highest-priority alert, then recheck the engineering margins.')
      : 'Critical checks pass. Review the warnings and risk estimate before proceeding.';
    return (r.isLaunchReady ? 'Design review: critical checks pass.' : 'Design review: more work is needed before launch.') +
      '\nTarget: ' + (destination.name || d.destinationId) + ' · ' + (missionClass.name || d.missionClassId) +
      '\nScore: ' + r.engineeringScore + '/100 · Cost: $' + r.cost.totalCostMillions + 'M / $' + missionClass.budgetCapMillions + 'M' +
      '\nMargins: mass ' + r.mass.launchMassMarginPct + '% · delta-v ' + r.deltaV.marginPct + '% · power ' + r.power.sunlightMarginPct + '%' +
      (issue ? '\nTop constraint: ' + issue.title : '\nTop constraint: none critical') +
      '\nNext step: ' + next;
  }
  if (/cheap|cost|budget|money/i.test(q)) return 'Current cost is about $' + r.cost.totalCostMillions + 'M against a $' + missionClass.budgetCapMillions + 'M class cap. The biggest levers are the launch vehicle, propulsion and instruments. Use a smaller launcher only if the launch-mass margin (' + r.mass.launchMassMarginPct + '%) allows it, and remove instruments only when they are not needed for the science objective.';
  const kb = window.AIKB && window.AIKB.answer(q, D); if (kb) return kb;
  if (/teach|explain|learn/i.test(q)) {
    if (issue) return 'Lesson from your current design: ' + issue.title + '. ' + (hint || 'This warning marks a constraint that can reduce mission reliability. Compare the margin before and after each change.');
    return 'A good spacecraft design balances science return, mass, power, propulsion, thermal control, radiation protection, communications and cost. Tell me which trade-off you want to explore, and I will connect it to your current mission.';
  }
  if (/design|plan|architecture|recommend|rocket|spacecraft|mission/i.test(q)) {
    const pool = D.subsystems;
    const name = (items, id) => items[id] ? items[id].name : id;
    const vehicle = D.launchVehicles[d.launchVehicleId] || {};
    return 'Mission starting point for ' + (destination.name || d.destinationId) + ': set a clear science objective first, then choose instruments, power, propulsion, shielding and communications to match the environment and the ' + (missionClass.name || d.missionClassId) + ' budget.' +
      '\nCurrent baseline: ' + name(pool.bus, d.busId) + ', ' + name(pool.power, d.powerId) + ', ' + name(pool.propulsion, d.propulsionId) + ', ' + (vehicle.name || d.launchVehicleId) + '. Score ' + r.engineeringScore + '/100 with ' + r.alerts.length + ' critical alert(s).' +
      '\nWhich should we optimize first: science return, cost, or reliability?';
  }
  if (/where.*(stand|design)|my design|my rocket|my spacecraft|status|score/i.test(q)) return 'Your design: score ' + r.engineeringScore + '/100, cost $' + r.cost.totalCostMillions + 'M, ' + r.alerts.length + ' critical alert(s), delta-v margin ' + r.deltaV.marginPct + '%, and power margin ' + r.power.sunlightMarginPct + '%.';
  const serviceMessage = {
    http_429: 'Gemini is rate-limited right now.',
    http_503: 'Gemini is not configured on this server.',
    http_500: 'The Gemini request failed on the server.',
    http_502: 'The Gemini service is temporarily unavailable.',
    http_413: 'The mission context is too large to send.',
    network: 'I could not reach the Gemini service. Check that the Node API is running.'
  }[why] || '';
  return (serviceMessage ? serviceMessage + ' ' : '') + 'I can still review the current design, explain common engineering concepts, and suggest simulator changes offline.';
  }
  function failureCode(error) {
    const http = String(error.message || '').match(/^http_(\d{3})$/);
    if (http) return 'http_' + http[1];
    return /network|fetch|connection/i.test(String(error.message || '')) ? 'network' : 'service';
  }
async function ask(q) {
if (!M() || busy) return;
busy = true;
const sendButton = $('#ai-s');
const suggestions = [...$('#ai-q').querySelectorAll('button')];
sendButton.disabled = true;
inp.disabled = true;
suggestions.forEach(button => { button.disabled = true; });

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
    hist.push({
      role: 'assistant',
      content: text
    });

    finish(el, text);

    setStatus(true, 'AI online');
  }
  catch (e) {
    console.error("AI ERROR:", e);

    const code = failureCode(e);
    const t = offline(q, code);

    hist.push({
      role: 'assistant',
      content: t
    });

    finish(
      el,
      t,
      'Offline coach · online service unavailable'
    );

    const status = {
      http_429: ['Rate limited', 'Gemini has rate-limited this request. Wait a little before trying again.'],
      http_503: ['No Gemini key', 'Set GEMINI_API_KEY in the Node server environment.'],
      network: ['API offline', 'Run npm start locally or deploy the Node server for online AI.']
    }[code] || ['Gemini error', 'The offline coach is available; check the Node server logs for the Gemini request failure.'];
    setStatus(false, status[0], status[1]);
  }
  finally {
    clearInterval(typingTimer);
    busy = false;
    sendButton.disabled = false;
    inp.disabled = false;
    suggestions.forEach(button => { button.disabled = false; });
  }
}
  const greeting = 'I can help plan a mission, review your current spacecraft, explain the engineering, or suggest a fix. I can see your design; nothing changes unless you choose Apply.';
  btn.onclick = () => { const t = document.getElementById('tb'); if (t) t.classList.remove('open'); panel.classList.toggle('open'); if (!log.children.length) add('ai-a', md(greeting)); };
  window.MissionAI = {
    open: () => panel.classList.add('open'),
    ask: q => {
      const prompt = String(q || '').trim();
      if (!prompt) return;
      const toolbox = document.getElementById('tb');
      if (toolbox) toolbox.classList.remove('open');
      panel.classList.add('open');
      return ask(prompt);
    }
  };
  $('#ai-x').onclick = () => panel.classList.remove('open');
  document.addEventListener('keydown', e => { if (e.key === 'Escape') panel.classList.remove('open'); });
  $('#ai-s').onclick = () => { const q = inp.value.trim(); if (q) { inp.value = ''; ask(q); } };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') $('#ai-s').click(); });
  add('ai-a', md(greeting));
  panel.classList.add('open');
  checkAIStatus();
})();
