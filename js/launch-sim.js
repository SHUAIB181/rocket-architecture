/**
 * MISSION ARCHITECT - LAUNCH ASCENT SIMULATOR + VIDEO PLAYER
 * Physics: 2D point-mass ascent (radial/tangential, Earth-centred inertial) with
 * thrust, gravity, drag, staging, fairing jettison and orbit check.
 *
 * Reference data (public NASA sources, embedded - not fetched live):
 *  - Earth GM, radius, rotation rate (WGS-84 / NASA Earth fact sheet)
 *  - US Standard Atmosphere 1976 (NASA-TM-X-74335), simplified layers to 86 km
 *  - Sutton-Graves stagnation heating (NASA TR R-376): q = 1.7415e-4 * sqrt(rho/Rn) * v^3
 *  - Fairing jettison at 1135 W/m2 free-molecular heating (standard launch criterion)
 *  - Tsiolkovsky equation, NASA Glenn rocket thrust relations
 * Vehicle numbers are approximate public figures - edit VEHICLES to refine them.
 */
const LAUNCH_NASA = {
  mu: 3.986004418e14, R: 6378137, g0: 9.80665, omega: 7.2921159e-5,
  lat: 28.5 * Math.PI / 180, // KSC / Cape Canaveral
  GUIDE: { kick: 2, floor: 4, vrMax: 300, vrScale: 0.01, k: 0.05, loScale: 0 }, // steering tuning
  MATERIALS: {
    al_li_2195: { name: 'Al-Li 2195 (Shuttle ET-class tanks)', dryMult: 1.0 },
    composite:  { name: 'Carbon-fibre composite (NASA CCTD tanks)', dryMult: 0.88 },
    steel_304l: { name: 'Stainless steel 304L', dryMult: 1.10 }
  },
  // stages: dry/prop in kg, thrust in kN, isp in s. lenM/diamM/areaM2 for drag + drawing.
  VEHICLES: {
    electron_smallsat: { lenM: 18, diamM: 1.2, areaM2: 1.2, fairingKg: 44, boosters: 0, stages: [
      { dryKg: 950, propKg: 9250, thrustSL: 190, thrustVac: 224, ispSL: 289, ispVac: 311 },
      { dryKg: 250, propKg: 2050, thrustSL: 25, thrustVac: 25.8, ispSL: 343, ispVac: 343 }] },
    falcon_9: { lenM: 70, diamM: 3.7, areaM2: 10.8, fairingKg: 1900, boosters: 0, stages: [
      { dryKg: 25600, propKg: 395700, thrustSL: 7607, thrustVac: 8227, ispSL: 282, ispVac: 311 },
      { dryKg: 4000, propKg: 92670, thrustSL: 981, thrustVac: 981, ispSL: 348, ispVac: 348 }] },
    falcon_heavy: { lenM: 70, diamM: 12.2, areaM2: 32, fairingKg: 1900, coreThrottle: 0.55,
      boost: { dryKg: 51200, propKg: 791400, thrustSL: 15214, thrustVac: 16454, ispSL: 282, ispVac: 311 }, stages: [
      { dryKg: 25600, propKg: 395700, thrustSL: 7607, thrustVac: 8227, ispSL: 282, ispVac: 311 },
      { dryKg: 4000, propKg: 92670, thrustSL: 981, thrustVac: 981, ispSL: 348, ispVac: 348 }] },
    // SLS Block 1: boosters = twin 5-segment SRBs, core = 4x RS-25, stage 2 = ICPS
    sls_block1: { lenM: 98, diamM: 8.4, areaM2: 70, fairingKg: 0, coreThrottle: 1, guide: { loScale: 45000 },
      boost: { dryKg: 170000, propKg: 1270000, thrustSL: 26000, thrustVac: 28500, ispSL: 242, ispVac: 268 }, stages: [
      { dryKg: 85000, propKg: 987000, thrustSL: 7440, thrustVac: 9276, ispSL: 366, ispVac: 452 },
      { dryKg: 3500, propKg: 25000, thrustSL: 110, thrustVac: 110, ispSL: 462, ispVac: 462 }] }
  }
};

