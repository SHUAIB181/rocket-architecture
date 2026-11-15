/**
 * MISSION ARCHITECT - MISSION SIMULATION & DYNAMICS
 * Orchestrates real-time orbital flight simulation, subsystem telemetry,
 * dynamic space weather events, science data collection, and DSN downlink passes.
 */

class MissionSimulator {
  constructor(systemsEngine, audioController) {
    this.systemsEngine = systemsEngine;
    this.audio = audioController;

    // Simulation state
    this.isRunning = false;
    this.timeScale = 1.0; // 1x, 5x, 25x, 100x
    this.phase = 'PRE_LAUNCH'; // PRE_LAUNCH, ASCENT, CRUISE, SCIENCE_OPS, DEBRIEF
    this.elapsedMissionSeconds = 0;
    this.orbitCount = 0;
    this.orbitTrueAnomalyRad = 0; // 0 to 2*PI

    // Spacecraft active dynamic state
    this.state = {
      batteryWh: 0,
      batteryCapacityWh: 0,
      batteryPct: 100,
      propellantKg: 0,
      temperatureC: 20,
      ssrUsedGb: 0,
      ssrCapacityGb: 128,
      accumulatedDoseKrad: 0,
      solarEfficiencyPct: 100,
      safeModeActive: false,
      isTransmittingDSN: false,
      isInEclipse: false,
      altitudeKm: 0,
      velocityKmS: 0,
      totalSciencePointsEarned: 0,
      totalDownlinkedGb: 0,
      activeInstruments: {},
      subsystemHealth: {
        power: 100,
        thermal: 100,
        avionics: 100,
        propulsion: 100,
        telecom: 100
      }
    };

    // Scanned science objectives map
    this.scannedTargets = {}; // { [targetId]: progressPct }
    this.unlockedDiscoveries = [];

    // Active in-flight dynamic event
    this.currentEvent = null;
    this.eventTimer = 0;
    this.eventCooldown = 15; // seconds between random events

    // Event listener callbacks
    this.onTelemetryUpdate = null;
    this.onEventTriggered = null;
    this.onDiscoveryUnlocked = null;
    this.onPhaseChanged = null;
    this.onMissionEnded = null;

    this.rafId = null;
    this.lastTimestamp = 0;
  }

  /**
   * Initializes simulation with evaluated systems engineering report
   */
  initializeMission(designReport) {
    this.report = designReport;
    this.dest = designReport.destination;
    this.elapsedMissionSeconds = 0;
    this.orbitCount = 0;
    this.orbitTrueAnomalyRad = 0;
    this.timeScale = 1.0;
    this.phase = 'PRE_LAUNCH';
    this.currentEvent = null;

    // Setup initial spacecraft state
    this.state.batteryCapacityWh = designReport.power.batteryCapacityWh;
    this.state.batteryWh = designReport.power.batteryCapacityWh;
    this.state.batteryPct = 100;
    this.state.propellantKg = designReport.mass.propellantKg;
    this.state.temperatureC = 20; // Room temp pre-launch
    this.state.ssrUsedGb = 0;
    this.state.ssrCapacityGb = designReport.telecom.storageCapacityGb;
    this.state.accumulatedDoseKrad = 0;
    this.state.solarEfficiencyPct = 100;
    this.state.safeModeActive = false;
    this.state.isTransmittingDSN = false;
    this.state.isInEclipse = false;
    this.state.altitudeKm = 0;
    this.state.velocityKmS = 0;
    this.state.totalSciencePointsEarned = 0;
    this.state.totalDownlinkedGb = 0;

    // Initialize all selected instruments as active
    this.state.activeInstruments = {};
    (this.report.instruments || []).forEach(inst => {
      this.state.activeInstruments[inst.id] = true;
    });

    // Reset health & science targets
    this.state.subsystemHealth = {
      power: 100,
      thermal: 100,
      avionics: 100,
      propulsion: 100,
      telecom: 100
    };

    this.scannedTargets = {};
    this.dest.scienceTargets.forEach(target => {
      this.scannedTargets[target.id] = 0;
    });
    this.unlockedDiscoveries = [];

    if (this.onTelemetryUpdate) {
      this.onTelemetryUpdate(this.getTelemetrySnapshot());
    }
  }

