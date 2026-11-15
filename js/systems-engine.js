/**
 * MISSION ARCHITECT - SYSTEMS ENGINEERING ENGINE
 * Implements real aerospace systems engineering formulas:
 * - Tsiolkovsky Rocket Equation
 * - Solar Irradiance Inverse-Square Law & Solar Cell Degradation
 * - Power Generation vs Consumption & Battery Depth of Discharge
 * - Telecommunications Link Budget (Friis equation scaling)
 * - Thermal Equilibrium & Operating Envelope
 * - Radiation Dose & Total Ionizing Dose (TID) Vault Attenuation
 * - Launch Vehicle Characteristic Energy (C3) & Mass Margins
 */

class SystemsEngineeringEngine {
  constructor(missionData) {
    this.data = missionData || window.MISSION_DATA;
  }

  /**
   * Evaluates the complete spacecraft systems design against target destination
   * @param {Object} spacecraftDesign
   * @returns {Object} Comprehensive systems engineering audit & metrics
   */
  evaluateMissionArchitecture(spacecraftDesign) {
    const dest = this.data.destinations[spacecraftDesign.destinationId] || this.data.destinations.mars;
    const missionClass = this.data.missionClasses[spacecraftDesign.missionClassId] || this.data.missionClasses.discovery;
    const bus = this.data.subsystems.bus[spacecraftDesign.busId] || this.data.subsystems.bus.discovery_medium;
    const powerSub = this.data.subsystems.power[spacecraftDesign.powerId] || this.data.subsystems.power.gaas_ultraflex;
    const batterySub = this.data.subsystems.batteries[spacecraftDesign.batteryId] || this.data.subsystems.batteries.li_ion_medium;
    const propSub = this.data.subsystems.propulsion[spacecraftDesign.propulsionId] || this.data.subsystems.propulsion.biprop_mmh_nto;
    const thermalSub = this.data.subsystems.thermal[spacecraftDesign.thermalId] || this.data.subsystems.thermal.active_heaters_louvers;
    const shieldSub = this.data.subsystems.shielding[spacecraftDesign.shieldingId] || this.data.subsystems.shielding.enhanced_vault;
    const telecomSub = this.data.subsystems.telecom[spacecraftDesign.telecomId] || this.data.subsystems.telecom.high_gain_parabolic;
    const avionicsSub = this.data.subsystems.avionics[spacecraftDesign.avionicsId] || this.data.subsystems.avionics.dual_redundant_rad750;
    const launchVehicle = this.data.launchVehicles[spacecraftDesign.launchVehicleId] || this.data.launchVehicles.falcon_9;

    // 1. INSTRUMENTS PAYLOAD MASS & POWER & DATA
    const selectedInstruments = (spacecraftDesign.selectedInstrumentIds || []).map(id => this.data.instruments[id]).filter(Boolean);
    let payloadMassKg = 0;
    let payloadPowerWatts = 0;
    let payloadDataRateMbps = 0;
    let payloadCostMillions = 0;

    selectedInstruments.forEach(inst => {
      payloadMassKg += inst.massKg;
      payloadPowerWatts += inst.powerWatts;
      payloadDataRateMbps += inst.dataRateMbps;
      payloadCostMillions += inst.costMillions;
    });

    // 2. DRY MASS CALCULATION
    const dryMassSubsystems = 
      bus.dryMassKg +
      powerSub.massKg +
      batterySub.massKg +
      propSub.engineMassKg +
      thermalSub.massKg +
      shieldSub.massKg +
      telecomSub.massKg +
      avionicsSub.massKg;

    const totalDryMassKg = dryMassSubsystems + payloadMassKg;
    const payloadCapacityMarginKg = bus.maxPayloadMassKg - payloadMassKg;

    // 3. PROPELLANT & DELTA-V (Tsiolkovsky Equation)
    // Propellant mass allocation (user chosen or auto-balanced based on tank size)
    const propellantMassKg = Math.max(10, spacecraftDesign.propellantMassKg || 450);
    const totalWetMassKg = totalDryMassKg + propellantMassKg;

    // Delta-V = Isp * g0 * ln(m_wet / m_dry)
    const g0 = 9.80665;
    const availableDeltaV = propSub.ispSeconds * g0 * Math.log(totalWetMassKg / totalDryMassKg);
    const requiredDeltaV = this.data.deltaVRequirements[dest.id].totalRecommended;
    const deltaVMarginPct = ((availableDeltaV - requiredDeltaV) / requiredDeltaV) * 100;

    // 4. POWER BUDGET
    // Inverse Square Law: P_solar = P_base * (1 / r^2)
    const distanceAU = dest.distanceAU;
    let solarGenerationWatts = 0;
    let nuclearGenerationWatts = 0;

    if (powerSub.type === 'solar') {
      const solarFluxRatio = 1 / (distanceAU * distanceAU);
      solarGenerationWatts = powerSub.basePowerWatts1AU * solarFluxRatio;
    } else if (powerSub.type === 'nuclear') {
      nuclearGenerationWatts = powerSub.basePowerWatts1AU; // Constant 140W
    }

    const totalSunlightPowerGenWatts = solarGenerationWatts + nuclearGenerationWatts;
    const eclipsePowerGenWatts = nuclearGenerationWatts; // Zero solar during shadow!

    // Base continuous consumption: Avionics + Telecom base + Thermal base
    const basePowerConsumptionWatts = avionicsSub.powerWatts + (telecomSub.powerWatts * 0.4) + (thermalSub.powerWatts * 0.5);
    const peakPowerConsumptionWatts = basePowerConsumptionWatts + payloadPowerWatts + (propSub.powerReqWatts || 0);

    const sunlightPowerMarginPct = ((totalSunlightPowerGenWatts - peakPowerConsumptionWatts) / peakPowerConsumptionWatts) * 100;

    // Battery Discharge during Orbital Eclipse
    // Eclipse duration in hours
    const orbitPeriodHours = dest.orbitalPeriodMin / 60;
    const eclipseDurationHours = orbitPeriodHours * dest.eclipseFraction;
    const netPowerDeficitInEclipseWatts = Math.max(0, peakPowerConsumptionWatts - eclipsePowerGenWatts);
    const energyNeededInEclipseWh = netPowerDeficitInEclipseWatts * eclipseDurationHours;
    const usableBatteryCapacityWh = batterySub.capacityWh * 0.8; // 80% DoD max safety limit
    const batterySurvivesEclipse = usableBatteryCapacityWh >= energyNeededInEclipseWh;
    const batteryDepthOfDischargePct = Math.min(100, (energyNeededInEclipseWh / batterySub.capacityWh) * 100);

    // 5. THERMAL ENVELOPE AUDIT
    const [thermalMinAcceptable, thermalMaxAcceptable] = thermalSub.operatingRangeC;
    const thermalMinSurvives = dest.thermalMinC >= thermalMinAcceptable;
    const thermalMaxSurvives = dest.thermalMaxC <= thermalMaxAcceptable;
    const thermalViable = thermalMinSurvives && thermalMaxSurvives;

    // 6. RADIATION SHIELDING & EXPECTED LIFETIME
    const annualDoseAtDestKrad = dest.radiationKradPerYear;
    // Vault attenuation factor reduces dose by vault strength
    const effectiveYearlyDoseKrad = annualDoseAtDestKrad / shieldSub.radShieldFactor;
    // Limit before avionics and instrument failure
    const avionicsToleratedKrad = shieldSub.effectiveLimitKrad;
    const estimatedMissionLifetimeYears = Math.min(15, (avionicsToleratedKrad / effectiveYearlyDoseKrad));
    const radiationViable = estimatedMissionLifetimeYears >= 2.0; // Standard 2-year primary mission

    // 7. TELECOMMUNICATIONS & DATA BUDGET (Friis Downlink Rate)
    // Downlink bit rate scales with 1 / (distanceAU ^ 2)
    const distanceFactor = 1 / Math.max(0.005, distanceAU * distanceAU);
    const effectiveDownlinkMbps = (telecomSub.baseBitrateLEOKbps / 1000) * distanceFactor * telecomSub.rangeScaleFactor;
    const clampedDownlinkMbps = Math.max(0.002, effectiveDownlinkMbps); // Minimum emergency carrier
    
    // Total science data generation per 24 hours (assuming 40% active observation duty cycle)
    const dailyScienceDataGeneratedGb = (payloadDataRateMbps * 3600 * 24 * 0.40) / 8000;
    // DSN ground contact: ~6 hours per day assigned contact window
    const dailyDownlinkCapacityGb = (clampedDownlinkMbps * 3600 * 6) / 8000;
    const dataDownlinkRatio = dailyDownlinkCapacityGb / Math.max(0.1, dailyScienceDataGeneratedGb);
    const ssrBufferOverflowRisk = dailyScienceDataGeneratedGb > dailyDownlinkCapacityGb && avionicsSub.storageGb < (dailyScienceDataGeneratedGb * 2);

    // 8. LAUNCH VEHICLE COMPATIBILITY
    let rocketMaxPayloadDestKg = 0;
    if (dest.id === 'earth') rocketMaxPayloadDestKg = launchVehicle.maxPayloadLEOKg;
    else if (dest.id === 'moon') rocketMaxPayloadDestKg = launchVehicle.maxPayloadMoonKg;
    else if (dest.id === 'mars') rocketMaxPayloadDestKg = launchVehicle.maxPayloadMarsKg;
    else if (dest.id === 'europa') rocketMaxPayloadDestKg = launchVehicle.maxPayloadEuropaKg;

    const launchMassMarginKg = rocketMaxPayloadDestKg - totalWetMassKg;
    const launchMassMarginPct = rocketMaxPayloadDestKg > 0 ? (launchMassMarginKg / rocketMaxPayloadDestKg) * 100 : -100;
    const launchVehicleCompatible = rocketMaxPayloadDestKg > 0 && totalWetMassKg <= rocketMaxPayloadDestKg;

    // 9. COST & BUDGET CAP AUDIT
    const baseHardwareCostMillions = 
      bus.costMillions +
      powerSub.costMillions +
      batterySub.costMillions +
      propSub.tankCostMillions +
      thermalSub.costMillions +
      shieldSub.costMillions +
      telecomSub.costMillions +
      avionicsSub.costMillions +
      payloadCostMillions;

    const totalMissionCostMillions = baseHardwareCostMillions + launchVehicle.costMillions + (baseHardwareCostMillions * 0.20); // 20% systems integration & operations reserve
    const budgetCapMillions = missionClass.budgetCapMillions;
    const budgetMarginMillions = budgetCapMillions - totalMissionCostMillions;
    const budgetCompliant = budgetMarginMillions >= 0;

    // 10. SCIENTIFIC OBJECTIVES COVERAGE
    let sciencePotentialPoints = 0;
    let totalPossibleSciencePoints = 0;
    const achievedObjectiveIds = [];
    const missedObjectiveIds = [];

    dest.scienceTargets.forEach(target => {
      totalPossibleSciencePoints += target.points;
      const instrumentSatisfied = selectedInstruments.some(inst => inst.id === target.requiredInstrument);
      if (instrumentSatisfied) {
        sciencePotentialPoints += target.points;
        achievedObjectiveIds.push(target.id);
      } else {
        missedObjectiveIds.push(target.id);
      }
    });

    const scienceCoveragePct = Math.round((sciencePotentialPoints / totalPossibleSciencePoints) * 100);

    // 11. SYSTEMS ENGINEERING CRITICAL ALERTS & WARNINGS
    const alerts = [];
    const warnings = [];

    if (!launchVehicleCompatible) {
      alerts.push({
        type: 'CRITICAL',
        code: 'LAUNCH_CAPACITY_EXCEEDED',
        title: 'Launch Vehicle Mass Capacity Exceeded',
        msg: `Spacecraft wet mass (${Math.round(totalWetMassKg)} kg) exceeds ${launchVehicle.name} maximum payload capacity to ${dest.name} (${rocketMaxPayloadDestKg} kg). Select a larger launch vehicle or decrease wet mass.`
      });
    }

    if (payloadCapacityMarginKg < 0) {
      alerts.push({
        type: 'CRITICAL',
        code: 'BUS_PAYLOAD_EXCEEDED',
        title: 'Bus Structural Payload Capacity Exceeded',
        msg: `Scientific instruments mass (${payloadMassKg} kg) exceeds bus limit (${bus.maxPayloadMassKg} kg) by ${Math.abs(payloadCapacityMarginKg)} kg. Choose a heavier bus class.`
      });
    }

    if (availableDeltaV < requiredDeltaV) {
      alerts.push({
        type: 'CRITICAL',
        code: 'INSUFFICIENT_DELTA_V',
        title: 'Insufficient Delta-V For Orbital Insertion',
        msg: `Spacecraft has only ${Math.round(availableDeltaV)} m/s available, but ${Math.round(requiredDeltaV)} m/s is required for transfer and orbital capture at ${dest.name}. Increase propellant load or upgrade to higher-Isp propulsion.`
      });
    }

    if (totalSunlightPowerGenWatts < peakPowerConsumptionWatts) {
      alerts.push({
        type: 'CRITICAL',
        code: 'NEGATIVE_POWER_MARGIN',
        title: 'Negative Power Margin in Sunlight',
        msg: `Solar/Nuclear generation (${Math.round(totalSunlightPowerGenWatts)}W) cannot support peak power draw (${Math.round(peakPowerConsumptionWatts)}W). Distance is ${distanceAU} AU. Upgrade arrays, switch to MMRTG, or reduce payload.`
      });
    }

    if (!batterySurvivesEclipse && dest.eclipseFraction > 0) {
      alerts.push({
        type: 'CRITICAL',
        code: 'BATTERY_DEPLETED_IN_ECLIPSE',
        title: 'Battery Depletion During Eclipse',
        msg: `Orbital shadow duration is ${(eclipseDurationHours * 60).toFixed(0)} min. Required energy (${Math.round(energyNeededInEclipseWh)} Wh) exceeds battery safe capacity (${Math.round(usableBatteryCapacityWh)} Wh). Deep of discharge is ${Math.round(batteryDepthOfDischargePct)}%. Upgrade battery bank or incorporate MMRTG.`
      });
    }

    if (!thermalViable) {
      alerts.push({
        type: 'CRITICAL',
        code: 'THERMAL_FAILURE_ENVELOPE',
        title: 'Spacecraft Thermal Limit Exceeded',
        msg: `Destination extreme temp (${dest.thermalMinC}°C to ${dest.thermalMaxC}°C) exceeds thermal subsystem rating (${thermalMinAcceptable}°C to ${thermalMaxAcceptable}°C). Sensitive instruments will freeze or overheat.`
      });
    }

    if (estimatedMissionLifetimeYears < 1.0) {
      alerts.push({
        type: 'CRITICAL',
        code: 'LETHAL_RADIATION_EXPOSURE',
        title: 'Lethal Radiation Exposure',
        msg: `Jovian/Solar radiation will destroy avionics within ${(estimatedMissionLifetimeYears * 12).toFixed(1)} months. Upgrade to Heavy Tantalum Vault shielding.`
      });
    } else if (estimatedMissionLifetimeYears < 2.5) {
      warnings.push({
        type: 'WARNING',
        code: 'HIGH_RADIATION_DEGRADATION',
        title: 'High Radiation Exposure Risk',
        msg: `Estimated electronics life is only ${estimatedMissionLifetimeYears.toFixed(1)} years. Solar cells and sensors will experience accelerated degradation.`
      });
    }

    if (!budgetCompliant) {
      alerts.push({
        type: 'CRITICAL',
        code: 'BUDGET_CAP_EXCEEDED',
        title: 'Mission Cost Cap Exceeded',
        msg: `Total mission cost ($${totalMissionCostMillions.toFixed(1)}M) exceeds ${missionClass.name} budget cap ($${budgetCapMillions}M) by $${Math.abs(budgetMarginMillions).toFixed(1)}M.`
      });
    }

    if (dataDownlinkRatio < 0.6) {
      warnings.push({
        type: 'WARNING',
        code: 'DOWNLINK_BOTTLENECK',
        title: 'Telemetry Downlink Bottleneck',
        msg: `Downlink throughput (${clampedDownlinkMbps.toFixed(3)} Mbps at ${distanceAU} AU) cannot keep up with instrument data production (${dailyScienceDataGeneratedGb.toFixed(1)} GB/day). Science data will bottleneck or require selective discarding.`
      });
    }

    if (selectedInstruments.length === 0) {
      warnings.push({
        type: 'WARNING',
        code: 'NO_INSTRUMENTS_SELECTED',
        title: 'No Scientific Payload Selected',
        msg: 'The spacecraft carries no scientific instruments. Select at least one instrument to fulfill mission objectives.'
      });
    }

    // 12. COMPUTE ENGINEERING VIABILITY SCORE (0 to 100)
    let engineeringScore = 100;
    if (alerts.length > 0) {
      engineeringScore -= alerts.length * 25;
    }
    if (warnings.length > 0) {
      engineeringScore -= warnings.length * 8;
    }
    // Margin bonuses/penalties
    if (deltaVMarginPct > 15 && deltaVMarginPct < 60) engineeringScore += 5; // Healthy delta-V reserve
    if (sunlightPowerMarginPct > 20) engineeringScore += 5;
    engineeringScore = Math.max(5, Math.min(100, Math.round(engineeringScore)));

    const isMissionLaunchReady = alerts.length === 0 && selectedInstruments.length > 0;

    return {
      destination: dest,
      missionClass: missionClass,
      bus: bus,
      subsystems: {
        power: powerSub,
        battery: batterySub,
        propulsion: propSub,
        thermal: thermalSub,
        shielding: shieldSub,
        telecom: telecomSub,
        avionics: avionicsSub
      },
      launchVehicle: launchVehicle,
      instruments: selectedInstruments,

      mass: {
        payloadKg: Math.round(payloadMassKg),
        dryMassKg: Math.round(totalDryMassKg),
        propellantKg: Math.round(propellantMassKg),
        wetMassKg: Math.round(totalWetMassKg),
        busPayloadMarginKg: Math.round(payloadCapacityMarginKg),
        launchMassLimitKg: Math.round(rocketMaxPayloadDestKg),
        launchMassMarginKg: Math.round(launchMassMarginKg),
        launchMassMarginPct: Math.round(launchMassMarginPct)
      },

      deltaV: {
        availableMS: Math.round(availableDeltaV),
        requiredMS: Math.round(requiredDeltaV),
        marginMS: Math.round(availableDeltaV - requiredDeltaV),
        marginPct: Math.round(deltaVMarginPct)
      },

      power: {
        sunlightGenWatts: Math.round(totalSunlightPowerGenWatts),
        solarGenWatts: Math.round(solarGenerationWatts),
        nuclearGenWatts: Math.round(nuclearGenerationWatts),
        eclipseGenWatts: Math.round(eclipsePowerGenWatts),
        baseConsumptionWatts: Math.round(basePowerConsumptionWatts),
        peakConsumptionWatts: Math.round(peakPowerConsumptionWatts),
        sunlightMarginPct: Math.round(sunlightPowerMarginPct),
        batteryCapacityWh: batterySub.capacityWh,
        usableBatteryCapacityWh: Math.round(usableBatteryCapacityWh),
        eclipseDurationMin: Math.round(eclipseDurationHours * 60),
        eclipseEnergyDeficitWh: Math.round(energyNeededInEclipseWh),
        batteryDepthOfDischargePct: Math.round(batteryDepthOfDischargePct),
        batterySurvivesEclipse: batterySurvivesEclipse
      },

      thermal: {
        destRangeC: [dest.thermalMinC, dest.thermalMaxC],
        spacecraftRangeC: [thermalMinAcceptable, thermalMaxAcceptable],
        isViable: thermalViable
      },

      radiation: {
        destAnnualDoseKrad: dest.radiationKradPerYear,
        effectiveAnnualDoseKrad: Number(effectiveYearlyDoseKrad.toFixed(2)),
        vaultLimitKrad: avionicsToleratedKrad,
        estimatedLifetimeYears: Number(estimatedMissionLifetimeYears.toFixed(1)),
        isViable: radiationViable
      },

      telecom: {
        downlinkRateMbps: Number(clampedDownlinkMbps.toFixed(4)),
        dailyScienceDataGb: Number(dailyScienceDataGeneratedGb.toFixed(2)),
        dailyDownlinkCapacityGb: Number(dailyDownlinkCapacityGb.toFixed(2)),
        downlinkRatio: Number(dataDownlinkRatio.toFixed(2)),
        storageCapacityGb: avionicsSub.storageGb,
        bufferOverflowRisk: ssrBufferOverflowRisk,
        commsLatencySec: dest.commsDelaySec
      },

      cost: {
        hardwareCostMillions: Number(baseHardwareCostMillions.toFixed(1)),
        launchCostMillions: launchVehicle.costMillions,
        totalCostMillions: Number(totalMissionCostMillions.toFixed(1)),
        budgetCapMillions: budgetCapMillions,
        marginMillions: Number(budgetMarginMillions.toFixed(1)),
        isCompliant: budgetCompliant
      },

      science: {
        coveragePct: scienceCoveragePct,
        achievedPoints: sciencePotentialPoints,
        totalPoints: totalPossibleSciencePoints,
        achievedObjectiveIds: achievedObjectiveIds,
        missedObjectiveIds: missedObjectiveIds
      },

      engineeringScore: engineeringScore,
      isLaunchReady: isMissionLaunchReady,
      alerts: alerts,
      warnings: warnings
    };
  }

  /**
   * Helper to compute dynamic propellant mass for a desired Delta-V
   */
  calculatePropellantForDeltaV(dryMassKg, targetDeltaV, ispSeconds) {
    const g0 = 9.80665;
    // m_wet = m_dry * exp(DeltaV / (Isp * g0))
    const massRatio = Math.exp(targetDeltaV / (ispSeconds * g0));
    const wetMassKg = dryMassKg * massRatio;
    return Math.max(10, Math.round(wetMassKg - dryMassKg));
  }
}

// Export to window
if (typeof window !== 'undefined') {
  window.SystemsEngineeringEngine = SystemsEngineeringEngine;
}
