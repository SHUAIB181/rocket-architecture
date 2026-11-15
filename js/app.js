/**
 * MISSION ARCHITECT - APPLICATION CONTROLLER
 * Coordinates UI views, user interactions, engineering validation,
 * audio effects, simulation loop, data lab, and post-mission debriefing.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize core modules
  const missionData = window.MISSION_DATA;
  const audio = new window.AudioSynthesizer();
  const systemsEngine = new window.SystemsEngineeringEngine(missionData);
  const simulator = new window.MissionSimulator(systemsEngine, audio);

  // Active user design configuration
  const currentDesign = {
    destinationId: 'mars',
    missionClassId: 'discovery',
    busId: 'discovery_medium',
    powerId: 'gaas_ultraflex',
    batteryId: 'li_ion_medium',
    propulsionId: 'biprop_mmh_nto',
    propellantMassKg: 420,
    thermalId: 'active_heaters_louvers',
    shieldingId: 'enhanced_vault',
    telecomId: 'high_gain_parabolic',
    avionicsId: 'dual_redundant_rad750',
    selectedInstrumentIds: ['high_res_camera', 'multispectral_imager', 'radar_sounder'],
    launchVehicleId: 'falcon_9'
  };
  try { // load a shared design, accepting only known ids and sane numbers
    const m = location.hash.match(/#d=([^&]+)/);
    if (m) {
      const o = JSON.parse(atob(m[1])), S = missionData.subsystems, pool = { busId: S.bus, powerId: S.power, batteryId: S.batteries, propulsionId: S.propulsion, thermalId: S.thermal, shieldingId: S.shielding, telecomId: S.telecom, avionicsId: S.avionics, launchVehicleId: missionData.launchVehicles, destinationId: missionData.destinations, missionClassId: missionData.missionClasses };
      Object.keys(pool).forEach(k => { if (typeof o[k] === 'string' && pool[k] && pool[k][o[k]]) currentDesign[k] = o[k]; });
      if (typeof o.propellantMassKg === 'number') currentDesign.propellantMassKg = Math.max(20, Math.min(2200, Math.round(o.propellantMassKg)));
      if (Array.isArray(o.selectedInstrumentIds)) currentDesign.selectedInstrumentIds = o.selectedInstrumentIds.filter(i => missionData.instruments[i]);
    }
  } catch (e) { console.warn('Ignored invalid shared design link'); }

  // Cached design report
  let latestReport = systemsEngine.evaluateMissionArchitecture(currentDesign);

  // DOM Elements
  const navTabs = document.querySelectorAll('.nav-tab');
  const viewSections = document.querySelectorAll('.view-section');
  const muteBtn = document.getElementById('mute-btn');
  const presetBtns = document.querySelectorAll('.preset-btn');

  // Blueprint canvas & Flight simulation canvas
  const blueprintCanvas = document.getElementById('blueprint-canvas');
  const flightCanvas = document.getElementById('flight-canvas');

  let blueprintVisualizer = null;
  let flightVisualizer = null;

  if (blueprintCanvas) {
    blueprintVisualizer = new window.MissionVisualizer(blueprintCanvas);
  }
  if (flightCanvas) {
    flightVisualizer = new window.MissionVisualizer(flightCanvas);
  }

  // --- AUDIO USER UNLOCK ---
  document.body.addEventListener('click', () => {
    audio.initContext();
  }, { once: true });

  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      const isMuted = audio.toggleMute();
      muteBtn.textContent = isMuted ? '🔇 Audio: OFF' : '🔊 Audio: ON';
      muteBtn.classList.toggle('muted', isMuted);
    });
  }

  // --- NAVIGATION TAB SWITCHER ---
  const workflowNames = {
    briefing: 'MISSION BRIEFING',
    engineering: 'SPACECRAFT ENGINEERING BAY',
    launch: 'LAUNCH SEQUENCE',
    simulation: 'FLIGHT SIMULATION & OPS',
    datalab: 'DATA LAB',
    debrief: 'MISSION DEBRIEF'
  };
  function updateWorkflowProgress(tabId) {
    const activeIndex = Array.from(navTabs).findIndex(tab => tab.dataset.tab === tabId);
    if (activeIndex < 0) return;

    const phaseNumber = String(activeIndex + 1).padStart(2, '0');
    const progressFill = document.getElementById('mission-progress-fill');
    const progressTrack = document.querySelector('.mission-progress-track');
    const phaseLabel = document.getElementById('mission-phase-label');
    const phaseCount = document.querySelector('.mission-progress-count');
    const percent = (activeIndex + 1) / navTabs.length * 100;

    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressTrack) progressTrack.setAttribute('aria-valuenow', String(activeIndex + 1));
    if (phaseLabel) phaseLabel.textContent = `PHASE ${phaseNumber} / ${String(navTabs.length).padStart(2, '0')} — ${workflowNames[tabId]}`;
    if (phaseCount) phaseCount.innerHTML = `${phaseNumber} <span>/ ${String(navTabs.length).padStart(2, '0')}</span>`;
  }

  function switchTab(tabId) {
    navTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
    viewSections.forEach(s => s.classList.toggle('active', s.id === `view-${tabId}`));
    updateWorkflowProgress(tabId);

    if (tabId === 'engineering') {
      updateEngineeringView();
    } else if (tabId === 'simulation') {
      if (flightVisualizer) flightVisualizer.resize();
    } else if (tabId === 'datalab') {
      renderDataLab();
    }
  }

  const initialTab = document.querySelector('.nav-tab.active');
  updateWorkflowProgress(initialTab ? initialTab.dataset.tab : 'briefing');

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      audio.playChime();
      switchTab(tab.dataset.tab);
    });
  });

  // Preset Mission Configurations
  const presets = {
    lunar_artemis: {
      destinationId: 'moon',
      missionClassId: 'discovery',
      busId: 'discovery_medium',
      powerId: 'gaas_ultraflex',
      batteryId: 'li_ion_large', // Essential for cold lunar PSRs
      propulsionId: 'biprop_mmh_nto',
      propellantMassKg: 520,
      thermalId: 'cryo_deep_space_rhu',
      shieldingId: 'enhanced_vault',
      telecomId: 'high_gain_parabolic',
      avionicsId: 'dual_redundant_rad750',
      selectedInstrumentIds: ['radar_sounder', 'thermal_spectrometer', 'laser_altimeter'],
      launchVehicleId: 'falcon_9'
    },
    mars_jezero: {
      destinationId: 'mars',
      missionClassId: 'new_frontiers',
      busId: 'discovery_medium',
      powerId: 'gaas_ultraflex',
      batteryId: 'li_ion_medium',
      propulsionId: 'biprop_mmh_nto',
      propellantMassKg: 650,
      thermalId: 'active_heaters_louvers',
      shieldingId: 'enhanced_vault',
      telecomId: 'high_gain_parabolic',
      avionicsId: 'dual_redundant_rad750',
      selectedInstrumentIds: ['high_res_camera', 'multispectral_imager', 'radar_sounder'],
      launchVehicleId: 'falcon_heavy'
    },
    earth_sentinel: {
      destinationId: 'earth',
      missionClassId: 'discovery',
      busId: 'discovery_medium',
      powerId: 'silicon_pv',
      batteryId: 'li_ion_small',
      propulsionId: 'monoprop_hydrazine',
      propellantMassKg: 120,
      thermalId: 'passive_mli',
      shieldingId: 'standard_aluminum',
      telecomId: 'high_gain_parabolic',
      avionicsId: 'commercial_rad_tolerant',
      selectedInstrumentIds: ['atmosphere_sounder', 'multispectral_imager', 'laser_altimeter'],
      launchVehicleId: 'falcon_9'
    },
    europa_clipper: {
      destinationId: 'europa',
      missionClassId: 'flagship',
      busId: 'flagship_heavy',
      powerId: 'mmrtg_nuclear', // Nuclear is king at 5.2 AU!
      batteryId: 'li_ion_large',
      propulsionId: 'biprop_mmh_nto',
      propellantMassKg: 1200,
      thermalId: 'cryo_deep_space_rhu',
      shieldingId: 'tantalum_heavy_vault', // Essential for Jovian radiation!
      telecomId: 'high_gain_parabolic',
      avionicsId: 'autonomous_tmr_core',
      selectedInstrumentIds: ['radar_sounder', 'magnetometer', 'mass_spectrometer'],
      launchVehicleId: 'falcon_heavy'
    }
  };

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const pKey = btn.dataset.preset;
      if (presets[pKey]) {
        Object.assign(currentDesign, presets[pKey]);
        audio.playChime();
        latestReport = systemsEngine.evaluateMissionArchitecture(currentDesign);
        updateBriefingUI();
        updateEngineeringView();
        switchTab('engineering');
      }
    });
  });

  // --- SCREEN 1: MISSION BRIEFING CONTROLLERS ---
  const destCards = document.querySelectorAll('.dest-card');
  const classCards = document.querySelectorAll('.class-card');
  const proceedToEngBtn = document.getElementById('proceed-to-engineering-btn');

  function updateBriefingUI() {
    destCards.forEach(c => c.classList.toggle('selected', c.dataset.dest === currentDesign.destinationId));
    classCards.forEach(c => c.classList.toggle('selected', c.dataset.class === currentDesign.missionClassId));

    const dest = missionData.destinations[currentDesign.destinationId];
    const mClass = missionData.missionClasses[currentDesign.missionClassId];

    const destTitle = document.getElementById('brief-dest-title');
    const destDesc = document.getElementById('brief-dest-desc');
    const destEnv = document.getElementById('brief-dest-env');
    const destScience = document.getElementById('brief-dest-science');

    if (destTitle) destTitle.textContent = dest.name;
    if (destDesc) destDesc.textContent = dest.description;
    if (destEnv) {
      destEnv.innerHTML = `
        <div class="env-item"><strong>Solar Flux:</strong> ${dest.solarFlux} W/m² (${(dest.solarFlux / 1361 * 100).toFixed(0)}% of Earth)</div>
        <div class="env-item"><strong>Distance from Sun:</strong> ${dest.distanceAU} AU</div>
        <div class="env-item"><strong>Thermal Extremes:</strong> ${dest.thermalMinC}°C to ${dest.thermalMaxC}°C</div>
        <div class="env-item"><strong>Radiation Level:</strong> ${dest.radiationLevel} (~${dest.radiationKradPerYear} krad/yr)</div>
        <div class="env-item"><strong>Light Travel Time:</strong> ${dest.commsDelaySec < 1 ? '< 1 sec' : (dest.commsDelaySec / 60).toFixed(1) + ' min'}</div>
      `;
    }

    if (destScience) {
      destScience.innerHTML = dest.scienceTargets.map(t => {
        const inst = missionData.instruments[t.requiredInstrument];
        return `
          <div class="science-target-pill">
            <span class="st-pts">+${t.points} PTS</span>
            <span class="st-name">${t.name}</span>
            <span class="st-req">(Requires: ${inst ? inst.name : t.requiredInstrument})</span>
          </div>
        `;
      }).join('');
    }
  }

  destCards.forEach(card => {
    card.addEventListener('click', () => {
      currentDesign.destinationId = card.dataset.dest;
      audio.playChime();
      latestReport = systemsEngine.evaluateMissionArchitecture(currentDesign);
      updateBriefingUI();
      updateEngineeringView();
    });
  });

  classCards.forEach(card => {
    card.addEventListener('click', () => {
      currentDesign.missionClassId = card.dataset.class;
      audio.playChime();
      latestReport = systemsEngine.evaluateMissionArchitecture(currentDesign);
      updateBriefingUI();
      updateEngineeringView();
    });
  });

  if (proceedToEngBtn) {
    proceedToEngBtn.addEventListener('click', () => {
      audio.playChime();
      switchTab('engineering');
    });
  }

  // --- SCREEN 2: ENGINEERING BAY CONTROLLERS ---
  const propSlider = document.getElementById('prop-mass-slider');
  const propValLabel = document.getElementById('prop-mass-val');
  const verifyLaunchBtn = document.getElementById('verify-and-launch-btn');

  function setupEngineeringControls() {
    // Subsystem radio groups
    const subsystemTypes = ['bus', 'power', 'battery', 'propulsion', 'thermal', 'shielding', 'telecom', 'avionics', 'launchVehicle'];
    
    subsystemTypes.forEach(type => {
      const inputs = document.querySelectorAll(`input[name="eng-${type}"]`);
      inputs.forEach(input => {
        input.addEventListener('change', () => {
          if (type === 'battery') currentDesign.batteryId = input.value;
          else if (type === 'launchVehicle') currentDesign.launchVehicleId = input.value;
          else currentDesign[`${type}Id`] = input.value;

          audio.playTelemetryPing();
          latestReport = systemsEngine.evaluateMissionArchitecture(currentDesign);
          renderEngineeringLedger(latestReport);
          if (blueprintVisualizer) blueprintVisualizer.renderSpacecraftBlueprint(latestReport);
        });
      });
    });

    // Propellant mass slider
    if (propSlider) {
      propSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        currentDesign.propellantMassKg = val;
        if (propValLabel) propValLabel.textContent = `${val} kg`;
        latestReport = systemsEngine.evaluateMissionArchitecture(currentDesign);
        renderEngineeringLedger(latestReport);
        if (blueprintVisualizer) blueprintVisualizer.renderSpacecraftBlueprint(latestReport);
      });
    }

    // Instrument Checkboxes
    const instBoxes = document.querySelectorAll('input[name="eng-instrument"]');
    instBoxes.forEach(box => {
      box.addEventListener('change', () => {
        const checked = Array.from(document.querySelectorAll('input[name="eng-instrument"]:checked')).map(b => b.value);
        currentDesign.selectedInstrumentIds = checked;
        audio.playTelemetryPing();
        latestReport = systemsEngine.evaluateMissionArchitecture(currentDesign);
        renderEngineeringLedger(latestReport);
        if (blueprintVisualizer) blueprintVisualizer.renderSpacecraftBlueprint(latestReport);
      });
    });
  }

  function updateEngineeringView() {
    // Sync UI radio inputs with currentDesign
    const syncRadio = (name, val) => {
      const el = document.querySelector(`input[name="${name}"][value="${val}"]`);
      if (el) el.checked = true;
    };

    syncRadio('eng-bus', currentDesign.busId);
    syncRadio('eng-power', currentDesign.powerId);
    syncRadio('eng-battery', currentDesign.batteryId);
    syncRadio('eng-propulsion', currentDesign.propulsionId);
    syncRadio('eng-thermal', currentDesign.thermalId);
    syncRadio('eng-shielding', currentDesign.shieldingId);
    syncRadio('eng-telecom', currentDesign.telecomId);
    syncRadio('eng-avionics', currentDesign.avionicsId);
    syncRadio('eng-launchVehicle', currentDesign.launchVehicleId);

    if (propSlider) {
      propSlider.value = currentDesign.propellantMassKg;
      if (propValLabel) propValLabel.textContent = `${currentDesign.propellantMassKg} kg`;
    }

    // Sync instrument checkboxes
    const instBoxes = document.querySelectorAll('input[name="eng-instrument"]');
    instBoxes.forEach(box => {
      box.checked = (currentDesign.selectedInstrumentIds || []).includes(box.value);
    });

    latestReport = systemsEngine.evaluateMissionArchitecture(currentDesign);
    renderEngineeringLedger(latestReport);

    if (blueprintVisualizer) {
      blueprintVisualizer.resize();
      blueprintVisualizer.renderSpacecraftBlueprint(latestReport);
    }
  }

  function renderEngineeringLedger(report) {
    // 1. Mass Ledger
    const dryMassEl = document.getElementById('ledger-dry-mass');
    const wetMassEl = document.getElementById('ledger-wet-mass');
    const launchLimitEl = document.getElementById('ledger-launch-limit');
    const massMarginEl = document.getElementById('ledger-mass-margin');

    if (dryMassEl) dryMassEl.textContent = `${report.mass.dryMassKg} kg`;
    if (wetMassEl) wetMassEl.textContent = `${report.mass.wetMassKg} kg`;
    if (launchLimitEl) launchLimitEl.textContent = `${report.mass.launchMassLimitKg} kg`;
    if (massMarginEl) {
      massMarginEl.textContent = `${report.mass.launchMassMarginKg} kg (${report.mass.launchMassMarginPct}%)`;
      massMarginEl.className = report.mass.launchMassMarginKg >= 0 ? 'metric-ok' : 'metric-bad';
    }

    // 2. Power Ledger
    const powerGenEl = document.getElementById('ledger-power-gen');
    const powerConsEl = document.getElementById('ledger-power-cons');
    const powerMarginEl = document.getElementById('ledger-power-margin');
    const batteryEclipseEl = document.getElementById('ledger-battery-eclipse');

    if (powerGenEl) powerGenEl.textContent = `${report.power.sunlightGenWatts} W (Sun) / ${report.power.eclipseGenWatts} W (Shadow)`;
    if (powerConsEl) powerConsEl.textContent = `${report.power.peakConsumptionWatts} W (Peak)`;
    if (powerMarginEl) {
      powerMarginEl.textContent = `${report.power.sunlightMarginPct}%`;
      powerMarginEl.className = report.power.sunlightMarginPct >= 0 ? 'metric-ok' : 'metric-bad';
    }
    if (batteryEclipseEl) {
      batteryEclipseEl.textContent = report.power.batterySurvivesEclipse 
        ? `Survives (${report.power.batteryDepthOfDischargePct}% DoD)` 
        : `DEPLETED (${report.power.batteryDepthOfDischargePct}% DoD)`;
      batteryEclipseEl.className = report.power.batterySurvivesEclipse ? 'metric-ok' : 'metric-bad';
    }

    // 3. Delta-V Ledger
    const dvAvailEl = document.getElementById('ledger-dv-avail');
    const dvReqEl = document.getElementById('ledger-dv-req');
    const dvMarginEl = document.getElementById('ledger-dv-margin');

    if (dvAvailEl) dvAvailEl.textContent = `${report.deltaV.availableMS} m/s`;
    if (dvReqEl) dvReqEl.textContent = `${report.deltaV.requiredMS} m/s`;
    if (dvMarginEl) {
      dvMarginEl.textContent = `${report.deltaV.marginMS} m/s (${report.deltaV.marginPct}%)`;
      dvMarginEl.className = report.deltaV.marginMS >= 0 ? 'metric-ok' : 'metric-bad';
    }

    // 4. Telecom & Downlink Ledger
    const downlinkRateEl = document.getElementById('ledger-downlink-rate');
    const dailyDataEl = document.getElementById('ledger-daily-data');
    const commsDelayEl = document.getElementById('ledger-comms-delay');

    if (downlinkRateEl) downlinkRateEl.textContent = `${report.telecom.downlinkRateMbps} Mbps`;
    if (dailyDataEl) {
      dailyDataEl.textContent = `${report.telecom.dailyScienceDataGb} GB gen / ${report.telecom.dailyDownlinkCapacityGb} GB down`;
      dailyDataEl.className = !report.telecom.bufferOverflowRisk ? 'metric-ok' : 'metric-warn';
    }
    if (commsDelayEl) {
      commsDelayEl.textContent = report.telecom.commsLatencySec < 1 ? '< 1 sec' : `${(report.telecom.commsLatencySec / 60).toFixed(1)} min`;
    }

    // 5. Thermal & Radiation
    const thermalStatusEl = document.getElementById('ledger-thermal-status');
    const radLifetimeEl = document.getElementById('ledger-rad-lifetime');

    if (thermalStatusEl) {
      thermalStatusEl.textContent = report.thermal.isViable 
        ? `Pass (${report.thermal.spacecraftRangeC[0]}°C to ${report.thermal.spacecraftRangeC[1]}°C)` 
        : `FAIL (${report.thermal.spacecraftRangeC[0]}°C vs Dest ${report.thermal.destRangeC[0]}°C)`;
      thermalStatusEl.className = report.thermal.isViable ? 'metric-ok' : 'metric-bad';
    }
    if (radLifetimeEl) {
      radLifetimeEl.textContent = `${report.radiation.estimatedLifetimeYears} years (Limit: ${report.radiation.vaultLimitKrad} krad)`;
      radLifetimeEl.className = report.radiation.isViable ? 'metric-ok' : 'metric-bad';
    }

    // 6. Cost & Budget Cap
    const totalCostEl = document.getElementById('ledger-total-cost');
    const budgetCapEl = document.getElementById('ledger-budget-cap');
    const costMarginEl = document.getElementById('ledger-cost-margin');

    if (totalCostEl) totalCostEl.textContent = `$${report.cost.totalCostMillions} M`;
    if (budgetCapEl) budgetCapEl.textContent = `$${report.cost.budgetCapMillions} M`;
    if (costMarginEl) {
      costMarginEl.textContent = `$${report.cost.marginMillions} M reserve`;
      costMarginEl.className = report.cost.isCompliant ? 'metric-ok' : 'metric-bad';
    }

    // 7. Science Potential
    const scienceCoverageEl = document.getElementById('ledger-science-coverage');
    if (scienceCoverageEl) {
      scienceCoverageEl.textContent = `${report.science.achievedPoints} / ${report.science.totalPoints} PTS (${report.science.coveragePct}%)`;
      scienceCoverageEl.className = report.science.coveragePct >= 70 ? 'metric-ok' : 'metric-warn';
    }

    // 8. Alerts & Validation Banner
    const alertsContainer = document.getElementById('ledger-alerts-container');
    if (alertsContainer) {
      const allNotices = [...report.alerts, ...report.warnings];
      if (allNotices.length === 0) {
        alertsContainer.innerHTML = `
          <div class="alert-box alert-success">
            <span class="alert-icon">✓</span>
            <div class="alert-body">
              <strong>All Systems Engineering Checks Passed!</strong>
              <p>Spacecraft meets systems engineering design margins for mass, Delta-V, power, thermal, radiation, and budget.</p>
            </div>
          </div>
        `;
      } else {
        alertsContainer.innerHTML = allNotices.map(n => `
          <div class="alert-box ${n.type === 'CRITICAL' ? 'alert-danger' : 'alert-warning'}">
            <span class="alert-icon">${n.type === 'CRITICAL' ? '⚠️' : '⚡'}</span>
            <div class="alert-body">
              <strong>${n.title}</strong>
              <p>${n.msg}</p>
            </div>
          </div>
        `).join('');
      }
    }

    // Arm / Disarm Launch Button
    if (verifyLaunchBtn) {
      verifyLaunchBtn.disabled = !report.isLaunchReady;
      verifyLaunchBtn.title = report.isLaunchReady 
        ? 'All systems nominal. Ready to proceed to Launch Pad!' 
        : 'Resolve critical engineering alerts before launch.';
    }
  }

  // --- SCREEN 3: LAUNCH SEQUENCE CONTROLLERS ---
  const launchCountdownDisplay = document.getElementById('launch-countdown');
  const launchStatusText = document.getElementById('launch-status-text');
  const launchAbortBtn = document.getElementById('launch-abort-btn');
  const enterFlightBtn = document.getElementById('enter-flight-btn');
  let countdownTimerId = null;
  window.__mission = {
    getReport: () => latestReport,
    getDesign: () => currentDesign,
    engine: systemsEngine,
    data: missionData,
    switchTab,
    apply: (d) => {
      Object.assign(currentDesign, d);
      updateBriefingUI();
      updateEngineeringView();
    }
  };
  const launchPlayer = new window.LaunchPlayer(document.getElementById('launch-canvas'), {
    onEvent: (e) => { if (launchStatusText) launchStatusText.textContent = e.text; audio.playChime(); },
    onEnd: (s) => {
      if (launchStatusText) launchStatusText.textContent = s.outcome;
      if (launchAbortBtn) launchAbortBtn.style.display = 'none';
    }
  });

  if (verifyLaunchBtn) {
    verifyLaunchBtn.addEventListener('click', () => {
      audio.playChime();
      switchTab('launch');
      startLaunchCountdown();
    });
  }

  function startLaunchCountdown() {
    let secondsLeft = 10;
    if (launchAbortBtn) launchAbortBtn.style.display = 'inline-block';
    if (enterFlightBtn) enterFlightBtn.style.display = 'none';

    if (countdownTimerId) clearInterval(countdownTimerId);

    const updateCountdown = () => {
      if (launchCountdownDisplay) launchCountdownDisplay.textContent = `T - 00:${secondsLeft < 10 ? '0' : ''}${secondsLeft}`;

      if (secondsLeft === 10) {
        if (launchStatusText) launchStatusText.textContent = 'Auto-sequence initiated. Terminal propellant load nominal.';
        audio.playChime();
      } else if (secondsLeft === 5) {
        if (launchStatusText) launchStatusText.textContent = 'Flight computer switched to internal power. Guidance armed.';
        audio.playChime();
      } else if (secondsLeft === 3) {
        if (launchStatusText) launchStatusText.textContent = 'Main Engine Igniters Armed... 3... 2... 1...';
        audio.playChime();
      } else if (secondsLeft === 0) {
        clearInterval(countdownTimerId);
        executeLiftoffSequence();
      }
      secondsLeft--;
    };

    updateCountdown();
    countdownTimerId = setInterval(updateCountdown, 1000);
  }

  function executeLiftoffSequence() {
    if (launchCountdownDisplay) launchCountdownDisplay.textContent = 'T + 00:00 LIFTOFF';
    if (launchStatusText) launchStatusText.textContent = `LIFTOFF! ${latestReport.launchVehicle.name} clears the tower! Beginning gravity turn!`;
    audio.playLaunchRumble(6.0);

    // Physics-based ascent video (replaces the old fixed-time narration)
    if (enterFlightBtn) enterFlightBtn.style.display = 'inline-block';
    launchPlayer.load(latestReport, true);
  }

  if (launchAbortBtn) {
    launchAbortBtn.addEventListener('click', () => {
      if (countdownTimerId) clearInterval(countdownTimerId);
      if (launchStatusText) launchStatusText.textContent = 'LAUNCH ABORTED BY FLIGHT DIRECTOR. Returning to Engineering Bay.';
      audio.playAlarm();
      setTimeout(() => switchTab('engineering'), 1500);
    });
  }

  if (enterFlightBtn) {
    enterFlightBtn.addEventListener('click', () => {
      audio.playChime();
      launchPlayer.pause();
      simulator.initializeMission(latestReport);
      simulator.setPhase('ASCENT');
      simulator.start();
      switchTab('simulation');
    });
  }

  // --- SCREEN 4: MISSION OPERATIONS FLIGHT SIMULATION ---
  // Telemetry DOM elements
  const hudTime = document.getElementById('hud-mission-time');
  const hudPhase = document.getElementById('hud-phase');
  const hudOrbit = document.getElementById('hud-orbit-count');
  const hudAltitude = document.getElementById('hud-altitude');
  const hudVelocity = document.getElementById('hud-velocity');
  const hudEclipse = document.getElementById('hud-eclipse-badge');
  const hudBatteryPct = document.getElementById('hud-battery-pct');
  const hudBatteryBar = document.getElementById('hud-battery-bar');
  const hudTemp = document.getElementById('hud-temperature');
  const hudSSR = document.getElementById('hud-ssr-used');
  const hudSSRBar = document.getElementById('hud-ssr-bar');
  const hudDose = document.getElementById('hud-dose');
  const hudSciencePts = document.getElementById('hud-science-points');
  const hudDownlinkGb = document.getElementById('hud-downlink-gb');

  // Control buttons
  const timeScaleBtns = document.querySelectorAll('.warp-btn');
  const safeModeBtn = document.getElementById('btn-safe-mode');
  const dsnTransmitterBtn = document.getElementById('btn-dsn-tx');
  const trimBurnBtn = document.getElementById('btn-trim-burn');
  const instTogglesContainer = document.getElementById('inst-toggles-container');

  // Event modal elements
  const eventModal = document.getElementById('event-modal');
  const eventTitle = document.getElementById('event-title');
  const eventDesc = document.getElementById('event-desc');
  const eventOptionsContainer = document.getElementById('event-options-container');

  // Time warp buttons
  timeScaleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const scale = parseFloat(btn.dataset.scale);
      simulator.setTimeScale(scale);
      timeScaleBtns.forEach(b => b.classList.toggle('active', b === btn));
      audio.playTelemetryPing();
    });
  });

  if (safeModeBtn) {
    safeModeBtn.addEventListener('click', () => {
      simulator.toggleSafeMode();
      audio.playChime();
    });
  }

  if (dsnTransmitterBtn) {
    dsnTransmitterBtn.addEventListener('click', () => {
      simulator.toggleDSNTransmitter();
      audio.playTelemetryPing();
    });
  }

  if (trimBurnBtn) {
    trimBurnBtn.addEventListener('click', () => {
      const success = simulator.fireOrbitalTrimBurn(35);
      if (!success) {
        audio.playAlarm();
        alert('Insufficient propellant remaining for orbital trim burn!');
      }
    });
  }

  // Dynamic instrument toggles
  function populateFlightInstrumentControls() {
    if (!instTogglesContainer) return;
    const insts = latestReport.instruments || [];
    instTogglesContainer.innerHTML = insts.map(inst => `
      <div class="inst-toggle-item" id="inst-ctrl-${inst.id}">
        <span class="inst-toggle-name">${inst.name.split(' ')[0]}</span>
        <button class="inst-power-btn active" data-inst="${inst.id}">ON</button>
      </div>
    `).join('');

    const btns = instTogglesContainer.querySelectorAll('.inst-power-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const iId = btn.dataset.inst;
        simulator.toggleInstrument(iId);
        audio.playTelemetryPing();
      });
    });
  }

  // Telemetry updates from simulator
  simulator.onTelemetryUpdate = (snap) => {
    // 1. Mission elapsed time formatting
    const totalSec = snap.elapsedMissionSec;
    const days = Math.floor(totalSec / 86400);
    const hrs = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const timeStr = `T+ ${days}d ${hrs}h ${mins}m ${secs}s`;

    if (hudTime) hudTime.textContent = timeStr;
    if (hudPhase) hudPhase.textContent = snap.phase.replace('_', ' ');
    if (hudOrbit) hudOrbit.textContent = `Orbit #${snap.orbitCount}`;
    if (hudAltitude) hudAltitude.textContent = `${snap.altitudeKm.toLocaleString()} km`;
    if (hudVelocity) hudVelocity.textContent = `${snap.velocityKmS} km/s`;

    // Eclipse status
    if (hudEclipse) {
      hudEclipse.textContent = snap.isInEclipse ? '🌑 ECLIPSE (Shadow)' : '☀️ SUNLIT';
      hudEclipse.className = snap.isInEclipse ? 'badge-eclipse' : 'badge-sun';
    }

    // Battery
    if (hudBatteryPct) hudBatteryPct.textContent = `${snap.batteryPct}% (${snap.batteryWh} Wh)`;
    if (hudBatteryBar) {
      hudBatteryBar.style.width = `${snap.batteryPct}%`;
      hudBatteryBar.className = snap.batteryPct < 25 ? 'bar-critical' : snap.batteryPct < 50 ? 'bar-warn' : 'bar-good';
    }

    // Temperature
    if (hudTemp) hudTemp.textContent = `${snap.temperatureC}°C`;

    // SSR Storage
    if (hudSSR) hudSSR.textContent = `${snap.ssrUsedGb} / ${snap.ssrCapacityGb} GB`;
    if (hudSSRBar) {
      const ssrPct = Math.round((snap.ssrUsedGb / snap.ssrCapacityGb) * 100);
      hudSSRBar.style.width = `${ssrPct}%`;
      hudSSRBar.className = ssrPct > 90 ? 'bar-critical' : 'bar-good';
    }

    // Radiation dose
    if (hudDose) hudDose.textContent = `${snap.accumulatedDoseKrad} krad`;

    // Science and Downlink
    if (hudSciencePts) hudSciencePts.textContent = `${snap.totalSciencePointsEarned} PTS`;
    if (hudDownlinkGb) hudDownlinkGb.textContent = `${snap.totalDownlinkedGb} GB`;

    // Safe mode and DSN buttons
    if (safeModeBtn) {
      safeModeBtn.classList.toggle('active', snap.safeModeActive);
      safeModeBtn.textContent = snap.safeModeActive ? '🛡️ SAFE MODE: ACTIVE' : '🛡️ SAFE MODE: OFF';
    }
    if (dsnTransmitterBtn) {
      dsnTransmitterBtn.classList.toggle('active', snap.isTransmittingDSN);
      dsnTransmitterBtn.textContent = snap.isTransmittingDSN ? '📡 DSN TX: BEAMING' : '📡 DSN TX: STANDBY';
    }

    // Update active instrument button highlights
    Object.keys(snap.activeInstruments).forEach(instId => {
      const btn = document.querySelector(`.inst-power-btn[data-inst="${instId}"]`);
      if (btn) {
        const isActive = snap.activeInstruments[instId];
        btn.textContent = isActive ? 'ON' : 'OFF';
        btn.classList.toggle('active', isActive);
      }
    });

    // Render Canvas 2D
    if (flightVisualizer && document.getElementById('view-simulation').classList.contains('active')) {
      flightVisualizer.renderFlightSimulation(snap, latestReport.destination);
    }
  };

  // Event modal trigger
  simulator.onEventTriggered = (eventData, resolvedData) => {
    if (eventData) {
      if (eventModal) {
        eventModal.style.display = 'flex';
        if (eventTitle) eventTitle.textContent = eventData.title;
        if (eventDesc) eventDesc.textContent = eventData.description;
        if (eventOptionsContainer) {
          eventOptionsContainer.innerHTML = eventData.options.map((opt, idx) => `
            <button class="event-choice-btn" data-choice="${idx}">
              ${opt.text}
            </button>
          `).join('');

          const choiceBtns = eventOptionsContainer.querySelectorAll('.event-choice-btn');
          choiceBtns.forEach(btn => {
            btn.addEventListener('click', () => {
              const cIdx = parseInt(btn.dataset.choice, 10);
              simulator.resolveEventDecision(cIdx);
            });
          });
        }
      }
    } else {
      if (eventModal) eventModal.style.display = 'none';
      if (resolvedData && resolvedData.outcomeText) {
        showToastNotification(`ANOMALY RESOLVED: ${resolvedData.outcomeText}`);
      }
    }
  };

  // Discovery Toast
  simulator.onDiscoveryUnlocked = (discovery) => {
    showToastNotification(`🎯 DISCOVERY UNLOCKED: ${discovery.name} (+${discovery.points} PTS)`);
  };

  function showToastNotification(msg) {
    const toast = document.createElement('div');
    toast.className = 'stark-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 600);
    }, 4500);
  }

  // Mission completion callback
  simulator.onMissionEnded = (debrief) => {
    audio.playDiscoveryChime();
    renderDebriefScorecard(debrief);
    switchTab('debrief');
  };

  // --- SCREEN 5: SCIENCE DATA LAB ---
  function renderDataLab() {
    const container = document.getElementById('datalab-content');
    if (!container) return;

    const dest = latestReport.destination;
    let dataHtml = '';

    if (dest.id === 'earth') {
      dataHtml = `
        <div class="data-card">
          <h3>OCO-2 Atmospheric CO₂ Global Column Concentrations</h3>
          <p class="data-desc">The Orbiting Carbon Observatory-2 (OCO-2) measures reflected sunlight in near-infrared CO₂ absorption bands to map regional carbon emissions and natural biosphere sinks.</p>
          <div class="data-graph-box">
            <div class="chart-sim-line earth-co2-chart"></div>
            <div class="graph-legend">
              <span>Historical Baseline: 380 ppm (2005)</span>
              <span class="legend-highlight">Current Global Mean: 422.5 ppm</span>
              <span>Seasonal Biosphere Oscillation: ±6 ppm</span>
            </div>
          </div>
          <div class="data-stats-grid">
            <div class="data-stat-col"><strong>Global Growth Rate:</strong> +2.4 ppm/year</div>
            <div class="data-stat-col"><strong>Primary Terrestrial Sink:</strong> Boreal & Tropical Forests</div>
            <div class="data-stat-col"><strong>Oceanic Absorption:</strong> ~25% of anthropogenic carbon</div>
          </div>
        </div>

        <div class="data-card">
          <h3>MODIS Global NDVI (Normalized Difference Vegetation Index)</h3>
          <p class="data-desc">NDVI measures the ratio of red and near-infrared reflectance (NIR - Red) / (NIR + Red) to track photosynthesis, agricultural yield, and deforestation trends.</p>
          <div class="data-palette-bar ndvi-bar"></div>
          <div class="palette-labels">
            <span>0.0 (Water / Desert Sand)</span>
            <span>0.4 (Grassland / Shrub)</span>
            <span>0.85 (Dense Tropical Rainforest Canopy)</span>
          </div>
        </div>
      `;
    } else if (dest.id === 'moon') {
      dataHtml = `
        <div class="data-card">
          <h3>LRO LOLA Topography & South Pole Shackleton Crater</h3>
          <p class="data-desc">LOLA laser altimetry mapped lunar polar craters with centimeter precision. Shackleton Crater (21 km diameter, 4.2 km depth) possesses permanent darkness shielded from direct solar heating for over 2 billion years.</p>
          <div class="crater-profile-box">
            <svg viewBox="0 0 600 200" class="svg-crater-profile">
              <path d="M 20,40 Q 150,45 220,50 L 260,160 Q 300,180 340,160 L 380,50 Q 450,45 580,40" fill="none" stroke="#38bdf8" stroke-width="3" />
              <rect x="250" y="150" width="100" height="30" fill="rgba(14, 165, 233, 0.35)" />
              <text x="270" y="170" fill="#38bdf8" font-size="12">WATER ICE DEPOSIT (5.5 wt%)</text>
              <line x1="220" y1="20" x2="220" y2="50" stroke="#f59e0b" stroke-dasharray="4,4" />
              <text x="180" y="18" fill="#f59e0b" font-size="11">Peak of Eternal Light (86% Sunlit)</text>
            </svg>
          </div>
          <div class="data-stats-grid">
            <div class="data-stat-col"><strong>Coldest PSR Temperature:</strong> 27 Kelvin (-246°C)</div>
            <div class="data-stat-col"><strong>Water Ice Equivalent:</strong> 600M+ Metric Tons</div>
            <div class="data-stat-col"><strong>Artemis III Target:</strong> Connecting Ridge</div>
          </div>
        </div>
      `;
    } else if (dest.id === 'mars') {
      dataHtml = `
        <div class="data-card">
          <h3>MRO CRISM & HiRISE - Jezero Crater Ancient River Delta</h3>
          <p class="data-desc">Jezero crater hosted an ancient lake ~3.7 billion years ago. Compact Reconnaissance Imaging Spectrometer (CRISM) detected rich Fe/Mg-smectite clay minerals washed in by the river channel.</p>
          <div class="data-stats-grid">
            <div class="data-stat-col"><strong>Preservation Potential:</strong> Outstanding for microbial biosignatures</div>
            <div class="data-stat-col"><strong>Subsurface Ice (SHARAD):</strong> Glacial deposits under 2m regolith</div>
            <div class="data-stat-col"><strong>Atmospheric Surface Pressure:</strong> 610 Pa (0.6% Earth)</div>
          </div>
        </div>
      `;
    } else if (dest.id === 'europa') {
      dataHtml = `
        <div class="data-card">
          <h3>Europa Clipper - REASON Radar Ice Sounding & Magnetic Dipole</h3>
          <p class="data-desc">Galileo magnetometer data proved Europa possesses an induced magnetic dipole created by electrical currents in a salty global liquid ocean reacting to Jupiter's sweeping magnetic field.</p>
          <div class="data-stats-grid">
            <div class="data-stat-col"><strong>Ice Crust Thickness:</strong> 15 to 25 km</div>
            <div class="data-stat-col"><strong>Subsurface Ocean Depth:</strong> 60 to 150 km</div>
            <div class="data-stat-col"><strong>Jovian Radiation Flux:</strong> 540 rads/day (Lethal without vault)</div>
          </div>
        </div>
      `;
    }

    container.innerHTML = dataHtml;
  }

  // --- SCREEN 6: POST-MISSION DEBRIEF & SCORECARD ---
  function renderDebriefScorecard(debrief) {
    const gradeEl = document.getElementById('debrief-grade');
    const scienceScoreEl = document.getElementById('debrief-science-score');
    const engScoreEl = document.getElementById('debrief-eng-score');
    const costScoreEl = document.getElementById('debrief-cost-score');
    const debriefAnalysis = document.getElementById('debrief-systems-analysis');
    const debriefAnalog = document.getElementById('debrief-stark-analog');

    // Overall grade
    const totalGradePct = (debrief.scienceScorePct * 0.5) + (debrief.engineeringScore * 0.3) + (debrief.design.cost.isCompliant ? 20 : 0);
    let letterGrade = 'A+';
    if (totalGradePct >= 90) letterGrade = 'A+';
    else if (totalGradePct >= 80) letterGrade = 'A';
    else if (totalGradePct >= 70) letterGrade = 'B';
    else if (totalGradePct >= 60) letterGrade = 'C';
    else letterGrade = 'F';

    if (gradeEl) {
      gradeEl.textContent = letterGrade;
      gradeEl.className = letterGrade.startsWith('A') ? 'grade-excellent' : letterGrade === 'B' ? 'grade-good' : 'grade-poor';
    }

    if (scienceScoreEl) scienceScoreEl.textContent = `${debrief.scienceScorePct}% (${debrief.earnedPoints} / ${debrief.totalPossiblePoints} PTS)`;
    if (engScoreEl) engScoreEl.textContent = `${debrief.engineeringScore} / 100`;
    if (costScoreEl) costScoreEl.textContent = `$${debrief.costMillions}M (Cap: $${debrief.budgetCapMillions}M)`;

    // Systems engineering trade-off debrief
    if (debriefAnalysis) {
      const design = debrief.design;
      let notes = [];

      notes.push(`<strong>Power Architecture:</strong> Selected ${design.subsystems.power.name}. In sunlight at ${debrief.dest.distanceAU} AU, it delivered ${design.power.sunlightGenWatts} W with a power margin of ${design.power.sunlightMarginPct}%.`);

      if (design.power.batterySurvivesEclipse) {
        notes.push(`<strong>Energy Storage:</strong> The battery bank (${design.subsystems.battery.capacityWh} Wh) sustained vital telemetry through the ${(design.power.eclipseDurationMin)} min eclipse with a maximum depth-of-discharge of ${design.power.batteryDepthOfDischargePct}%.`);
      } else {
        notes.push(`<strong>Battery Deficit:</strong> Battery capacity was undersized for prolonged eclipse shadow, forcing automated instrument load-shedding.`);
      }

      notes.push(`<strong>Delta-V & Propulsion:</strong> ${design.subsystems.propulsion.name} provided ${design.deltaV.availableMS} m/s of velocity change against the mission benchmark of ${design.deltaV.requiredMS} m/s (${design.deltaV.marginPct}% reserve margin).`);

      notes.push(`<strong>Communications Downlink:</strong> The ${design.subsystems.telecom.name} downlinked ${debrief.totalDownlinkedGb} GB of authentic scientific datasets to the Deep Space Network.`);

      debriefAnalysis.innerHTML = notes.map(n => `<p class="debrief-p">${n}</p>`).join('');
    }

    // Real mission analog comparison
    if (debriefAnalog) {
      let analogText = '';
      if (debrief.dest.id === 'earth') {
        analogText = 'Your mission configuration shares engineering lineage with Mission Architect’s <strong>Terra / Aqua (EOS)</strong> and <strong>OCO-2</strong> observatories, combining multispectral radiometry with polar sun-synchronous orbital geometry.';
      } else if (debrief.dest.id === 'moon') {
        analogText = 'Your architecture mirrors Mission Architect’s <strong>Lunar Reconnaissance Orbiter (LRO)</strong> and the upcoming <strong>VIPER / Artemis</strong> polar scouts, prioritizing cryogenic thermal survival in permanently shadowed craters.';
      } else if (debrief.dest.id === 'mars') {
        analogText = 'Your mission profile reflects Mission Architect’s <strong>Mars Reconnaissance Orbiter (MRO)</strong> and <strong>MAVEN</strong>, balancing high-bandwidth Ka-band telecom with dual-redundant BAE RAD750 computing.';
      } else if (debrief.dest.id === 'europa') {
        analogText = 'Your heavy radiation vault and nuclear/large-area power approach directly replicates Mission Architect’s <strong>Europa Clipper</strong> flagship mission, overcoming Jupiter’s trapped megavolt electron belt.';
      }

      debriefAnalog.innerHTML = `<p>${analogText}</p>`;
    }
  }

  const restartBtn = document.getElementById('btn-restart-mission');
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      audio.playChime();
      switchTab('briefing');
    });
  }

  // Initialize UI controls
  setupEngineeringControls();
  updateBriefingUI();
  updateEngineeringView();
  populateFlightInstrumentControls();
});