  /**
   * Starts the simulation clock loop
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.loop = (currentTimestamp) => {
      if (!this.isRunning) return;
      const deltaRealSec = Math.min(0.2, (currentTimestamp - this.lastTimestamp) / 1000);
      this.lastTimestamp = currentTimestamp;

      this.step(deltaRealSec);

      this.rafId = requestAnimationFrame(this.loop);
    };
    this.rafId = requestAnimationFrame(this.loop);
  }

  /**
   * Pauses simulation
   */
  pause() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Sets time acceleration factor
   */
  setTimeScale(scale) {
    this.timeScale = Math.max(0.5, Math.min(100, scale));
  }

  /**
   * Transitions simulation phase
   */
  setPhase(newPhase) {
    this.phase = newPhase;
    if (this.onPhaseChanged) {
      this.onPhaseChanged(newPhase);
    }
  }

  /**
   * Simulation clock tick
   */
  step(deltaRealSec) {
    const deltaSimSec = deltaRealSec * this.timeScale;
    this.elapsedMissionSeconds += deltaSimSec;

    switch (this.phase) {
      case 'PRE_LAUNCH':
        // Wait for player to initiate launch sequence
        break;

      case 'ASCENT':
        this.stepAscentPhase(deltaSimSec);
        break;

      case 'CRUISE':
        this.stepCruisePhase(deltaSimSec);
        break;

      case 'SCIENCE_OPS':
        this.stepScienceOperations(deltaSimSec);
        break;

      case 'DEBRIEF':
        // Mission concluded
        break;
    }

    // Check for random dynamic events during flight
    if (this.phase === 'CRUISE' || this.phase === 'SCIENCE_OPS') {
      this.stepDynamicEvents(deltaSimSec);
    }

    // Emit live telemetry to UI
    if (this.onTelemetryUpdate) {
      this.onTelemetryUpdate(this.getTelemetrySnapshot());
    }
  }

  /**
   * ASCENT PHASE (Liftoff, stage separation, orbital injection)
   */
  stepAscentPhase(deltaSimSec) {
    const ascentDuration = 45; // seconds
    const progress = Math.min(1.0, this.elapsedMissionSeconds / ascentDuration);

    this.state.altitudeKm = progress * this.dest.targetAltitudeKm;
    this.state.velocityKmS = progress * this.dest.orbitalVelocityKmS;

    if (progress >= 1.0) {
      // Completed ascent! Deploy solar arrays and move to cruise/orbit
      if (this.audio) this.audio.playChime();
      if (this.dest.id === 'earth') {
        this.setPhase('SCIENCE_OPS');
      } else {
        this.setPhase('CRUISE');
      }
    }
  }

  /**
   * CRUISE PHASE (Interplanetary transfer, trajectory maneuvers, arrival)
   */
  stepCruisePhase(deltaSimSec) {
    // Interplanetary cruise duration representation
    const cruiseDurationSimSec = 90; // ~90 sim seconds representing transfer months
    const progress = Math.min(1.0, (this.elapsedMissionSeconds - 45) / cruiseDurationSimSec);

    // Gradual distance scaling
    this.state.altitudeKm = this.dest.targetAltitudeKm + (1.0 - progress) * 20000;
    this.state.velocityKmS = this.dest.orbitalVelocityKmS + (1.0 - progress) * 5.0;

    // Power generation scales as spacecraft approaches target AU
    const currentAU = 1.0 + progress * (this.dest.distanceAU - 1.0);
    this.updatePowerAndThermal(deltaSimSec, currentAU, false);

    if (progress >= 1.0) {
      // Reached destination! Perform Orbital Insertion burn
      this.setPhase('SCIENCE_OPS');
      if (this.audio) this.audio.playChime();
    }
  }