/** US Standard Atmosphere 1976 (simplified): returns {T, p, rho} */
function stdAtmosphere(h) {
  const g = 9.80665, Rg = 287.053;
  h = Math.max(0, h);
  let T, p;
  if (h < 11000) { T = 288.15 - 0.0065 * h; p = 101325 * Math.pow(T / 288.15, 5.2559); }
  else if (h < 20000) { T = 216.65; p = 22632 * Math.exp(-g * (h - 11000) / (Rg * T)); }
  else if (h < 32000) { T = 216.65 + 0.001 * (h - 20000); p = 5474.9 * Math.pow(T / 216.65, -34.163); }
  else if (h < 47000) { T = 228.65 + 0.0028 * (h - 32000); p = 868.02 * Math.pow(T / 228.65, -12.2009); }
  else { T = 270.65; p = 110.91 * Math.exp(-g * (h - 47000) / (Rg * T)); if (h > 71000) T = Math.max(186, 214.65 - 0.002 * (h - 71000)); }
  if (h > 86000) p *= Math.exp(-(h - 86000) / 6000); // thin tail - drag is negligible here
  return { T, p, rho: p / (Rg * T) };
}

/** Precomputes the entire ascent. Returns { frames, events, summary }. */
function simulateAscent(vehicleId, payloadKg, materialId, targetAltKm, windMs) {
  const N = LAUNCH_NASA, veh = N.VEHICLES[vehicleId] || N.VEHICLES.falcon_9;
  const mat = N.MATERIALS[materialId] || N.MATERIALS.al_li_2195;
  const stages = veh.stages.map(s => ({ ...s, dryKg: s.dryKg * mat.dryMult, prop: s.propKg }));
  const bo = veh.boost ? { ...veh.boost, dryKg: veh.boost.dryKg * mat.dryMult, prop: veh.boost.propKg, on: true } : { on: false, prop: 0, dryKg: 0 };
  const G = { ...N.GUIDE, ...(veh.guide || {}) };
  const hT = (targetAltKm || 200) * 1000, rT = N.R + hT;
  let fairing = veh.fairingKg, fairingOn = fairing > 0;
  let r = N.R, th = 0, vr = 0, vt = N.omega * N.R * Math.cos(N.lat), t = 0, si = 0, sepAt = null;
  const events = [], frames = []; const dt = 0.05;
  const ev = (key, text) => events.push({ t, key, text });
  let maxQ = 0, maxG = 0, outcome = null, liftoff = false, seco = false, lastSave = -1, eps = Math.PI / 2;
  const stackMass = () => {
    let m = payloadKg + (fairingOn ? fairing : 0) + (bo.on ? bo.dryKg + bo.prop : 0);
    for (let i = si; i < stages.length; i++) m += stages[i].dryKg + stages[i].prop;
    return m;
  };
  const tw0 = (stages[0].thrustSL + (veh.boost ? veh.boost.thrustSL : 0)) * 1000 / (stackMass() * N.g0);
  if (tw0 < 1.1) { outcome = 'NO_LIFTOFF'; }
  ev('liftoff', 'LIFTOFF - T/W ' + tw0.toFixed(2));
  while (!outcome && t < 1500) {
    const alt = r - N.R, at = stdAtmosphere(alt), m = stackMass();
    const vrel_t = vt - N.omega * r * Math.cos(N.lat) + (windMs || 0) * Math.exp(-Math.pow((alt - 12000) / 7000, 2)), vrel = Math.hypot(vr, vrel_t);
    const q = 0.5 * at.rho * vrel * vrel; maxQ = Math.max(maxQ, q);
    const mach = vrel / Math.sqrt(1.4 * 287.053 * at.T);
    const cd = 0.28 + 0.45 * Math.exp(-Math.pow(mach - 1.15, 2) / 0.6);
    const drag = q * cd * veh.areaM2;
    const heat = 1.7415e-4 * Math.sqrt(at.rho / 1.0) * Math.pow(vrel, 3); // Rn = 1 m nose
    // stage logic
    let s = stages[si];
    if (!seco && sepAt === null && s.prop <= 0 && si < stages.length - 1) {
      ev('meco', (si === 0 ? 'MECO / ' : '') + 'stage ' + (si + 1) + ' burnout'); sepAt = t + 2;
    }
    if (sepAt !== null && t >= sepAt) { si++; sepAt = null; s = stages[si]; ev('sep', 'Stage ' + si + ' separation - stage ' + (si + 1) + ' ignition'); }
    const burning = !seco && sepAt === null && s.prop > 0 && t > 0.5;
    if (!seco && s.prop <= 0 && si === stages.length - 1) { outcome = 'OUT_OF_PROP'; }
    if (fairingOn && alt > 60000 && heat < 1135 && si >= 1) { fairingOn = false; ev('fairing', 'Fairing jettison (heat flux < 1135 W/m2)'); }
    if (!fairingOn && veh.fairingKg > 0 && fairing > 0 && false) fairing = 0;
    // guidance (elevation angle above local horizontal)
    const gEff = N.mu / (r * r) - vt * vt / r;
    if (t < 8) eps = Math.PI / 2;
    else if (t < 14) eps = Math.PI / 2 - G.kick * Math.PI / 180;
    else if (si === 0) {
      let e1 = Math.min(Math.atan2(vr, vrel_t - (windMs || 0) * Math.exp(-Math.pow((alt - 12000) / 7000, 2))), (G.floor + (90 - G.floor) * Math.exp(-alt / 50000)) * Math.PI / 180);
      if (G.loScale) e1 = Math.max(e1, 90 * Math.exp(-alt / G.loScale) * Math.PI / 180); // pitch-program lower bound
      eps = Math.max(0.05, e1);
    }
    else {
      const vrDes = Math.max(-100, Math.min(G.vrMax, (hT - alt) * G.vrScale));
      const aNeed = G.k * (vrDes - vr) + gEff;
      const aT = (s.thrustVac * 1000) / m;
      eps = Math.asin(Math.max(-0.1, Math.min(0.97, aNeed / aT)));
      eps = Math.max(-0.09, Math.min(1.22, eps));
    }
    let T = 0, mdot = 0, Tb = 0, mdotb = 0;
    if (burning) {
      const pr = Math.min(1, at.p / 101325);
      T = (s.thrustVac - (s.thrustVac - s.thrustSL) * pr) * 1000;
      mdot = T / ((s.ispVac - (s.ispVac - s.ispSL) * pr) * N.g0);
      if (bo.on && bo.prop > 0) {
        Tb = (bo.thrustVac - (bo.thrustVac - bo.thrustSL) * pr) * 1000;
        mdotb = Tb / ((bo.ispVac - (bo.ispVac - bo.ispSL) * pr) * N.g0);
        const ct = veh.coreThrottle || 1; T *= ct; mdot *= ct;
      }
      const lim = Math.min(1, 4 * N.g0 * m / (T + Tb)); T *= lim; Tb *= lim; mdot *= lim; mdotb *= lim; // 4 g limit
    }
    const ar = (T + Tb) * Math.sin(eps) / m - drag * (vr / Math.max(1, vrel)) / m;
    const atn = (T + Tb) * Math.cos(eps) / m - drag * (vrel_t / Math.max(1, vrel)) / m;
    const gLoad = Math.abs((T + Tb) / m - drag / m) / N.g0; maxG = Math.max(maxG, gLoad);
    vr += (vt * vt / r - N.mu / (r * r) + ar) * dt;
    vt += (-vr * vt / r + atn) * dt;
    r += vr * dt; th += vt / r * dt;
    if (burning) s.prop = Math.max(0, s.prop - mdot * dt);
    if (Tb > 0) { bo.prop = Math.max(0, bo.prop - mdotb * dt); if (bo.prop <= 0) { bo.on = false; ev('boostersep', 'Booster separation'); } }
    if (!liftoff && alt > 1) liftoff = true;
    if (r < N.R) { r = N.R; if (vr < 0) { if (liftoff) outcome = 'CRASH'; vr = 0; } }
    t += dt;
    if (maxQ === q && q > 5000 && !events.some(e => e.key === 'maxq') && q >= maxQ) { /* detect later */ }
    // SECO when specific energy reaches target circular orbit
    const E = 0.5 * (vr * vr + vt * vt) - N.mu / r;
    const aa = 1 / (2 / r - 2 * (E + N.mu / r) / N.mu), Lm = r * vt, ee = Math.sqrt(Math.max(0, 1 + 2 * E * Lm * Lm / (N.mu * N.mu)));
    const periAlt = aa * (1 - ee) - N.R;
    if (!seco && si >= 1 && sepAt === null && E < 0 && periAlt >= hT * 0.95) {
      seco = true; ev('seco', 'SECO - orbital velocity reached');
    }
    if (t - lastSave >= 0.1) {
      lastSave = t;
      frames.push({ t, alt: r - N.R, vr, vt, vrel, mach, q, heat, g: gLoad, th, m: stackMass(), si, eps, T: T + Tb, pr: Math.min(1, at.p / 101325), burning: T + Tb > 0, fairingOn, sepAt, boostOn: bo.on, down: th * N.R });
    }
    if (seco && t > frames[frames.length - 1].t + 0 && events.find(e => e.key === 'seco') && t - events.find(e => e.key === 'seco').t > 12) { outcome = 'ORBIT'; }
  }
  if (!frames.length) {
    frames.push({ t: 0, alt: 0, vr: 0, vt, vrel: 0, mach: 0, q: 0, heat: 0, g: 0, th, m: stackMass(), si, eps, T: 0, pr: 1, burning: false, fairingOn, sepAt, boostOn: bo.on, down: 0 });
  }
  // derive max-Q event time
  let qi = 0; frames.forEach((f, i) => { if (f.q > frames[qi].q) qi = i; });
  if (frames.length && outcome !== 'NO_LIFTOFF') events.push({ t: frames[qi].t, key: 'maxq', text: 'Max-Q ' + (frames[qi].q / 1000).toFixed(1) + ' kPa at ' + (frames[qi].alt / 1000).toFixed(1) + ' km' });
  events.sort((a, b) => a.t - b.t);
  const last = frames[frames.length - 1] || { alt: 0, vr: 0, vt: 0 };
  const rr = N.R + last.alt, v2 = last.vr * last.vr + last.vt * last.vt;
  const a = 1 / (2 / rr - v2 / N.mu), L = rr * last.vt, E = v2 / 2 - N.mu / rr;
  const e = Math.sqrt(Math.max(0, 1 + 2 * E * L * L / (N.mu * N.mu)));
  const perigeeKm = (a * (1 - e) - N.R) / 1000, apogeeKm = (a * (1 + e) - N.R) / 1000;
  const reached = outcome === 'ORBIT' && perigeeKm > 120;
  const leftoverKg = stages.reduce((x, y, i) => i >= si ? x + y.prop : x, 0);
  return { frames, events, vehicle: veh, summary: {
    success: reached, outcome: reached ? 'ORBIT ACHIEVED' : (outcome === 'NO_LIFTOFF' ? 'NO LIFTOFF - T/W too low' : outcome === 'CRASH' ? 'VEHICLE LOST - fell back to Earth' : 'FAILED - insufficient delta-v for ' + Math.round(hT / 1000) + ' km orbit'),
    perigeeKm, apogeeKm, maxQkPa: maxQ / 1000, maxG, leftoverPropKg: leftoverKg, tw0, payloadKg, material: mat.name, durationS: t } };
}

