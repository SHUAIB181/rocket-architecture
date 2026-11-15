/** AUTO-DEBUG: finds and fixes design malfunctions (critical alerts) by searching alternative parts. */
(function () {
  const FIELDS = [['busId', 'bus'], ['powerId', 'power'], ['batteryId', 'batteries'], ['propulsionId', 'propulsion'], ['thermalId', 'thermal'],
    ['shieldingId', 'shielding'], ['telecomId', 'telecom'], ['avionicsId', 'avionics'], ['launchVehicleId', 'launchVehicles']];
  const LABEL = { busId: 'Bus', powerId: 'Power', batteryId: 'Battery', propulsionId: 'Propulsion', thermalId: 'Thermal', shieldingId: 'Radiation shield', telecomId: 'Telecom', avionicsId: 'Avionics', launchVehicleId: 'Launch vehicle', propellantMassKg: 'Propellant', missionClassId: 'Mission class' };
  const CLASS_ORDER = ['cubesat_tech', 'discovery', 'new_frontiers', 'flagship'];

  function solve(engine, data, design) {
    const ev = d => engine.evaluateMissionArchitecture(d);
    const name = (key, id) => { const c = FIELDS.find(f => f[0] === key); const it = c && data[c[1] === 'launchVehicles' ? 'launchVehicles' : 'subsystems'] && (c[1] === 'launchVehicles' ? data.launchVehicles : data.subsystems[c[1]])[id]; return it && it.name ? it.name : id; };
    const tune = d => { // size propellant for 15% delta-v margin
      const r = ev(d), need = r.deltaV.requiredMS * 1.15;
      const p = engine.calculatePropellantForDeltaV(r.mass.dryMassKg, need, r.subsystems.propulsion.ispSeconds);
      d.propellantMassKg = Math.max(20, Math.min(2200, Math.round(p / 20) * 20)); return ev(d);
    };
    const pen = c => FIELDS.filter(f => c[f[0]] !== design[f[0]]).length * 150 + (c.selectedInstrumentIds.length !== (design.selectedInstrumentIds || []).length ? 3000 : 0);
    const deficit = r => 8 * (Math.max(0, -r.power.sunlightMarginPct) + Math.max(0, -r.deltaV.marginPct) + Math.max(0, -r.mass.launchMassMarginPct) + Math.max(0, -r.power.batteryDepthOfDischargePct + 80 > 0 ? 0 : 0));
    const score = (r, c) => r.alerts.length * 10000 + r.warnings.length * 400 + deficit(r) + r.cost.totalCostMillions * 0.05 + pen(c);
    const opts = ([k, cat]) => Object.keys(cat === 'launchVehicles' ? data.launchVehicles : data.subsystems[cat]);
    const start = { ...design, selectedInstrumentIds: [...(design.selectedInstrumentIds || [])] };
    const before = ev(start); let cur = { ...start }, r = tune(cur);
    const tryMoves = (moves) => { let best = null; moves.forEach(m => { const c = { ...cur, ...m }; const rr = tune(c); const s = score(rr, c); if (!best || s < best.s) best = { c, rr, s }; }); return best; };
    for (let i = 0; i < 14 && (r.alerts.length || r.warnings.length); i++) {
      const singles = []; FIELDS.forEach(f => opts(f).forEach(o => { if (cur[f[0]] !== o) singles.push({ [f[0]]: o }); }));
      let b = tryMoves(singles);
      if (!b || b.s >= score(r, cur) - 0.01) { // stuck: try pairs
        const pairs = []; for (let a = 0; a < FIELDS.length; a++) for (let c = a + 1; c < FIELDS.length; c++) opts(FIELDS[a]).forEach(x => opts(FIELDS[c]).forEach(y => pairs.push({ [FIELDS[a][0]]: x, [FIELDS[c][0]]: y })));
        b = tryMoves(pairs);
      }
      if (!b || b.s >= score(r, cur) - 0.01) break;
      cur = b.c; r = b.rr;
    }
    let raised = false;
    if (r.alerts.some(a => a.code === 'BUDGET_CAP_EXCEEDED')) { // last resort: higher cost class
      const idx = CLASS_ORDER.indexOf(cur.missionClassId);
      for (let k = idx + 1; k < CLASS_ORDER.length; k++) { const c = { ...cur, missionClassId: CLASS_ORDER[k] }, rr = tune(c); if (rr.alerts.length < r.alerts.length) { cur = c; r = rr; raised = true; break; } }
    }
    const dropped = []; // last resort: remove instruments that make the design impossible
    while (r.alerts.length && cur.selectedInstrumentIds.length > 1) {
      let best = null;
      cur.selectedInstrumentIds.forEach(id => { const c = { ...cur, selectedInstrumentIds: cur.selectedInstrumentIds.filter(x => x !== id) }, rr = tune(c), v = rr.alerts.length * 10000 + deficit(rr); if (!best || v < best.s) best = { c, rr, id, s: v }; });
      if (!best || !(best.rr.alerts.length < r.alerts.length || (best.rr.alerts.length === r.alerts.length && deficit(best.rr) < deficit(r) - 1))) break;
      cur = best.c; r = best.rr; dropped.push(best.id);
    }
    const changes = [];
    FIELDS.forEach(([k]) => { if (start[k] !== cur[k]) changes.push(LABEL[k] + ': ' + name(k, start[k]) + ' → ' + name(k, cur[k])); });
    if (start.propellantMassKg !== cur.propellantMassKg) changes.push('Propellant: ' + start.propellantMassKg + ' kg → ' + cur.propellantMassKg + ' kg');
    dropped.forEach(id => changes.push('Removed instrument: ' + ((data.instruments[id] || {}).name || id)));
    if (raised) changes.push('Mission class raised to ' + cur.missionClassId + ' (budget cap)');
    return { design: cur, changes, before, after: r, remaining: r.alerts.map(a => a.title), warnings: r.warnings.map(w => w.title), solved: r.alerts.length === 0 };
  }

  if (typeof window !== 'undefined') window.AutoDebug = { solve };
  if (typeof module !== 'undefined') module.exports = { solve };
  if (typeof document === 'undefined' || !document.getElementById) return;

  document.addEventListener('DOMContentLoaded', () => {
    const verify = document.getElementById('verify-and-launch-btn'); if (!verify || !window.__mission) return;
    const log = document.createElement('div'); log.id = 'autodebug-log';
    const btn = document.createElement('button'); btn.id = 'auto-debug-btn'; btn.type = 'button'; btn.textContent = 'AUTO-DEBUG';
    verify.parentNode.insertBefore(log, verify); verify.parentNode.insertBefore(btn, log);
    let backup = null;
    const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    btn.onclick = () => {
      const m = window.__mission, before = { ...m.getDesign(), selectedInstrumentIds: [...(m.getDesign().selectedInstrumentIds || [])] };
      const res = solve(m.engine, m.data, before);
      if (!res.changes.length && !before) return;
      let h = '';
      if (!m.getReport().alerts.length && !res.changes.length) h = '<b class="ad-ok">No malfunctions found.</b> All critical checks pass.' + (res.warnings.length ? '<br><span class="ad-m">Warnings: ' + res.warnings.map(esc).join(', ') + '</span>' : '');
      else {
        backup = before; m.apply(res.design);
        h = (res.solved ? '<b class="ad-ok">Fixed. All critical alerts resolved.</b>' : '<b class="ad-bad">Partly fixed. Could not resolve: ' + res.remaining.map(esc).join(', ') + '</b>') +
          '<ul>' + res.changes.map(c => '<li>' + esc(c) + '</li>').join('') + '</ul>' +
          '<span class="ad-m">Alerts ' + res.before.alerts.length + ' → ' + res.after.alerts.length + ', score ' + res.before.engineeringScore + ' → ' + res.after.engineeringScore + ', cost $' + res.after.cost.totalCostMillions + 'M</span>' +
          (res.solved ? '' : '<br><span class="ad-m">Try a different destination, a bigger mission class, or fewer instruments.</span>') + '<br><button type="button" id="ad-undo">UNDO</button>';
      }
      log.innerHTML = h; const u = document.getElementById('ad-undo'); if (u) u.onclick = () => { m.apply(backup); log.innerHTML = '<span class="ad-m">Changes undone.</span>'; };
    };
    setInterval(() => { const r = window.__mission.getReport(), n = r ? r.alerts.length : 0; btn.textContent = n ? 'AUTO-DEBUG (' + n + ' issue' + (n > 1 ? 's' : '') + ')' : 'AUTO-DEBUG'; btn.classList.toggle('ad-alert', n > 0); }, 600);
  });
})();