  /**
   * SCIENCE OPERATIONS PHASE (Planetary orbit, science passes, thermal cycles, DSN downlink)
   */
  stepScienceOperations(deltaSimSec) {
    const orbitPeriodSec = this.dest.orbitalPeriodMin * 60;
    const orbitalAngularVelocity = (2 * Math.PI) / orbitPeriodSec;

    // Update true anomaly
    this.orbitTrueAnomalyRad = (this.orbitTrueAnomalyRad + orbitalAngularVelocity * deltaSimSec) % (2 * Math.PI);
    this.orbitCount = Math.floor(this.elapsedMissionSeconds / orbitPeriodSec);

    // Eclipse geometry: True anomaly from PI - angle to PI + angle
    const halfEclipseRad = this.dest.eclipseFraction * Math.PI;
    const inEclipse = (this.orbitTrueAnomalyRad > (Math.PI - halfEclipseRad)) && 
                      (this.orbitTrueAnomalyRad < (Math.PI + halfEclipseRad));
    this.state.isInEclipse = inEclipse;

    this.state.altitudeKm = this.dest.targetAltitudeKm;
    this.state.velocityKmS = this.dest.orbitalVelocityKmS;

    // 1. Power & Battery Management
    this.updatePowerAndThermal(deltaSimSec, this.dest.distanceAU, inEclipse);

    // 2. Science Instruments Data Acquisition
    this.updateScienceScanning(deltaSimSec, inEclipse);

    // 3. Telecommunications & DSN Ground Station Downlink
    this.updateDSNDownlink(deltaSimSec);

    // 4. Radiation Dose Accumulation
    const annualDoseKrad = this.dest.radiationKradPerYear / this.report.subsystems.shielding.radShieldFactor;
    const doseIncrement = (annualDoseKrad / (365 * 24 * 3600)) * deltaSimSec;
    this.state.accumulatedDoseKrad += doseIncrement;

    // Check radiation degradation threshold
    if (this.state.accumulatedDoseKrad > this.report.subsystems.shielding.effectiveLimitKrad) {
      this.state.subsystemHealth.avionics = Math.max(20, this.state.subsystemHealth.avionics - (deltaSimSec * 0.1));
      this.state.solarEfficiencyPct = Math.max(30, this.state.solarEfficiencyPct - (deltaSimSec * 0.05));
    }

    // Check mission completion condition (e.g. all targets scanned or 5 full orbits)
    const allTargetsComplete = Object.values(this.scannedTargets).every(pct => pct >= 100);
    if (allTargetsComplete && this.state.ssrUsedGb < 1.0) {
      this.concludeMission('SUCCESS');
    }
  }