/** Video-style player: draws the precomputed ascent on a canvas, with scrubber + recording. */
class LaunchPlayer {
  constructor(canvas, cb) {
    this.c = canvas; this.ctx = canvas.getContext('2d'); this.cb = cb || {};
    this.data = null; this.t = 0; this.speed = 8; this.playing = false; this.lastEv = -1; this.last = 0;
    this.stars = Array.from({ length: 120 }, () => [Math.random(), Math.random(), Math.random() * 1.5 + 0.3]);
    this.clouds = Array.from({ length: 9 }, () => [Math.random(), Math.random() * 9000 + 500, Math.random() * 120 + 60]);
    const $ = id => document.getElementById(id);
    this.ui = { play: $('ls-play'), scrub: $('ls-scrub'), speed: $('ls-speed'), mat: $('ls-material'), wind: $('ls-wind'), rec: $('ls-rec'), sum: $('ls-summary') };
    this.ui.play.onclick = () => { this.playing ? this.pause() : this.play(); };
    this.ui.scrub.oninput = () => { this.t = this.ui.scrub.value / 1000 * this.dur(); this.lastEv = this.eventIndexAt(this.t); this.draw(); };
    this.ui.speed.onchange = () => { this.speed = +this.ui.speed.value; };
    this.ui.mat.onchange = () => { if (this.report) this.load(this.report, true); };
    this.ui.rec.onclick = () => this.record();
    if (this.ui.wind) this.ui.wind.onchange = () => { if (this.report) this.load(this.report, true); };
    this.chart = document.getElementById('ls-chart');
    this.trajectoryChart = document.getElementById('ls-trajectory');
  }
  dur() { return this.data && this.data.frames.length ? Math.max(1, this.data.frames[this.data.frames.length - 1].t) : 1; }
  eventIndexAt(t) { let i = -1; this.data.events.forEach((e, k) => { if (e.t <= t) i = k; }); return i; }
  load(report, autoplay) {
    this.report = report;
    const dest = report.destination;
    const target = dest.id === 'earth' ? Math.min(dest.targetAltitudeKm || 700, 800) : 200;
    this.data = simulateAscent(report.launchVehicle.id, report.mass.wetMassKg, this.ui.mat.value, target, this.ui.wind ? +this.ui.wind.value : 0);
    this.t = 0; this.lastEv = -1; this.renderSummary();
    if (autoplay) this.play();
  }
  renderSummary() {
    const s = this.data.summary;
    this.ui.sum.innerHTML = '<b style="color:' + (s.success ? '#10b981' : '#ef4444') + '">' + s.outcome + '</b> &middot; perigee ' + s.perigeeKm.toFixed(0) +
      ' km / apogee ' + s.apogeeKm.toFixed(0) + ' km &middot; Max-Q ' + s.maxQkPa.toFixed(1) + ' kPa &middot; peak ' + s.maxG.toFixed(1) + ' g &middot; T/W ' + s.tw0.toFixed(2) +
      ' &middot; payload ' + s.payloadKg + ' kg &middot; spare propellant ' + Math.round(s.leftoverPropKg) + ' kg';
  }
  play() { if (!this.data) return; if (this.t >= this.dur()) { this.t = 0; this.lastEv = -1; } this.playing = true; this.ui.play.textContent = '⏸'; this.last = performance.now(); this.tick(); }
  pause() { this.playing = false; this.ui.play.textContent = '▶'; }
  tick() {
    if (!this.playing) return;
    const now = performance.now(); this.t += (now - this.last) / 1000 * this.speed; this.last = now;
    if (this.t >= this.dur()) { this.t = this.dur(); this.playing = false; this.ui.play.textContent = '▶'; this.draw(); if (this.cb.onEnd) this.cb.onEnd(this.data.summary); if (this.recorder) this.recorder.stop(); return; }
    this.draw(); requestAnimationFrame(() => this.tick());
  }
  frameAt(t) {
    const f = this.data.frames; let lo = 0, hi = f.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; f[mid].t <= t ? lo = mid : hi = mid; }
    const a = f[lo], b = f[hi], k = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0, o = { ...a };
    ['alt', 'vrel', 'q', 'g', 'm', 'eps', 'T', 'pr', 'mach', 'heat', 'down'].forEach(p => o[p] = a[p] + (b[p] - a[p]) * k);
    o.t = t; return o;
  }
  record() {
    if (!this.data || !window.MediaRecorder || !this.c.captureStream) { alert('Recording is not supported in this browser.'); return; }
    const chunks = []; const rec = new MediaRecorder(this.c.captureStream(30), { mimeType: 'video/webm' });
    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })); a.download = 'mission-launch.webm'; a.click(); this.recorder = null; this.ui.rec.textContent = '⏺ Record video'; };
    this.recorder = rec; this.t = 0; this.lastEv = -1; rec.start(); this.ui.rec.textContent = '● Recording...'; this.play();
  }
  draw() {
    const d = this.data; if (!d) return;
    const rect = this.c.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ctx = this.ctx, W = rect.width, H = rect.height, f = this.frameAt(this.t), alt = f.alt, k = Math.min(1, alt / 90000);
    ctx.setTransform(this.c.width / W, 0, 0, this.c.height / H, 0, 0);
    this.ui.scrub.value = Math.round(this.t / this.dur() * 1000);
    const lerp = (a, b) => a.map((x, i) => Math.round(x + (b[i] - x) * k));
    const top = lerp([30, 50, 90], [0, 0, 0]), bot = lerp([120, 150, 190], [6, 9, 15]);
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, `rgb(${top})`); g.addColorStop(1, `rgb(${bot})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const sa = Math.max(0, Math.min(1, (alt - 30000) / 60000)); ctx.fillStyle = `rgba(255,255,255,${sa})`;
    if (sa > 0) this.stars.forEach(s => ctx.fillRect(s[0] * W, s[1] * H, s[2], s[2]));
    // clouds scroll with altitude
    if (alt < 14000) { ctx.fillStyle = 'rgba(255,255,255,0.12)'; this.clouds.forEach(c => { const y = H * 0.5 + (c[1] - alt) * 0.06; if (y > -40 && y < H) { ctx.beginPath(); ctx.ellipse(c[0] * W, y, c[2], c[2] * 0.22, 0, 0, 7); ctx.fill(); } }); }
    // curved Earth
    const gy = H * 0.5 + 78 + 14 * Math.log(1 + alt / 150), Rpx = Math.max(300, 3000 / (1 + alt / 20000));
    const eg = ctx.createRadialGradient(W / 2, gy + Rpx, Rpx * 0.9, W / 2, gy + Rpx, Rpx + 14); eg.addColorStop(0, 'rgba(120,190,255,0.9)'); eg.addColorStop(1, 'rgba(120,190,255,0)');
    ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(W / 2, gy + Rpx, Rpx + 14, 0, 7); ctx.fill();
    ctx.fillStyle = alt < 2000 ? '#161b22' : '#0d1a2b'; ctx.beginPath(); ctx.arc(W / 2, gy + Rpx, Rpx, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(160,200,255,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
    if (alt < 600) { ctx.fillStyle = '#6b7280'; ctx.fillRect(W / 2 - 150, gy - 120, 14, 120); ctx.fillRect(W / 2 - 160, gy - 2, 80, 6); }
    // rocket
    ctx.save(); ctx.translate(W / 2, H * 0.5); ctx.rotate(Math.PI / 2 - f.eps * (f.si === 0 && f.alt < 100 ? 0 : 1) * (f.alt < 500 ? 0 : 1) - (f.alt < 500 ? Math.PI / 2 : 0));
    this.drawRocket(ctx, f, d.vehicle);
    ctx.restore();
    // separated stage
    d.events.filter(e => (e.key === 'sep' || e.key === 'boostersep') && this.t > e.t).slice(-1).forEach(e => { const dt = this.t - e.t; if (dt < 20) { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - dt / 20); ctx.translate(W / 2 - dt * 6, H * 0.5 + 70 + dt * dt * 3); ctx.rotate(0.2 * dt); ctx.fillStyle = '#cbd5e1'; ctx.fillRect(-8, -40, 16, 80); ctx.restore(); } });
    this.drawHUD(ctx, W, H, f, d); this.drawChart(); this.drawTrajectory();
    const ei = this.eventIndexAt(this.t);
    if (ei !== this.lastEv) { this.lastEv = ei; if (ei >= 0 && this.cb.onEvent) this.cb.onEvent(d.events[ei]); }
  }
  drawChart() {
    const c = this.chart; if (!c || !this.data) return;
    const rect = c.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    const x = c.getContext('2d'), W = rect.width, H = rect.height, fr = this.data.frames, T = this.dur();
    x.setTransform(c.width / W, 0, 0, c.height / H, 0, 0);
    x.fillStyle = '#0e1013'; x.fillRect(0, 0, W, H);
    const S = [['ALTITUDE km', p => p.alt / 1000, '#4aa3ff'], ['SPEED km/s', p => Math.hypot(p.vr, p.vt) / 1000, '#3ecf8e'], ['G-FORCE', p => p.g, '#e5a93c']], pw = (W - 40) / 3;
    S.forEach((s, i) => {
      const x0 = 20 + i * pw + 8, w = pw - 16; let mx = 0; for (let k = 0; k < fr.length; k += 5) mx = Math.max(mx, s[1](fr[k])); mx = mx || 1;
      x.fillStyle = '#7c828c'; x.font = '10px Inter, sans-serif'; x.fillText(s[0] + '  (max ' + mx.toFixed(1) + ')', x0, 16);
      for (let pass = 0; pass < 2; pass++) { x.strokeStyle = pass ? s[2] : 'rgba(255,255,255,0.15)'; x.lineWidth = pass ? 1.8 : 1; x.beginPath(); let st = false;
        for (let k = 0; k < fr.length; k += 5) { if (pass && fr[k].t > this.t) break; const X = x0 + fr[k].t / T * w, Y = H - 12 - s[1](fr[k]) / mx * (H - 38); st ? x.lineTo(X, Y) : x.moveTo(X, Y); st = true; } x.stroke(); }
      x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(x0 + this.t / T * w, 22, 1, H - 34);
    });
  }
  drawTrajectory() {
    const c = this.trajectoryChart;
    if (!c || !this.data) return;
    const rect = c.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ctx = c.getContext('2d'), W = rect.width, H = rect.height;
    ctx.setTransform(c.width / W, 0, 0, c.height / H, 0, 0);
    ctx.fillStyle = '#0b1018'; ctx.fillRect(0, 0, W, H);
    const pad = { left: 58, right: 18, top: 18, bottom: 30 };
    const pw = Math.max(1, W - pad.left - pad.right), ph = Math.max(1, H - pad.top - pad.bottom);
    const frames = this.data.frames, maxDown = Math.max(1, ...frames.map(f => f.down / 1000));
    const maxAlt = Math.max(1, ...frames.map(f => f.alt / 1000));
    const xAt = f => pad.left + f.down / 1000 / maxDown * pw;
    const yAt = f => pad.top + ph - f.alt / 1000 / maxAlt * ph;

    ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + ph * i / 4, value = maxAlt * (1 - i / 4);
      ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
      ctx.fillStyle = '#8995a5'; ctx.fillText(value.toFixed(0), pad.left - 8, y);
    }
    for (let i = 0; i <= 4; i++) {
      const x = pad.left + pw * i / 4, value = maxDown * i / 4;
      ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + ph); ctx.stroke();
      ctx.fillStyle = '#8995a5'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(value.toFixed(0), x, pad.top + ph + 5);
    }
    ctx.fillStyle = '#aeb9c8'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('ALTITUDE km', 8, 4);
    ctx.textAlign = 'right'; ctx.fillText('DOWNRANGE km', W - 8, H - 13);

    ctx.beginPath();
    frames.forEach((frame, i) => i ? ctx.lineTo(xAt(frame), yAt(frame)) : ctx.moveTo(xAt(frame), yAt(frame)));
    ctx.strokeStyle = '#354357'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath();
    let started = false;
    frames.forEach(frame => {
      if (frame.t > this.t) return;
      if (!started) { ctx.moveTo(xAt(frame), yAt(frame)); started = true; }
      else ctx.lineTo(xAt(frame), yAt(frame));
    });
    const current = this.frameAt(this.t);
    if (started) ctx.lineTo(xAt(current), yAt(current));
    ctx.strokeStyle = '#64b5ff'; ctx.lineWidth = 2.5; ctx.stroke();

    this.data.events.filter(e => e.key === 'sep' || e.key === 'boostersep').forEach(event => {
      if (event.t > this.dur()) return;
      const frame = this.frameAt(event.t), x = xAt(frame);
      ctx.strokeStyle = 'rgba(229,169,60,.75)'; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + ph); ctx.stroke(); ctx.setLineDash([]);
    });
    ctx.beginPath(); ctx.arc(xAt(current), yAt(current), 4, 0, Math.PI * 2);
    ctx.fillStyle = '#f2f6fc'; ctx.fill(); ctx.strokeStyle = '#64b5ff'; ctx.lineWidth = 2; ctx.stroke();
  }
  drawRocket(ctx, f, veh) {
    const h = 150, w = Math.max(12, Math.min(40, veh.diamM / veh.lenM * h * 1.6)), upper = f.si >= 1;
    const top = -h / 2, bodyH = upper ? h * 0.42 : h * 0.84;
    // plume (behind, drawn below body)
    if (f.burning) {
      const base = top + (upper ? h * 0.65 : h) , len = (30 + 70 * Math.min(1, f.T / 8e6 + 0.15)) * (1 + (1 - f.pr) * 1.2), wd = w * (0.5 + (1 - f.pr) * 1.6);
      const y0 = upper ? top + bodyH + h * 0.16 : top + h;
      const pg = ctx.createLinearGradient(0, y0, 0, y0 + len); pg.addColorStop(0, 'rgba(255,255,230,0.95)'); pg.addColorStop(0.35, 'rgba(255,170,60,0.8)'); pg.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.moveTo(-wd / 2, y0); ctx.lineTo(wd / 2, y0); ctx.lineTo((Math.random() - 0.5) * 6, y0 + len * (0.85 + Math.random() * 0.3)); ctx.fill();
    }
    if (f.boostOn) { ctx.fillStyle = '#f1f5f9'; [-1, 1].forEach(s => ctx.fillRect(s * (w / 2 + 5) - 5, top + h * 0.2, 10, h * 0.8)); }
    ctx.fillStyle = f.si === 0 ? '#f4f4f5' : '#d4d4d8'; ctx.fillRect(-w / 2, top + h * 0.16, w, bodyH);
    ctx.fillStyle = f.fairingOn ? '#ffffff' : '#71717a'; ctx.beginPath(); ctx.moveTo(-w / 2, top + h * 0.16); ctx.quadraticCurveTo(0, top - 12, w / 2, top + h * 0.16); ctx.fill();
  }
  drawHUD(ctx, W, H, f, d) {
    const m = Math.floor(f.t / 60), sec = Math.floor(f.t % 60), sp = Math.hypot(f.vr, f.vt);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, H - 64, W, 64);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, H - 64, W, 1);
    const cols = [['T+', 'T+ ' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0')], ['ALTITUDE', (f.alt / 1000).toFixed(1) + ' km'],
      ['SPEED', Math.round(sp * 3.6).toLocaleString() + ' km/h'], ['DOWNRANGE', (f.down / 1000).toFixed(0) + ' km'], ['DYNAMIC PRESSURE', (f.q / 1000).toFixed(1) + ' kPa'], ['STAGE', String(f.si + 1)]];
    const cw = W / cols.length;
    cols.forEach((c, i) => {
      ctx.textAlign = 'left'; ctx.fillStyle = '#7c828c'; ctx.font = '500 10px Inter, sans-serif'; ctx.fillText(c[0] === 'T+' ? 'MISSION TIME' : c[0], 20 + i * cw, H - 40);
      ctx.fillStyle = '#f2f2f3'; ctx.font = '500 18px "JetBrains Mono", Consolas, monospace'; ctx.fillText(c[1], 20 + i * cw, H - 16);
    });
    const e = d.events[this.eventIndexAt(this.t)];
    if (e && this.t - e.t < 6) { ctx.fillStyle = '#f2f2f3'; ctx.font = '500 13px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(e.text.toUpperCase(), W / 2, 34); ctx.textAlign = 'left'; }
    const cx = W - 60, cy = 60, er = 30; ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, er, 0, 7); ctx.stroke();
    ctx.strokeStyle = '#4aa3ff'; ctx.lineWidth = 1.5; ctx.beginPath();
    d.frames.forEach((p, i) => { if (p.t > this.t) return; const a = -Math.PI / 2 + p.down / 6378137, rr = er + p.alt / 1000 * 0.12; const X = cx + Math.cos(a) * rr, Y = cy + Math.sin(a) * rr; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.stroke();
  }
}
if (typeof window !== 'undefined') { window.LaunchPlayer = LaunchPlayer; window.simulateAscent = simulateAscent; window.LAUNCH_NASA = LAUNCH_NASA; }
if (typeof module !== 'undefined') { module.exports = { simulateAscent, LAUNCH_NASA, stdAtmosphere }; }
