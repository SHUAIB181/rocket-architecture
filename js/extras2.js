/** Toolbox tabs: RISK (Monte Carlo), TRAVEL (delta-v budget), REPORT (print to PDF), SOURCES, DEMO. */
(function () {
  const T = window.ToolboxAPI; if (!T) return;
  const $ = s => document.querySelector(s), M = () => window.__mission, rep = () => (M() ? M().getReport() : null);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const risk = () => { const r = rep(); return r ? window.MissionMath.monteCarlo(r, { vehicleId: M().getDesign().launchVehicleId, trials: 2000, seed: 7 }) : null; };
  T.add('risk', 'RISK', el => {
    const r = rep(); if (!r) return el.textContent = 'Build a design first.'; const m = risk(), pc = Math.round(m.p * 100);
    el.innerHTML = '<h3>Chance of mission success</h3><div style="font-size:2.4rem;font-weight:600;color:' + (pc >= 80 ? '#3ecf8e' : pc >= 50 ? '#e5a93c' : '#ef5a5a') + '">' + pc + '%</div><div class="m">' + m.trials + ' random trials</div>' +
      '<h3 style="margin-top:14px">Why missions failed</h3>' + (Object.keys(m.reasons).length ? Object.entries(m.reasons).sort((a, b) => b[1] - a[1]).map(([k, v]) => '<div>' + esc(k) + ' <span class="m">' + Math.round(v / m.trials * 100) + '%</span><div style="height:4px;background:#1a1e24;border-radius:2px"><div style="height:4px;width:' + v / m.trials * 100 + '%;background:#4aa3ff;border-radius:2px"></div></div></div>').join('') : '<div class="ok">No failures in any trial.</div>') +
      '<p class="m">Educational model: random shifts in delta-v (±4%), power (±8%) and launch margin (±3%), plus assumed launch reliability and a 0.5% failure chance per subsystem. It is not a real reliability analysis.</p>';
  });
  T.add('budget', 'TRAVEL', el => {
    el.innerHTML = '<h3>Interplanetary delta-v budget</h3><select id="bt"><option>Moon</option><option>Venus</option><option selected>Mars</option><option>Jupiter</option></select><div id="bo"></div>';
    const r = rep(), go = () => { const b = window.MissionMath.transferBudget($('#bt').value);
      $('#bo').innerHTML = '<table><tr><td>Leave LEO (200 km)</td><td>' + b.dep.toFixed(2) + ' km/s</td></tr><tr><td>Arrival capture</td><td>' + b.arr.toFixed(2) + ' km/s</td></tr><tr><td><b>Total</b></td><td><b>' + b.total.toFixed(2) + ' km/s</b></td></tr><tr><td>Flight time</td><td>' + Math.round(b.days) + ' days</td></tr></table><p class="m">' + esc(b.note) + ' Real missions often cut this with gravity assists.</p>' + (r ? '<p class="m">Your design requirement shown in the Engineering Bay: ' + Math.round(r.deltaV.requiredMS) + ' m/s.</p>' : ''); };
    const map = { moon: 'Moon', mars: 'Mars', europa: 'Jupiter', earth: 'Moon' }; if (r) $('#bt').value = map[r.destination.id] || 'Mars'; $('#bt').onchange = go; go();
  });
  function reportHTML() {
    const r = rep(), m = M(), d = m.getDesign(), D = m.data, S = D.subsystems, mc = risk();
    const nm = (cat, id) => { const o = cat === 'lv' ? D.launchVehicles[id] : S[cat][id]; return o && o.name ? o.name : id; };
    const rows = [['Destination', r.destination.name || d.destinationId], ['Mission class', d.missionClassId], ['Bus', nm('bus', d.busId)], ['Power', nm('power', d.powerId)], ['Battery', nm('batteries', d.batteryId)], ['Propulsion', nm('propulsion', d.propulsionId)], ['Propellant', d.propellantMassKg + ' kg'], ['Thermal', nm('thermal', d.thermalId)], ['Radiation shield', nm('shielding', d.shieldingId)], ['Telecom', nm('telecom', d.telecomId)], ['Avionics', nm('avionics', d.avionicsId)], ['Launch vehicle', nm('lv', d.launchVehicleId)], ['Instruments', (d.selectedInstrumentIds || []).map(i => (D.instruments[i] || {}).name || i).join('; ')]];
    const k = [['Launch mass', Math.round(r.mass.wetMassKg) + ' kg'], ['Cost', '$' + r.cost.totalCostMillions + 'M'], ['Delta-v margin', r.deltaV.marginPct + '%'], ['Power margin', r.power.sunlightMarginPct + '%'], ['Launch mass margin', r.mass.launchMassMarginPct + '%'], ['Engineering score', r.engineeringScore + '/100'], ['Success chance (model)', Math.round(mc.p * 100) + '%']];
    const tr = a => a.map(x => '<tr><td>' + esc(x[0]) + '</td><td>' + esc(x[1]) + '</td></tr>').join('');
    return '<!doctype html><title>Mission report</title><style>body{font:14px/1.5 Inter,Arial,sans-serif;max-width:760px;margin:32px auto;color:#111}h1{font-size:24px}h2{font-size:16px;margin-top:22px;border-bottom:1px solid #ccc}table{width:100%;border-collapse:collapse}td{padding:4px 6px;border-bottom:1px solid #eee;vertical-align:top}td:first-child{width:36%;color:#555}.s{font-size:12px;color:#555}.bad{color:#b00020}</style><h1>Mission Architect: mission report</h1><div class="s">' + new Date().toDateString() + '</div>' +
      '<h2>Design</h2><table>' + tr(rows) + '</table><h2>Results</h2><table>' + tr(k) + '</table><h2>Alerts</h2>' + (r.alerts.length ? '<ul class="bad">' + r.alerts.map(a => '<li>' + esc(a.title) + '</li>').join('') + '</ul>' : '<p>No critical alerts.</p>') +
      '<h2>Data sources</h2><ul class="s">' + window.SOURCES.map(s => '<li>' + esc(s.topic) + ': ' + esc(s.src) + '</li>').join('') + '</ul><h2>Notes</h2><ul class="s">' + window.SOURCE_NOTES.map(n => '<li>' + esc(n) + '</li>').join('') + '</ul>';
  }
  T.add('report', 'REPORT', el => {
    el.innerHTML = '<h3>Mission report</h3><p>Opens a clean, printable report with your design, margins, risk and sources. In the print dialog choose <b>Save as PDF</b>.</p><button type="button" id="rp">OPEN REPORT</button>';
    $('#rp').onclick = () => { if (!rep()) return; const w = window.open('', '_blank'); if (!w) return alert('Please allow pop-ups to open the report.'); w.document.write(reportHTML()); w.document.close(); setTimeout(() => w.print(), 400); };
  });
  T.add('sources', 'SOURCES', el => {
    el.innerHTML = '<h3>Sources and credits</h3>' + window.SOURCES.map(s => '<p><b>' + esc(s.topic) + '</b><br><a href="' + esc(s.url) + '" target="_blank" rel="noopener" style="color:#4aa3ff">' + esc(s.src) + '</a></p>').join('') +
      '<h3>Honesty notes</h3><ul>' + window.SOURCE_NOTES.map(n => '<li>' + esc(n) + '</li>').join('') + '</ul><p class="m">Links were not checked automatically. Please verify before citing.</p>';
  });
  // guided demo
  let cap = null;
  const say = (txt, next) => { if (!cap) { cap = document.createElement('div'); cap.id = 'demo-cap'; document.body.appendChild(cap); } cap.innerHTML = '<span>' + esc(txt) + '</span><button type="button" id="dn">' + (next ? 'NEXT' : 'DONE') + '</button><button type="button" id="dx">STOP</button>'; $('#dx').onclick = stop; $('#dn').onclick = next || stop; };
  const stop = () => { if (cap) { cap.remove(); cap = null; } };
  const STEPS = [
    () => { M().switchTab('briefing'); M().apply({ destinationId: 'mars', missionClassId: 'discovery' }); say('Step 1/5: Choose a destination and mission class. Here: Mars on a Discovery budget.', s(1)); },
    () => { M().apply({ launchVehicleId: 'electron_smallsat', propellantMassKg: 60, powerId: Object.keys(M().data.subsystems.power)[0] }); M().switchTab('engineering'); say('Step 2/5: A deliberately weak design. The ledger shows critical alerts.', s(2)); },
    () => { const b = $('#auto-debug-btn'); if (b) b.click(); say('Step 3/5: Auto-Debug found a minimal fix. Every change is listed and can be undone.', s(3)); },
    () => { T.open('risk'); say('Step 4/5: Risk tab: Monte Carlo chance of success. Also try COMPARE, TRAVEL and REPORT.', s(4)); },
    () => { $('#tb') && $('#tb').classList.remove('open'); M().switchTab('launch'); say('Step 5/5: On the launch pad, verify systems and launch to watch the physics-based ascent with live charts.', null); }];
  const s = i => () => STEPS[i]();
  T.add('demo', 'DEMO', el => { el.innerHTML = '<h3>Guided demo</h3><p>A 5-step tour (about 2 minutes) that builds, breaks and fixes a mission.</p><button type="button" id="ds">START DEMO</button>'; $('#ds').onclick = () => { $('#tb').classList.remove('open'); STEPS[0](); }; });
})();