  /**
   * Computes power generation, battery charge/discharge, and thermal equilibrium
   */
  updatePowerAndThermal(deltaSimSec, currentAU, inEclipse) {
    const powerSub = this.report.subsystems.power;
    const thermalSub = this.report.subsystems.thermal;

    // Power Generation
    let generationWatts = 0;
    if (inEclipse) {
      generationWatts = this.report.power.nuclearGenWatts; // 0 for pure solar
    } else {
      if (powerSub.type === 'solar') {
        const solarFactor = (1 / (currentAU * currentAU)) * (this.state.solarEfficiencyPct / 100);
        generationWatts = powerSub.basePowerWatts1AU * solarFactor;
      } else {
        generationWatts = powerSub.basePowerWatts1AU; // RTG constant
      }
    }

    // Power Consumption
    let consumptionWatts = this.report.power.baseConsumptionWatts;

    // Thermal heater draw when in cold regions
    if (inEclipse || currentAU > 1.4) {
      consumptionWatts += thermalSub.powerWatts;
    }

    // Active instruments power
    if (!this.state.safeModeActive) {
      (this.report.instruments || []).forEach(inst => {
        if (this.state.activeInstruments[inst.id]) {
          consumptionWatts += inst.powerWatts;
        }
      });
    }

    // DSN transmitter extra power
    if (this.state.isTransmittingDSN) {
      consumptionWatts += this.report.subsystems.telecom.powerWatts * 0.6;
    }

    // Battery delta Wh
    const deltaHours = deltaSimSec / 3600;
    const netPowerWatts = generationWatts - consumptionWatts;
    this.state.batteryWh += (netPowerWatts * deltaHours);

    // Clamp battery between 0 and maximum capacity
    this.state.batteryWh = Math.max(0, Math.min(this.state.batteryCapacityWh, this.state.batteryWh));
    this.state.batteryPct = Math.round((this.state.batteryWh / this.state.batteryCapacityWh) * 100);

    // If battery completely dies
    if (this.state.batteryPct <= 0 && netPowerWatts < 0) {
      this.state.subsystemHealth.avionics = Math.max(10, this.state.subsystemHealth.avionics - (deltaSimSec * 0.5));
      // Force shutdown of all instruments
      Object.keys(this.state.activeInstruments).forEach(k => this.state.activeInstruments[k] = false);
    }

    // Spacecraft Thermal Equilibrium (°C)
    let targetTempC = 15;
    if (inEclipse) {
      targetTempC = Math.max(this.dest.thermalMinC, -80);
    } else {
      // Warmer in sunlight, cooler with distance
      targetTempC = (120 / currentAU) - 30;
      targetTempC = Math.min(this.dest.thermalMaxC, targetTempC);
    }

    // Thermal lag (approaches target temp smoothly)
    const tempChangeRate = 0.05 * deltaSimSec;
    this.state.temperatureC += (targetTempC - this.state.temperatureC) * tempChangeRate;

    // Check thermal limits
    const [minAllowed, maxAllowed] = thermalSub.operatingRangeC;
    if (this.state.temperatureC < minAllowed || this.state.temperatureC > maxAllowed) {
      this.state.subsystemHealth.thermal = Math.max(20, this.state.subsystemHealth.thermal - (deltaSimSec * 0.2));
    }
  }

  /**
   * Scans science targets when active instruments fly over planetary surface
   */
  updateScienceScanning(deltaSimSec, inEclipse) {
    if (this.state.safeModeActive || this.state.batteryPct <= 5) return;

    // Check if SSR has free storage
    if (this.state.ssrUsedGb >= this.state.ssrCapacityGb) {
      // Buffer full! Cannot record new data until downlinked
      return;
    }

    // Scan targets mapped to active instruments
    this.dest.scienceTargets.forEach(target => {
      const currentPct = this.scannedTargets[target.id] || 0;
      if (currentPct >= 100) return;

      const hasRequiredInstrument = this.state.activeInstruments[target.requiredInstrument];
      if (hasRequiredInstrument) {
        // Scanning rate: 100% completed in ~40 sim seconds of observation
        const scanSpeed = 2.5 * deltaSimSec;
        const newPct = Math.min(100, currentPct + scanSpeed);
        this.scannedTargets[target.id] = newPct;

        // Generate data in SSR
        const inst = this.report.instruments.find(i => i.id === target.requiredInstrument);
        if (inst) {
          const generatedGb = (inst.dataRateMbps * deltaSimSec) / 8000;
          this.state.ssrUsedGb = Math.min(this.state.ssrCapacityGb, this.state.ssrUsedGb + generatedGb);
        }

        // Trigger discovery unlock when target reaches 100%
        if (currentPct < 100 && newPct >= 100) {
          this.unlockDiscovery(target);
        }
      }
    });
  }

  /**
   * Handles DSN Ground Station contact passes and science data downlinking
   */
  updateDSNDownlink(deltaSimSec) {
    // DSN ground stations pass visibility cycle:
    // Earth rotates every 24h; Goldstone, Madrid, Canberra alternate contact passes
    // In sim, DSN pass is active when transmitter is enabled and SSR has data
    if (this.state.isTransmittingDSN && this.state.ssrUsedGb > 0 && !this.state.safeModeActive) {
      const downlinkMbps = this.report.telecom.downlinkRateMbps;
      const dataTransferredGb = (downlinkMbps * deltaSimSec) / 8000;
      const actualGbTransferred = Math.min(this.state.ssrUsedGb, dataTransferredGb);

      this.state.ssrUsedGb = Math.max(0, this.state.ssrUsedGb - actualGbTransferred);
      this.state.totalDownlinkedGb += actualGbTransferred;

      // Award science score proportional to downlinked science
      const sciencePointRate = (actualGbTransferred / Math.max(1, this.report.telecom.dailyScienceDataGb)) * 25;
      this.state.totalSciencePointsEarned += sciencePointRate;

      if (this.state.ssrUsedGb <= 0.01) {
        this.state.ssrUsedGb = 0;
      }
    }
  }

