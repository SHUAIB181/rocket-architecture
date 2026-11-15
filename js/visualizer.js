/**
 * MISSION ARCHITECT - PROCEDURAL GRAPHICS & ORBITAL VISUALIZER
 * High-performance Canvas 2D engine rendering:
 * 1. Spacecraft Engineering Blueprint Schematics
 * 2. Planetary Orbital Systems with Day/Night Terminator, Atmosphere,
 *    Sensor Footprints, Thruster Exhaust Plumes, and DSN Comms Beams.
 */

class MissionVisualizer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.width = canvasElement.width;
    this.height = canvasElement.height;

    // Starfield for deep space
    this.stars = this.generateStarfield(140);
    this.rotationAngle = 0;
    this.thrusterPulse = 0;
    this.scanSweep = 0;

    // Handle canvas resizing
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  generateStarfield(count) {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 1.8 + 0.4,
        alpha: Math.random() * 0.8 + 0.2,
        twinkleSpeed: Math.random() * 0.03 + 0.01
      });
    }
    return stars;
  }

  /**
   * Renders the real-time Planetary Orbit & Flight Mission Simulation
   */
  renderFlightSimulation(simSnapshot, dest) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Clear background
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, w, h);

    // 1. Draw Starfield
    this.drawStars(ctx, w, h);

    const centerX = w * 0.48;
    const centerY = h * 0.52;
    const planetRadius = Math.min(w, h) * 0.22;

    // 2. Draw Planetary Body
    this.drawPlanet(ctx, centerX, centerY, planetRadius, dest, simSnapshot.isInEclipse);

    // 3. Draw Orbit Track Line
    const orbitRadiusX = planetRadius * 1.85;
    const orbitRadiusY = planetRadius * 1.35;
    this.drawOrbitEllipse(ctx, centerX, centerY, orbitRadiusX, orbitRadiusY);

    // 4. Calculate Spacecraft Position along Orbit
    const trueAnomaly = simSnapshot.orbitTrueAnomalyRad || 0;
    const scX = centerX + Math.cos(trueAnomaly) * orbitRadiusX;
    const scY = centerY + Math.sin(trueAnomaly) * orbitRadiusY;

    // 5. Draw Sensor Scan Cone on Planet Surface (when active)
    this.drawSensorScanFootprint(ctx, scX, scY, centerX, centerY, planetRadius, simSnapshot);

    // 6. Draw DSN Telecommunications Downlink Beam (when transmitting)
    if (simSnapshot.isTransmittingDSN) {
      this.drawDSNBeam(ctx, scX, scY, w, h);
    }

    // 7. Draw Spacecraft Model & Solar Wings
    this.drawSpacecraftInOrbit(ctx, scX, scY, trueAnomaly, simSnapshot);

    // 8. Draw Real Science Target Markers on Planetary Rim
    this.drawScienceTargetMarkers(ctx, centerX, centerY, planetRadius, dest, simSnapshot);

    this.rotationAngle += 0.002;
    this.scanSweep += 0.05;
  }

  drawStars(ctx, w, h) {
    ctx.save();
    this.stars.forEach(s => {
      s.alpha += Math.sin(this.rotationAngle * 20 * s.twinkleSpeed) * 0.02;
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.15, Math.min(0.9, s.alpha))})`;
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  drawPlanet(ctx, cx, cy, r, dest, inEclipse) {
    ctx.save();

    // Atmospheric Glow Ring
    const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.95, cx, cy, r * 1.25);
    if (dest.id === 'earth') {
      glowGrad.addColorStop(0, 'rgba(64, 160, 255, 0.45)');
      glowGrad.addColorStop(1, 'rgba(64, 160, 255, 0)');
    } else if (dest.id === 'mars') {
      glowGrad.addColorStop(0, 'rgba(235, 120, 60, 0.35)');
      glowGrad.addColorStop(1, 'rgba(235, 120, 60, 0)');
    } else if (dest.id === 'europa') {
      glowGrad.addColorStop(0, 'rgba(160, 210, 255, 0.3)');
      glowGrad.addColorStop(1, 'rgba(160, 210, 255, 0)');
    } else {
      glowGrad.addColorStop(0, 'rgba(200, 210, 230, 0.2)');
      glowGrad.addColorStop(1, 'rgba(200, 210, 230, 0)');
    }

    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.25, 0, Math.PI * 2);
    ctx.fill();

    // Planet Base Disk
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip(); // Clip planet surface features inside disk

    // Distinct procedural planet terrain rendering
    if (dest.id === 'earth') {
      this.drawEarthSurface(ctx, cx, cy, r);
    } else if (dest.id === 'moon') {
      this.drawMoonSurface(ctx, cx, cy, r);
    } else if (dest.id === 'mars') {
      this.drawMarsSurface(ctx, cx, cy, r);
    } else if (dest.id === 'europa') {
      this.drawEuropaSurface(ctx, cx, cy, r);
    }

    // Day/Night Terminator Shadow
    // Sun light arrives from upper-left (-X, -Y)
    const termGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    termGrad.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
    termGrad.addColorStop(0.48, 'rgba(0, 0, 0, 0.2)');
    termGrad.addColorStop(0.72, 'rgba(2, 5, 12, 0.88)');
    termGrad.addColorStop(1.0, 'rgba(0, 1, 4, 0.98)');

    ctx.fillStyle = termGrad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    ctx.restore();
  }

  drawEarthSurface(ctx, cx, cy, r) {
    // Ocean base
    ctx.fillStyle = '#0d3268';
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // Continents
    ctx.fillStyle = '#2d6a4f';
    const rot = this.rotationAngle;
    for (let i = -1; i <= 2; i++) {
      const offsetX = cx + ((i + (rot % 1)) * r * 1.2) - (r * 0.6);
      ctx.beginPath();
      ctx.ellipse(offsetX, cy - r * 0.15, r * 0.45, r * 0.35, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Desert/arid Sahara zone
      ctx.fillStyle = '#8f7e4f';
      ctx.beginPath();
      ctx.ellipse(offsetX + r * 0.1, cy - r * 0.25, r * 0.22, r * 0.14, 0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#2d6a4f';
    }

    // Swirling atmospheric clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
    for (let c = 0; c < 5; c++) {
      const cloudX = cx + Math.sin(rot * 2 + c) * r * 0.7;
      const cloudY = cy + (c - 2) * r * 0.35;
      ctx.beginPath();
      ctx.arc(cloudX, cloudY, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawMoonSurface(ctx, cx, cy, r) {
    // Gray highland crust
    ctx.fillStyle = '#8a939f';
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // Dark Basalt Maria (Sea of Tranquility, Oceanus Procellarum)
    ctx.fillStyle = '#545b66';
    const rot = this.rotationAngle * 0.4;
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.25, cy - r * 0.15, r * 0.35, r * 0.28, 0.2, 0, Math.PI * 2);
    ctx.ellipse(cx + r * 0.2, cy + r * 0.1, r * 0.3, r * 0.22, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Impact Craters with bright ejecta rays
    ctx.fillStyle = 'rgba(230, 235, 245, 0.6)';
    ctx.beginPath();
    ctx.arc(cx + r * 0.15, cy - r * 0.4, 7, 0, Math.PI * 2);
    ctx.arc(cx - r * 0.35, cy + r * 0.3, 10, 0, Math.PI * 2);
    ctx.arc(cx, cy + r * 0.75, 12, 0, Math.PI * 2); // South Pole Shackleton zone!
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  drawMarsSurface(ctx, cx, cy, r) {
    // Rusty ochre iron oxide surface
    ctx.fillStyle = '#c1440e';
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // Dark volcanic basaltic regions (Syrtis Major, Acidalia Planitia)
    ctx.fillStyle = '#632512';
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.1, cy + r * 0.1, r * 0.45, r * 0.25, -0.2, 0, Math.PI * 2);
    ctx.ellipse(cx + r * 0.3, cy - r * 0.2, r * 0.25, r * 0.3, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Valles Marineris canyon canyon rift
    ctx.strokeStyle = '#381208';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.45, cy);
    ctx.bezierCurveTo(cx - r * 0.1, cy + 12, cx + r * 0.2, cy - 8, cx + r * 0.45, cy + 5);
    ctx.stroke();

    // North & South Polar Dry-Ice Caps (CO2 + H2O)
    ctx.fillStyle = '#f5f7fa';
    ctx.beginPath();
    ctx.ellipse(cx, cy - r * 0.9, r * 0.35, r * 0.12, 0, 0, Math.PI * 2);
    ctx.ellipse(cx, cy + r * 0.92, r * 0.28, r * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawEuropaSurface(ctx, cx, cy, r) {
    // Brilliant white ice shell
    ctx.fillStyle = '#e8eff7';
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // Reddish-brown fracture cycloids & chaos terrain (salts and hydrates)
    ctx.strokeStyle = '#944835';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const startAngle = i * 0.9;
      ctx.moveTo(cx + Math.cos(startAngle) * r * 0.7, cy + Math.sin(startAngle) * r * 0.7);
      ctx.quadraticCurveTo(cx, cy, cx + Math.cos(startAngle + 1.2) * r * 0.8, cy + Math.sin(startAngle + 1.2) * r * 0.8);
    }
    ctx.stroke();

    // Active cryovolcanic water plumes over south polar fractures
    ctx.fillStyle = 'rgba(180, 225, 255, 0.45)';
    ctx.beginPath();
    ctx.arc(cx - r * 0.1, cy + r * 0.88, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  drawOrbitEllipse(ctx, cx, cy, rx, ry) {
    ctx.save();
    ctx.strokeStyle = 'rgba(74, 158, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawSensorScanFootprint(ctx, scX, scY, planetX, planetY, planetR, sim) {
    const activeInstKeys = Object.keys(sim.activeInstruments || {}).filter(k => sim.activeInstruments[k]);
    if (activeInstKeys.length === 0 || sim.safeModeActive) return;

    ctx.save();

    // Vector towards planet center
    const dx = planetX - scX;
    const dy = planetY - scY;
    const angle = Math.atan2(dy, dx);

    // Projected scan beam
    const beamLength = Math.hypot(dx, dy) - (planetR * 0.88);
    const coneSpread = 0.28;

    const grad = ctx.createRadialGradient(scX, scY, 10, scX + Math.cos(angle) * beamLength, scY + Math.sin(angle) * beamLength, beamLength * 0.5);
    grad.addColorStop(0, 'rgba(0, 255, 200, 0.55)');
    grad.addColorStop(0.7, 'rgba(0, 200, 255, 0.15)');
    grad.addColorStop(1, 'rgba(0, 255, 200, 0.0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(scX, scY);
    ctx.arc(scX, scY, beamLength, angle - coneSpread, angle + coneSpread);
    ctx.closePath();
    ctx.fill();

    // Target ground scan ring
    const groundX = scX + Math.cos(angle) * beamLength;
    const groundY = scY + Math.sin(angle) * beamLength;
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(groundX, groundY, 16, 7, angle, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  drawDSNBeam(ctx, scX, scY, w, h) {
    ctx.save();
    // Beam towards Earth (represented by ground station in upper right quadrant)
    const earthStationX = w * 0.92;
    const earthStationY = h * 0.12;

    const beamGrad = ctx.createLinearGradient(scX, scY, earthStationX, earthStationY);
    beamGrad.addColorStop(0, 'rgba(0, 255, 120, 0.9)');
    beamGrad.addColorStop(0.5, 'rgba(70, 220, 255, 0.4)');
    beamGrad.addColorStop(1, 'rgba(0, 255, 120, 0.9)');

    ctx.strokeStyle = beamGrad;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.lineDashOffset = -this.scanSweep * 10;
    ctx.beginPath();
    ctx.moveTo(scX, scY);
    ctx.lineTo(earthStationX, earthStationY);
    ctx.stroke();

    // Ground station icon & pulse
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(earthStationX, earthStationY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 255, 136, 0.5)';
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(earthStationX, earthStationY, 10 + Math.sin(this.scanSweep * 2) * 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = '#00ff88';
    ctx.fillText('DSN LINK', earthStationX - 60, earthStationY - 12);

    ctx.restore();
  }

  drawSpacecraftInOrbit(ctx, scX, scY, trueAnomaly, sim) {
    ctx.save();
    ctx.translate(scX, scY);

    // Tangent angle along orbit
    const scAngle = trueAnomaly + Math.PI / 2;
    ctx.rotate(scAngle);

    // Solar array wings (left & right)
    ctx.fillStyle = '#1e40af';
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 1;

    // Left array
    ctx.fillRect(-28, -5, 18, 10);
    ctx.strokeRect(-28, -5, 18, 10);
    // Array grid lines
    ctx.beginPath();
    ctx.moveTo(-19, -5); ctx.lineTo(-19, 5);
    ctx.stroke();

    // Right array
    ctx.fillRect(10, -5, 18, 10);
    ctx.strokeRect(10, -5, 18, 10);
    ctx.beginPath();
    ctx.moveTo(19, -5); ctx.lineTo(19, 5);
    ctx.stroke();

    // Spacecraft Bus Body
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-8, -9, 16, 18);
    ctx.strokeRect(-8, -9, 16, 18);

    // High Gain Antenna Dish
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(0, -11, 7, Math.PI, 0, false);
    ctx.stroke();

    // Instrument Boom / Focal Plane
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(0, 11, 3, 0, Math.PI * 2);
    ctx.fill();

    // Thruster firing plume if maneuver or RCS pulse
    if (sim.currentEvent && sim.currentEvent.type === 'MANEUVER') {
      ctx.fillStyle = 'rgba(255, 160, 40, 0.85)';
      ctx.beginPath();
      ctx.moveTo(-4, 9);
      ctx.lineTo(0, 20 + Math.random() * 8);
      ctx.lineTo(4, 9);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  drawScienceTargetMarkers(ctx, cx, cy, r, dest, sim) {
    const targets = dest.scienceTargets || [];
    ctx.save();
    targets.forEach((target, idx) => {
      const angle = (idx * (Math.PI * 2 / targets.length)) + 0.4;
      const markerX = cx + Math.cos(angle) * (r * 0.95);
      const markerY = cy + Math.sin(angle) * (r * 0.95);

      const progress = (sim.scannedTargets && sim.scannedTargets[target.id]) || 0;
      const isComplete = progress >= 100;

      // Marker beacon
      ctx.fillStyle = isComplete ? '#10b981' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(markerX, markerY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Pulsing target circle
      ctx.strokeStyle = isComplete ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(markerX, markerY, 8 + Math.sin(this.scanSweep * 3 + idx) * 3, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.restore();
  }

  /**
   * Renders the interactive Spacecraft Blueprint in the Engineering Bay
   */
  renderSpacecraftBlueprint(designReport) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Blueprint blueprint dark blue grid background
    ctx.fillStyle = '#0a1428';
    ctx.fillRect(0, 0, w, h);

    // Tech grid lines
    ctx.strokeStyle = 'rgba(30, 70, 130, 0.35)';
    ctx.lineWidth = 1;
    const gridSize = 30;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    const cx = w * 0.5;
    const cy = h * 0.5;

    // Blueprint Title
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('SYSTEMS ENGINEERING BLUEPRINT - SCALE 1:20', 20, 30);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px "Courier New", monospace';
    ctx.fillText(`BUS CLASS: ${designReport.bus.name.toUpperCase()}`, 20, 50);
    ctx.fillText(`DRY MASS: ${designReport.mass.dryMassKg} KG  |  WET MASS: ${designReport.mass.wetMassKg} KG`, 20, 68);

    ctx.save();
    ctx.translate(cx, cy);

    // 1. Draw Solar Arrays or MMRTG
    const powerSub = designReport.subsystems.power;
    if (powerSub.type === 'solar') {
      const isUltraFlex = powerSub.id === 'gaas_ultraflex';
      if (isUltraFlex) {
        // Circular Ultraflex Arrays
        ctx.fillStyle = '#1d4ed8';
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
        // Left Wing
        ctx.beginPath();
        ctx.arc(-110, 0, 48, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Right Wing
        ctx.beginPath();
        ctx.arc(110, 0, 48, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // Rectangular silicon arrays
        ctx.fillStyle = '#1e3a8a';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        // Left Panel
        ctx.fillRect(-150, -35, 90, 70);
        ctx.strokeRect(-150, -35, 90, 70);
        // Right Panel
        ctx.fillRect(60, -35, 90, 70);
        ctx.strokeRect(60, -35, 90, 70);
      }
    } else {
      // MMRTG Nuclear Power unit (radiating graphite fins)
      ctx.fillStyle = '#dc2626';
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 2;
      ctx.fillRect(-85, -20, 30, 40);
      ctx.strokeRect(-85, -20, 30, 40);
      ctx.font = '9px "Courier New", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('RTG', -80, 5);
    }

    // 2. Spacecraft Main Chassis Bus
    let busW = 90;
    let busH = 110;
    if (designReport.bus.id === 'smallsat') {
      busW = 60; busH = 75;
    } else if (designReport.bus.id === 'flagship_heavy') {
      busW = 120; busH = 145;
    }

    // Bus Outer Frame
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.fillRect(-busW / 2, -busH / 2, busW, busH);
    ctx.strokeRect(-busW / 2, -busH / 2, busW, busH);

    // Inner Propellant Tank Representation
    ctx.fillStyle = 'rgba(234, 88, 12, 0.4)';
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 10, busW * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 3. Propulsion Main Nozzle
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16, busH / 2);
    ctx.lineTo(-24, (busH / 2) + 25);
    ctx.lineTo(24, (busH / 2) + 25);
    ctx.lineTo(16, busH / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4. High-Gain Antenna Dish
    const telecom = designReport.subsystems.telecom;
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    if (telecom.id === 'high_gain_parabolic') {
      ctx.beginPath();
      ctx.arc(0, -busH / 2 - 20, 36, Math.PI, 0, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -busH / 2);
      ctx.lineTo(0, -busH / 2 - 20);
      ctx.stroke();
    } else if (telecom.id === 'optical_laser_dsoc') {
      // Laser optical telescope tube
      ctx.fillRect(-10, -busH / 2 - 30, 20, 30);
      ctx.strokeRect(-10, -busH / 2 - 30, 20, 30);
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(0, -busH / 2 - 30, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Scientific Instruments Callout Booms
    const insts = designReport.instruments || [];
    insts.forEach((inst, idx) => {
      const yOffset = -busH / 3 + (idx * 22);
      ctx.fillStyle = '#10b981';
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.5;

      // Small instrument pod on bus side
      ctx.fillRect(busW / 2, yOffset, 12, 14);
      ctx.strokeRect(busW / 2, yOffset, 12, 14);

      // Callout line & label
      ctx.beginPath();
      ctx.moveTo(busW / 2 + 12, yOffset + 7);
      ctx.lineTo(busW / 2 + 45, yOffset + 7);
      ctx.stroke();

      ctx.font = '10px "Courier New", monospace';
      ctx.fillStyle = '#34d399';
      ctx.fillText(inst.name.split(' ')[0].toUpperCase(), busW / 2 + 50, yOffset + 11);
    });

    ctx.restore();
  }
}

// Export to window
if (typeof window !== 'undefined') {
  window.MissionVisualizer = MissionVisualizer;
}