  /**
   * Manages dynamic in-flight events (Solar Flares, Micrometeoroids, Dust Storms)
   */
  stepDynamicEvents(deltaSimSec) {
    if (this.currentEvent) {
      this.currentEvent.remainingDurationSec -= deltaSimSec;
      if (this.currentEvent.remainingDurationSec <= 0) {
        // Event ended
        this.resolveEvent('EXPIRED');
      }
      return;
    }

    this.eventTimer += deltaSimSec;
    if (this.eventTimer >= this.eventCooldown) {
      this.eventTimer = 0;
      // 35% chance to trigger an anomaly event
      if (Math.random() < 0.35) {
        this.triggerRandomEvent();
      }
    }
  }

  /**
   * Generates a realistic space mission engineering event
   */
  triggerRandomEvent() {
    const events = [
      {
        id: 'solar_coronal_ejection',
        title: 'Coronal Mass Ejection (CME) Radiation Wave',
        description: 'Space Weather Prediction Center alerts: High-energy solar proton storm incoming! Enter Safe Mode to protect sensitive detector focal planes, or stay active to acquire rare space physics data.',
        type: 'HAZARD',
        durationSec: 25,
        options: [
          {
            text: 'Enter Safe Mode (Shield Electronics)',
            action: 'SAFE_MODE',
            outcomeText: 'Spacecraft oriented to shield bus. Electronics protected from proton damage.'
          },
          {
            text: 'Maintain Observation (Risk Sensor Burnout)',
            action: 'RISK_SCIENCE',
            outcomeText: 'Acquired 15 bonus science points! Slight sensor noise and 5% solar degradation.'
          }
        ]
      },
      {
        id: 'micrometeoroid_strike',
        title: 'Micrometeoroid Impact on Radiator Panel',
        description: 'Attitude sensors detect a hypervelocity particle strike on the thermal control louver. Spacecraft temperature rising.',
        type: 'CRISIS',
        durationSec: 20,
        options: [
          {
            text: 'Re-orient Spacecraft Away from Sun Glare',
            action: 'ORIENT_AWAY',
            outcomeText: 'Attitude adjusted. Temperatures stabilized back within nominal window.'
          },
          {
            text: 'Increase Coolant Flow & Heater Power',
            action: 'INCREASE_COOLING',
            outcomeText: 'Thermal loop compensated. Power consumption increased by 35W.'
          }
        ]
      },
      {
        id: 'reaction_wheel_saturation',
        title: 'Reaction Wheel Angular Momentum Saturation',
        description: 'Wheel #2 spinning near max RPM due to solar radiation pressure torques. Desaturation maneuver required.',
        type: 'MANEUVER',
        durationSec: 18,
        options: [
          {
            text: 'Fire RCS Thrusters to Dump Momentum',
            action: 'FIRE_RCS',
            outcomeText: 'RCS pulse desaturated reaction wheels. Consumed 2.5 kg propellant.'
          },
          {
            text: 'Use Planetary Magnetic Torquers',
            action: 'USE_TORQUER',
            outcomeText: 'Torquer bars slowly unloaded momentum over half an orbit with zero propellant cost.'
          }
        ]
      }
    ];

    // Destination-specific events
    if (this.dest.id === 'mars') {
      events.push({
        id: 'mars_dust_storm',
        title: 'Regional Martian Dust Storm (Tau > 2.5)',
        description: 'Atmospheric optical depth has surged. Solar panel illumination reduced by 45%. Dust coating arrays.',
        type: 'HAZARD',
        durationSec: 30,
        options: [
          {
            text: 'Conserve Power (Disable Radar Sounder)',
            action: 'SHUTDOWN_RADAR',
            outcomeText: 'High-power radar paused. Batteries maintained above safe 70% threshold.'
          },
          {
            text: 'Run on Batteries (Maintain Full Radar Pass)',
            action: 'RUN_BATTERY',
            outcomeText: 'Completed deep ice sounding pass, but battery drained to 22%!'
          }
        ]
      });
    }

    const selected = events[Math.floor(Math.random() * events.length)];
    this.currentEvent = {
      ...selected,
      remainingDurationSec: selected.durationSec
    };

    if (this.audio) this.audio.playAlarm();
    if (this.onEventTriggered) {
      this.onEventTriggered(this.currentEvent);
    }
  }

  /**
   * Resolves player's decision during an in-flight crisis
   */
  resolveEventDecision(optionIndex) {
    if (!this.currentEvent) return;
    const option = this.currentEvent.options[optionIndex];

    switch (option.action) {
      case 'SAFE_MODE':
        this.toggleSafeMode(true);
        setTimeout(() => this.toggleSafeMode(false), 8000);
        break;

      case 'RISK_SCIENCE':
        this.state.totalSciencePointsEarned += 15;
        this.state.solarEfficiencyPct = Math.max(40, this.state.solarEfficiencyPct - 5);
        this.state.accumulatedDoseKrad += 2.0;
        break;

      case 'ORIENT_AWAY':
        this.state.temperatureC = 12;
        break;

      case 'INCREASE_COOLING':
        this.state.temperatureC = 16;
        break;

      case 'FIRE_RCS':
        this.state.propellantKg = Math.max(0, this.state.propellantKg - 2.5);
        if (this.audio) this.audio.playThruster();
        break;

      case 'USE_TORQUER':
        // No propellant penalty
        break;

      case 'SHUTDOWN_RADAR':
        if (this.state.activeInstruments['radar_sounder']) {
          this.state.activeInstruments['radar_sounder'] = false;
        }
        break;

      case 'RUN_BATTERY':
        this.state.batteryWh = Math.max(this.state.batteryCapacityWh * 0.22, this.state.batteryWh - 400);
        this.state.totalSciencePointsEarned += 20;
        break;
    }

    if (this.audio) this.audio.playChime();
    this.resolveEvent('RESOLVED', option.outcomeText);
  }

  resolveEvent(status, outcomeText) {
    const resolvedEvent = {
      ...this.currentEvent,
      status: status,
      outcomeText: outcomeText || 'Event cycle completed.'
    };
    this.currentEvent = null;

    if (this.onEventTriggered) {
      this.onEventTriggered(null, resolvedEvent);
    }
  }

  /**
   * Unlocks a scientific discovery
   */
  unlockDiscovery(target) {
    const discovery = {
      targetId: target.id,
      name: target.name,
      points: target.points,
      timestampMissionSec: Math.round(this.elapsedMissionSeconds),
      missionRealFacts: this.dest.realData
    };

    this.unlockedDiscoveries.push(discovery);
    this.state.totalSciencePointsEarned += target.points;

    if (this.audio) this.audio.playChime();
    if (this.onDiscoveryUnlocked) {
      this.onDiscoveryUnlocked(discovery);
    }
  }

  /**
   * Concludes the mission and generates post-flight debrief
   */
  concludeMission(outcomeStatus) {
    this.pause();
    this.setPhase('DEBRIEF');

    const totalPossiblePoints = this.dest.scienceTargets.reduce((acc, t) => acc + t.points, 0);
    const earnedPoints = Math.round(this.state.totalSciencePointsEarned);
    const scienceScorePct = Math.min(100, Math.round((earnedPoints / Math.max(1, totalPossiblePoints)) * 100));

    const finalDebrief = {
      outcomeStatus: outcomeStatus,
      scienceScorePct: scienceScorePct,
      earnedPoints: earnedPoints,
      totalPossiblePoints: totalPossiblePoints,
      totalDownlinkedGb: Number(this.state.totalDownlinkedGb.toFixed(2)),
      missionDurationDays: Number((this.elapsedMissionSeconds / (3600 * 24) * 30).toFixed(1)), // Scaled mission life
      subsystemHealth: this.state.subsystemHealth,
      unlockedDiscoveries: this.unlockedDiscoveries,
      engineeringScore: this.report.engineeringScore,
      costMillions: this.report.cost.totalCostMillions,
      budgetCapMillions: this.report.cost.budgetCapMillions,
      dest: this.dest,
      design: this.report
    };

    if (this.onMissionEnded) {
      this.onMissionEnded(finalDebrief);
    }

    return finalDebrief;
  }

  // Subsystem Control Actions
  toggleSafeMode(forceState) {
    this.state.safeModeActive = typeof forceState === 'boolean' ? forceState : !this.state.safeModeActive;
    if (this.state.safeModeActive) {
      // In safe mode, power down instruments and orient towards Sun
      this.state.isTransmittingDSN = false;
    }
  }

  toggleDSNTransmitter(forceState) {
    this.state.isTransmittingDSN = typeof forceState === 'boolean' ? forceState : !this.state.isTransmittingDSN;
    if (this.state.isTransmittingDSN && this.audio) {
      this.audio.playTelemetryPing();
    }
  }

  toggleInstrument(instrumentId) {
    if (this.state.activeInstruments[instrumentId] !== undefined) {
      this.state.activeInstruments[instrumentId] = !this.state.activeInstruments[instrumentId];
    }
  }

  fireOrbitalTrimBurn(deltaVAmount = 25) {
    // Burn propellant: DeltaV = Isp * g0 * ln(m0 / m1) => mass delta
    const isp = this.report.subsystems.propulsion.ispSeconds;
    const g0 = 9.80665;
    const currentWetMass = this.report.mass.dryMassKg + this.state.propellantKg;
    const propBurned = currentWetMass * (1 - Math.exp(-deltaVAmount / (isp * g0)));

    if (this.state.propellantKg >= propBurned) {
      this.state.propellantKg = Math.max(0, this.state.propellantKg - propBurned);
      if (this.audio) this.audio.playThruster();
      return true;
    }
    return false;
  }

  /**
   * Exports full telemetry snapshot for HUD
   */
  getTelemetrySnapshot() {
    return {
      phase: this.phase,
      elapsedMissionSec: Math.round(this.elapsedMissionSeconds),
      orbitCount: this.orbitCount,
      orbitTrueAnomalyRad: this.orbitTrueAnomalyRad,
      altitudeKm: Math.round(this.state.altitudeKm),
      velocityKmS: Number(this.state.velocityKmS.toFixed(2)),
      isInEclipse: this.state.isInEclipse,
      batteryPct: this.state.batteryPct,
      batteryWh: Math.round(this.state.batteryWh),
      propellantKg: Math.round(this.state.propellantKg),
      temperatureC: Math.round(this.state.temperatureC),
      ssrUsedGb: Number(this.state.ssrUsedGb.toFixed(2)),
      ssrCapacityGb: this.state.ssrCapacityGb,
      accumulatedDoseKrad: Number(this.state.accumulatedDoseKrad.toFixed(2)),
      solarEfficiencyPct: Math.round(this.state.solarEfficiencyPct),
      safeModeActive: this.state.safeModeActive,
      isTransmittingDSN: this.state.isTransmittingDSN,
      totalSciencePointsEarned: Math.round(this.state.totalSciencePointsEarned),
      totalDownlinkedGb: Number(this.state.totalDownlinkedGb.toFixed(2)),
      scannedTargets: { ...this.scannedTargets },
      activeInstruments: { ...this.state.activeInstruments },
      subsystemHealth: { ...this.state.subsystemHealth },
      timeScale: this.timeScale,
      currentEvent: this.currentEvent
    };
  }
}

// Export to window
if (typeof window !== 'undefined') {
  window.MissionSimulator = MissionSimulator;
}
