/**
 * MISSION ARCHITECT - MISSION ARCHITECT DATASET & SUBSYSTEM CATALOG
 * Planetary Science, Orbital Mechanics, and Systems Engineering Standards.
 */

const MISSION_DATA = {
  // Destination Profiles based on planetary science and orbital mechanics
  destinations: {
    earth: {
      id: 'earth',
      name: 'Earth (Low Earth & Sun-Synchronous Orbit)',
      category: 'earth_observation',
      distanceAU: 1.0,
      solarFlux: 1361, // W/m^2 (Solar constant at 1 AU)
      gravity: 9.807, // m/s^2
      radiusKm: 6371,
      targetAltitudeKm: 650, // Sun-synchronous orbit altitude
      orbitalVelocityKmS: 7.53, // km/s
      orbitalPeriodMin: 97.7, // ~98 minutes
      eclipseFraction: 0.35, // ~34 minutes in shadow per 98 min orbit
      radiationLevel: 'Low-Moderate (South Atlantic Anomaly)',
      radiationKradPerYear: 1.2,
      thermalMinC: -85,
      thermalMaxC: 115,
      atmosphericDrag: 'Moderate at 650km - requires 15-25 m/s/yr station-keeping',
      commsDelaySec: 0.002, // Negligible light travel time
      description: 'Earth observation in Sun-Synchronous Orbit (SSO) provides consistent lighting for imaging global vegetation, atmospheric greenhouse gases, ocean heat content, and ice sheet mass variations.',
      scienceTargets: [
        { id: 'co2_plumes', name: 'Global Atmospheric Carbon Dioxide (OCO-2 style)', requiredInstrument: 'atmosphere_sounder', points: 30 },
        { id: 'ndvi_vegetation', name: 'Global Biosphere & Crop Health (MODIS NDVI style)', requiredInstrument: 'multispectral_imager', points: 25 },
        { id: 'sea_surface_temp', name: 'Ocean Surface Heat & Current Anomalies', requiredInstrument: 'thermal_spectrometer', points: 25 },
        { id: 'polar_ice_mass', name: 'Greenland & Antarctic Ice Elevation (ICESat-2 LIDAR)', requiredInstrument: 'laser_altimeter', points: 20 }
      ],
      realData: {
        ndviScale: '0.0 (arid desert/water) to +0.85 (dense tropical canopy)',
        co2CurrentAverage: '422.5 ppm (Global Climate Dashboard)',
        seaLevelRiseRate: '+3.4 mm/year (Satellite Altimetry)',
        oceanHeatContentAnomaly: '+280 ZJ since 1993'
      }
    },

    moon: {
      id: 'moon',
      name: 'The Moon (Lunar South Pole & Frozen Orbit)',
      category: 'lunar_exploration',
      distanceAU: 1.0,
      solarFlux: 1361,
      gravity: 1.622, // m/s^2 (0.166 g)
      radiusKm: 1737.4,
      targetAltitudeKm: 100, // Low Lunar Orbit
      orbitalVelocityKmS: 1.633, // km/s
      orbitalPeriodMin: 118.0, // ~2 hours
      eclipseFraction: 0.42, // During orbit; lunar surface night is 14 Earth days!
      radiationLevel: 'High (Direct Solar Protons & Galactic Cosmic Rays)',
      radiationKradPerYear: 15.0,
      thermalMinC: -246, // Coldest recorded temperature in Shackleton PSR by Diviner radiometer
      thermalMaxC: 120, // Equatorial sunlit noon
      atmosphericDrag: 'None (Hard vacuum)',
      commsDelaySec: 1.28, // ~1.3 seconds one-way
      description: 'The Moon is airless and subject to violent thermal swings. The South Pole contains Permanently Shadowed Regions (PSRs) inside deep craters like Shackleton and Faustini that harbor billion-year-old water ice deposits.',
      scienceTargets: [
        { id: 'shackleton_ice', name: 'Shackleton Crater Water-Ice Mapping (LOLA & Neutron Sounding)', requiredInstrument: 'radar_sounder', points: 35 },
        { id: 'diviner_thermal', name: 'Cryogenic Cold Trap Thermography (Diviner style)', requiredInstrument: 'thermal_spectrometer', points: 25 },
        { id: 'artemis_landing_sites', name: 'Lunar Surface Slope & Hazard Topography', requiredInstrument: 'laser_altimeter', points: 20 },
        { id: 'polar_minerals', name: 'Anorthositic Crust & Ilmenite Distribution', requiredInstrument: 'multispectral_imager', points: 20 }
      ],
      realData: {
        coldestPSRTemp: '27 Kelvin (-246°C) in Hermite/Shackleton craters',
        estimatedWaterIce: 'Over 600 million metric tons across lunar poles',
        craterDepthShackleton: '4.2 km depth with rim sunlit ~86% of lunar year',
        gravityMascons: 'Concentrations of dense basalt causing orbital decay without trim burns'
      }
    },

    mars: {
      id: 'mars',
      name: 'Mars (Jezero Crater & Global Climate)',
      category: 'planetary_exploration',
      distanceAU: 1.524, // 1.524 AU average
      solarFlux: 589, // W/m^2 (~43.3% of Earth solar power!)
      gravity: 3.721, // m/s^2 (0.38 g)
      radiusKm: 3389.5,
      targetAltitudeKm: 320, // Low Mars Orbit
      orbitalVelocityKmS: 3.42, // km/s
      orbitalPeriodMin: 112.5,
      eclipseFraction: 0.38,
      radiationLevel: 'High (Thin CO2 atmosphere provides minimal shielding)',
      radiationKradPerYear: 24.0,
      thermalMinC: -130, // Winter polar cap (dry ice freezing point)
      thermalMaxC: 25, // Summer midday equator
      atmosphericDrag: 'Very low at 320km; critical during Entry, Descent, and Landing (EDL)',
      commsDelaySec: 720, // ~12 minutes average (4 to 21 min depending on orbit)
      description: 'Mars is a cold desert world with 43% of Earth’s solar flux. Dust storms can shroud the entire planet, cutting solar irradiance by up to 85%. Jezero Crater holds an ancient river delta preserved with clay minerals that could preserve biosignatures.',
      scienceTargets: [
        { id: 'jezero_delta_clay', name: 'Jezero Ancient Delta Clay & Carbonate Mineralogy (CRISM)', requiredInstrument: 'multispectral_imager', points: 30 },
        { id: 'subsurface_polar_ice', name: 'Subsurface Glacial Ice Sheet Sounding (SHARAD Radar)', requiredInstrument: 'radar_sounder', points: 30 },
        { id: 'dust_storm_dynamics', name: 'Global Atmospheric Pressure & Seasonal CO2 Cycle', requiredInstrument: 'atmosphere_sounder', points: 20 },
        { id: 'crustal_magnetism', name: 'Remnant Ancient Crustal Magnetic Strips (MAVEN style)', requiredInstrument: 'magnetometer', points: 20 }
      ],
      realData: {
        solarInsolation: '589 W/m² (requires solar panels 2.3x larger than Earth orbit)',
        surfacePressure: '610 Pascals (less than 1% of Earth)',
        jezeroDeltaAge: '3.7 billion years old (Noachian-Hesperian transition)',
        dustStormTau: 'Global dust storms can elevate optical depth tau > 4'
      }
    },

    europa: {
      id: 'europa',
      name: 'Europa (Jupiter Subsurface Ocean World)',
      category: 'ocean_worlds',
      distanceAU: 5.20, // 5.2 AU from the Sun!
      solarFlux: 50.3, // W/m^2 (Only ~3.7% of Earth! Solar is very difficult; nuclear/RTG preferred)
      gravity: 1.315, // m/s^2 (0.134 g)
      radiusKm: 1560.8,
      targetAltitudeKm: 150, // Flyby periapsis
      orbitalVelocityKmS: 1.88,
      orbitalPeriodMin: 85.0, // Per flyby pass
      eclipseFraction: 0.30,
      radiationLevel: 'EXTREME! (Jovian Magnetosphere Trapped Megavolt Electrons)',
      radiationKradPerYear: 320.0, // Lethal without thick Tantalum/Aluminum vault!
      thermalMinC: -220,
      thermalMaxC: -160,
      atmosphericDrag: 'Negligible trace molecular oxygen exosphere',
      commsDelaySec: 2700, // ~45 minutes one-way light time
      description: 'Europa harbors a global saltwater ocean beneath a 15-25 km thick ice shell, containing more liquid water than all Earth’s oceans combined. However, Jupiter’s trapped magnetic radiation belt bombards Europa with intense ionizing radiation, requiring a heavy radiation vault.',
      scienceTargets: [
        { id: 'ice_shell_thickness', name: 'Ice Shell Radar Sounding & Ocean Interface (REASON style)', requiredInstrument: 'radar_sounder', points: 35 },
        { id: 'induced_magnetic_dipole', name: 'Induced Saline Ocean Magnetic Confirmation (PIMS/ICMAG)', requiredInstrument: 'magnetometer', points: 30 },
        { id: 'water_plume_volatiles', name: 'Cryovolcanic Plume Gas & Salt Sampling (MASPEX)', requiredInstrument: 'mass_spectrometer', points: 25 },
        { id: 'chaos_terrain_surface', name: 'Chaos Terrain & Fresh Ice Fractures (EIS Camera)', requiredInstrument: 'high_res_camera', points: 10 }
      ],
      realData: {
        solarFluxDrop: '50.3 W/m² (requires giant 100m² solar arrays or MMRTG nuclear)',
        radiationEnvironment: 'Europa receives ~540 rads/day; Jupiter magnetosphere creates lethal ionizing dose',
        oceanVolume: 'Estimated 2 to 3 times Earth’s ocean volume combined',
        iceShellThickness: 'Estimated 15 - 25 km floating on a 60-150 km deep ocean'
      }
    }
  },

  // Scientific Instruments Catalog with systems engineering metrics
  instruments: {
    high_res_camera: {
      id: 'high_res_camera',
      name: 'High-Resolution Optical Reconnaissance Camera',
      heritage: 'HiRISE (Mars Reconnaissance Orbiter) / LROC (Lunar Recon Orbiter)',
      massKg: 28,
      powerWatts: 42,
      dataRateMbps: 12.0,
      thermalMinC: -30,
      thermalMaxC: 60,
      radToleranceKrad: 40,
      costMillions: 45,
      compatibleTargets: ['earth', 'moon', 'mars', 'europa'],
      scienceDescription: 'Large-aperture optical telescope capable of resolving 0.25-meter surface details, boulders, landing hazards, and geological fault lines.',
      primaryObjectiveIds: ['artemis_landing_sites', 'chaos_terrain_surface']
    },

    multispectral_imager: {
      id: 'multispectral_imager',
      name: 'Multispectral Mineral & Biosphere Imager',
      heritage: 'MODIS (Terra/Aqua) / Mastcam-Z / CRISM',
      massKg: 24,
      powerWatts: 35,
      dataRateMbps: 5.5,
      thermalMinC: -40,
      thermalMaxC: 50,
      radToleranceKrad: 50,
      costMillions: 38,
      compatibleTargets: ['earth', 'moon', 'mars'],
      scienceDescription: 'Captures narrow bands across visible and near-infrared wavelengths to identify chlorophyll/NDVI vegetation indices, iron oxides, hydrated clays, and sulfate minerals.',
      primaryObjectiveIds: ['ndvi_vegetation', 'jezero_delta_clay', 'polar_minerals']
    },

    radar_sounder: {
      id: 'radar_sounder',
      name: 'Ice-Penetrating Synthetic Aperture Radar (SAR)',
      heritage: 'SHARAD (MRO) / REASON (Europa Clipper) / Mini-RF',
      massKg: 38,
      powerWatts: 85,
      dataRateMbps: 3.5,
      thermalMinC: -50,
      thermalMaxC: 60,
      radToleranceKrad: 100,
      costMillions: 62,
      compatibleTargets: ['moon', 'mars', 'europa'],
      scienceDescription: 'Dual-frequency subsurface radar (HF/VHF) that penetrates hundreds of meters into regolith and kilometers through glacial ice to map hidden water-ice aquifers and ice-ocean boundaries.',
      primaryObjectiveIds: ['shackleton_ice', 'subsurface_polar_ice', 'ice_shell_thickness']
    },

    laser_altimeter: {
      id: 'laser_altimeter',
      name: 'Precision Laser Altimeter & Topographic LIDAR',
      heritage: 'LOLA (Lunar Reconnaissance Orbiter) / MOLA / ICESat-2',
      massKg: 22,
      powerWatts: 38,
      dataRateMbps: 1.8,
      thermalMinC: -35,
      thermalMaxC: 55,
      radToleranceKrad: 45,
      costMillions: 32,
      compatibleTargets: ['earth', 'moon', 'mars'],
      scienceDescription: 'Fires nanosecond laser pulses thousands of times per second to measure surface elevations to centimeter accuracy, mapping ice sheet elevation changes and rugged lunar craters.',
      primaryObjectiveIds: ['polar_ice_mass', 'artemis_landing_sites']
    },

    thermal_spectrometer: {
      id: 'thermal_spectrometer',
      name: 'Thermal Infrared Radiometer & Spectrometer',
      heritage: 'Diviner (LRO) / TES (Mars Global Surveyor) / MODIS',
      massKg: 20,
      powerWatts: 30,
      dataRateMbps: 1.2,
      thermalMinC: -50,
      thermalMaxC: 65,
      radToleranceKrad: 50,
      costMillions: 28,
      compatibleTargets: ['earth', 'moon', 'mars'],
      scienceDescription: 'Measures infrared emissions to map surface temperatures down to 25 Kelvin, rock abundance, thermal inertia, and ocean sea surface temperature anomalies.',
      primaryObjectiveIds: ['sea_surface_temp', 'diviner_thermal']
    },

    magnetometer: {
      id: 'magnetometer',
      name: 'Fluxgate Magnetometer on Deployable 5m Boom',
      heritage: 'Europa Clipper MAG / MAVEN / Voyager',
      massKg: 12,
      powerWatts: 14,
      dataRateMbps: 0.35,
      thermalMinC: -120,
      thermalMaxC: 90,
      radToleranceKrad: 200,
      costMillions: 22,
      compatibleTargets: ['earth', 'mars', 'europa'],
      scienceDescription: 'High-sensitivity triaxial fluxgate sensors mounted on an isolating deployable boom to measure planetary magnetic fields, solar wind reconnection, and induced oceanic currents.',
      primaryObjectiveIds: ['induced_magnetic_dipole', 'crustal_magnetism']
    },

    atmosphere_sounder: {
      id: 'atmosphere_sounder',
      name: 'Atmospheric Gas & Climate Column Sounder',
      heritage: 'OCO-2 (Orbiting Carbon Observatory) / AIRS / MCS',
      massKg: 30,
      powerWatts: 52,
      dataRateMbps: 4.0,
      thermalMinC: -30,
      thermalMaxC: 50,
      radToleranceKrad: 35,
      costMillions: 40,
      compatibleTargets: ['earth', 'mars'],
      scienceDescription: 'Grating spectrometers that detect high-resolution absorption lines of carbon dioxide, methane, water vapor, and dust aerosol opacity across atmospheric columns.',
      primaryObjectiveIds: ['co2_plumes', 'dust_storm_dynamics']
    },

    mass_spectrometer: {
      id: 'mass_spectrometer',
      name: 'Neutral Gas & Ion Mass Spectrometer',
      heritage: 'MASPEX (Europa Clipper) / SAM (Curiosity) / INMS (Cassini)',
      massKg: 26,
      powerWatts: 68,
      dataRateMbps: 0.9,
      thermalMinC: -40,
      thermalMaxC: 50,
      radToleranceKrad: 150,
      costMillions: 55,
      compatibleTargets: ['earth', 'mars', 'europa'],
      scienceDescription: 'Time-of-flight mass spectrometer with ultra-high mass resolution to sniff trace organic compounds, volatile outgassing, and isotopic ratios (e.g. Deuterium/Hydrogen, 12C/13C).',
      primaryObjectiveIds: ['water_plume_volatiles']
    }
  },

  // Spacecraft Subsystems Catalog
  subsystems: {
    // 1. Bus Structure & Class
    bus: {
      smallsat: {
        id: 'smallsat',
        name: 'SmallSat / ESPA-Class Bus',
        category: 'bus',
        dryMassKg: 65,
        maxPayloadMassKg: 45,
        structuralVolumeM3: 0.35,
        costMillions: 18,
        description: 'Compact satellite bus suited for focused secondary payloads and technology demonstrators.'
      },
      discovery_medium: {
        id: 'discovery_medium',
        name: 'Medium Discovery-Class Bus',
        category: 'bus',
        dryMassKg: 380,
        maxPayloadMassKg: 160,
        structuralVolumeM3: 2.2,
        costMillions: 125,
        description: 'Standard exploration-tier planetary spacecraft bus (e.g., Dawn, MAVEN, Kepler). Excellent balance of cost, payload capacity, and propulsion tank volume.'
      },
      flagship_heavy: {
        id: 'flagship_heavy',
        name: 'Heavy Deep-Space Flagship Bus',
        category: 'bus',
        dryMassKg: 1050,
        maxPayloadMassKg: 380,
        structuralVolumeM3: 5.8,
        costMillions: 340,
        description: 'Large, multi-instrument deep space bus (e.g., Europa Clipper, Cassini, Perseverance cruise stage) with high structural rigidity and large tankage.'
      }
    },

    // 2. Power Generation
    power: {
      silicon_pv: {
        id: 'silicon_pv',
        name: 'Rigid Silicon Solar Panels',
        category: 'power',
        type: 'solar',
        efficiency: 0.19, // 19%
        massKg: 25,
        areaM2: 4.5,
        basePowerWatts1AU: 600, // at 1 AU
        radToleranceKrad: 30,
        costMillions: 12,
        description: 'Economical solar arrays for LEO and Lunar missions. Degrades quickly under high radiation and loses output rapidly past 1.5 AU.'
      },
      gaas_ultraflex: {
        id: 'gaas_ultraflex',
        name: 'Gallium Arsenide (GaAs) UltraFlex Arrays',
        category: 'power',
        type: 'solar',
        efficiency: 0.32, // 32% triple-junction
        massKg: 42,
        areaM2: 12.0,
        basePowerWatts1AU: 1800, // at 1 AU
        radToleranceKrad: 90,
        costMillions: 38,
        description: 'High-efficiency deployable circular arrays. Outstanding power-to-weight ratio and radiation resilience.'
      },
      mmrtg_nuclear: {
        id: 'mmrtg_nuclear',
        name: 'Next-Gen Multi-Mission RTG (Pu-238)',
        category: 'power',
        type: 'nuclear',
        efficiency: 0.07, // Thermoelectric conversion
        massKg: 48,
        areaM2: 0.8,
        basePowerWatts1AU: 140, // Constant power everywhere!
        radToleranceKrad: 500, // Immune to radiation
        costMillions: 95,
        description: 'Radioisotope Thermoelectric Generator fueled by Plutonium-238 decay. Provides steady 140W heat and electrical power regardless of distance from Sun, shadow, or dust storms! High regulatory and cost hurdles.'
      }
    },

    // 3. Energy Storage (Batteries for Eclipse)
    batteries: {
      li_ion_small: {
        id: 'li_ion_small',
        name: 'Lithium-Ion Pack (400 Wh)',
        capacityWh: 400,
        massKg: 6,
        costMillions: 4,
        description: 'Lightweight battery suitable for brief Earth/Moon eclipses with low power loads.'
      },
      li_ion_medium: {
        id: 'li_ion_medium',
        name: 'Space-Grade Li-Ion Array (1,200 Wh)',
        capacityWh: 1200,
        massKg: 16,
        costMillions: 12,
        description: 'Balanced battery capacity with autonomous charge management and heater tape protection.'
      },
      li_ion_large: {
        id: 'li_ion_large',
        name: 'High-Capacity Deep-Cycle Pack (3,200 Wh)',
        capacityWh: 3200,
        massKg: 38,
        costMillions: 26,
        description: 'Heavy battery system capable of powering radar and communication transmitters throughout prolonged orbital eclipses.'
      }
    },

    // 4. Propulsion Systems
    propulsion: {
      monoprop_hydrazine: {
        id: 'monoprop_hydrazine',
        name: 'Hydrazine Monopropellant Thrusters',
        category: 'propulsion',
        ispSeconds: 225,
        engineMassKg: 14,
        thrustN: 22,
        tankCostMillions: 15,
        description: 'Catalytic decomposition of hydrazine. Simple, highly reliable, moderate specific impulse. Great for orbit trim and attitude control.'
      },
      biprop_mmh_nto: {
        id: 'biprop_mmh_nto',
        name: 'Bipropellant Main Engine (MMH / NTO)',
        category: 'propulsion',
        ispSeconds: 318,
        engineMassKg: 34,
        thrustN: 450,
        tankCostMillions: 35,
        description: 'Hypergolic bipropellant system (Monomethylhydrazine and Nitrogen Tetroxide). Aerospace standard for planetary orbital insertion and deep-space burns.'
      },
      electric_xenon_ion: {
        id: 'electric_xenon_ion',
        name: 'Solar Electric Propulsion (NEXT-C Xenon Ion)',
        category: 'propulsion',
        ispSeconds: 3200, // Spectacular fuel efficiency!
        engineMassKg: 48,
        thrustN: 0.24, // Very low thrust, requires long spiral burns and high electrical power (>1200W)
        powerReqWatts: 1100,
        tankCostMillions: 65,
        description: 'High-efficiency electrostatic ion thruster. Consumes tiny propellant mass for massive Delta-V, but requires high electrical power and long burn durations.'
      }
    },

    // 5. Thermal Control & Insulation
    thermal: {
      passive_mli: {
        id: 'passive_mli',
        name: 'Multi-Layer Insulation (MLI) Blankets',
        operatingRangeC: [-60, 110],
        massKg: 8,
        powerWatts: 0,
        costMillions: 5,
        description: 'Standard aluminized Mylar/Kapton layers preventing radiative heat loss and shielding against solar thermal glare.'
      },
      active_heaters_louvers: {
        id: 'active_heaters_louvers',
        name: 'Active Thermal Control (Louvers + Heat Pipes)',
        operatingRangeC: [-130, 130],
        massKg: 22,
        powerWatts: 28, // When heaters active
        costMillions: 16,
        description: 'Thermostatically modulated louvers, heat pipes, and electrical heater circuits to stabilize temperatures across Martian and Lunar extremes.'
      },
      cryo_deep_space_rhu: {
        id: 'cryo_deep_space_rhu',
        name: 'Deep-Space RHUs + Deployable Radiators',
        operatingRangeC: [-250, 150],
        massKg: 36,
        powerWatts: 5,
        costMillions: 32,
        description: 'Radioisotope Heater Units (RHU) emitting continuous 1W decay heat each, coupled with oversized deployable radiators. Essential for cryogenic lunar PSRs and Europa.'
      }
    },

    // 6. Radiation Shielding Vault
    shielding: {
      standard_aluminum: {
        id: 'standard_aluminum',
        name: 'Standard Aluminum Chassis (2.5 mm)',
        radShieldFactor: 1.0, // Base tolerance
        effectiveLimitKrad: 25,
        massKg: 10,
        costMillions: 4,
        description: 'Basic structural shielding sufficient for Low Earth Orbit and quick lunar flybys.'
      },
      enhanced_vault: {
        id: 'enhanced_vault',
        name: 'Enhanced Shielded Avionics Bay (5 mm Al + Kovar)',
        radShieldFactor: 3.5,
        effectiveLimitKrad: 85,
        massKg: 32,
        costMillions: 18,
        description: 'Thickened enclosures and spot shielding for sensitive detectors; standard for long-duration Mars orbital missions.'
      },
      tantalum_heavy_vault: {
        id: 'tantalum_heavy_vault',
        name: 'Heavy Tantalum/Aluminum Radiation Vault',
        radShieldFactor: 12.0,
        effectiveLimitKrad: 350,
        massKg: 95,
        costMillions: 45,
        description: 'Dense Tantalum-lined radiation bunker designed for the ferocious Jovian radiation belt around Europa.'
      }
    },

    // 7. Telecommunications & Antennas
    telecom: {
      low_gain_omni: {
        id: 'low_gain_omni',
        name: 'Low-Gain S-Band Patch Antennas (Omni)',
        band: 'S-band',
        baseBitrateLEOKbps: 2000,
        rangeScaleFactor: 0.05,
        gainDbi: 6,
        massKg: 4,
        powerWatts: 15,
        costMillions: 3,
        description: 'Broad beam with no pointing requirement. Highly resilient for emergency recovery, but low bandwidth over deep space.'
      },
      medium_gain_horn: {
        id: 'medium_gain_horn',
        name: 'Medium-Gain X-Band Horn Antenna',
        band: 'X-band',
        baseBitrateLEOKbps: 15000,
        rangeScaleFactor: 0.35,
        gainDbi: 18,
        massKg: 10,
        powerWatts: 30,
        costMillions: 10,
        description: 'Balanced directional horn for telecommands and moderate telemetry downlink at planetary distances.'
      },
      high_gain_parabolic: {
        id: 'high_gain_parabolic',
        name: '2.4m High-Gain Parabolic Dish (Ka/X-Band)',
        band: 'Ka/X-band',
        baseBitrateLEOKbps: 120000, // 120 Mbps at LEO
        rangeScaleFactor: 1.0, // High throughput to Deep Space Network
        gainDbi: 42,
        massKg: 28,
        powerWatts: 75,
        costMillions: 28,
        description: 'Motorized dual-axis steerable high-gain parabolic antenna. Enables high-speed transmission of radar echograms and high-resolution imaging to Deep Space Network.'
      },
      optical_laser_dsoc: {
        id: 'optical_laser_dsoc',
        name: 'Deep Space Optical Comms Laser (DSOC)',
        band: 'Infrared Laser (1550 nm)',
        baseBitrateLEOKbps: 650000, // Ultra-fast laser downlink
        rangeScaleFactor: 4.5,
        gainDbi: 65,
        massKg: 35,
        powerWatts: 110,
        costMillions: 55,
        description: 'Next-generation optical photon communications. 10x to 100x higher data rate than radio, but requires sub-microradian pointing accuracy.'
      }
    },

    // 8. Flight Computer & Avionics
    avionics: {
      commercial_rad_tolerant: {
        id: 'commercial_rad_tolerant',
        name: 'Single Rad-Tolerant Processor (16 GB Flash)',
        storageGb: 16,
        massKg: 6,
        powerWatts: 14,
        faultTolerance: 'Standard Single-String',
        costMillions: 10,
        description: 'Efficient onboard computer for low-risk missions. Sensitive to Single Event Upsets (SEU).'
      },
      dual_redundant_rad750: {
        id: 'dual_redundant_rad750',
        name: 'BAE RAD750 Dual-Redundant Core (128 GB Flash)',
        storageGb: 128,
        massKg: 16,
        powerWatts: 28,
        faultTolerance: 'Dual-String Hot Spare',
        costMillions: 32,
        description: 'The golden standard of deep space missions (MRO, Kepler, Curiosity). Radiation-hardened silicon with automatic failover.'
      },
      autonomous_tmr_core: {
        id: 'autonomous_tmr_core',
        name: 'Triple-Modular Redundant (TMR) Autonomy (512 GB)',
        storageGb: 512,
        massKg: 28,
        powerWatts: 45,
        faultTolerance: 'Triple-Modular Byzantine Fault Tolerant',
        costMillions: 65,
        description: 'Fault-tolerant computer with optical storage and onboard autonomy algorithms to handle deep-space communication delays without mission abort.'
      }
    }
  },

  // Launch Vehicle Catalog based on actual Launch Services data
  launchVehicles: {
    electron_smallsat: {
      id: 'electron_smallsat',
      name: 'Electron / Smallsat Dedicated Rocket',
      category: 'smallsat',
      maxPayloadLEOKg: 320,
      maxPayloadMoonKg: 45,
      maxPayloadMarsKg: 0, // Cannot reach Mars without external kick stage
      maxPayloadEuropaKg: 0,
      fairingDiameterM: 1.2,
      fairingHeightM: 2.5,
      costMillions: 12,
      reliabilityPct: 94,
      description: 'Dedicated rocket for CubeSats and SmallSats. Affordable, quick turnaround, but strictly limited to low mass payloads.'
    },

    falcon_9: {
      id: 'falcon_9',
      name: 'Falcon 9 Medium-Heavy Lifter',
      category: 'medium',
      maxPayloadLEOKg: 16500,
      maxPayloadMoonKg: 4200,
      maxPayloadMarsKg: 3100,
      maxPayloadEuropaKg: 650,
      fairingDiameterM: 5.2,
      fairingHeightM: 13.1,
      costMillions: 68,
      reliabilityPct: 99,
      description: 'Reliable workhorse for LEO and inner-solar system missions. High flight rate and competitive pricing.'
    },

    falcon_heavy: {
      id: 'falcon_heavy',
      name: 'Falcon Heavy Deep Space Lifter',
      category: 'heavy',
      maxPayloadLEOKg: 45000,
      maxPayloadMoonKg: 15500,
      maxPayloadMarsKg: 12800,
      maxPayloadEuropaKg: 3200,
      fairingDiameterM: 5.2,
      fairingHeightM: 13.1,
      costMillions: 135,
      reliabilityPct: 98,
      description: 'Triple-core heavy lift vehicle capable of sending heavy science orbiters directly to Mars or Europa with gravity assists.'
    },

    sls_block1: {
      id: 'sls_block1',
      name: 'SLS Block 1 Heavy Lifter Booster (SLS-X)',
      category: 'super_heavy',
      maxPayloadLEOKg: 95000,
      maxPayloadMoonKg: 27000,
      maxPayloadMarsKg: 21000,
      maxPayloadEuropaKg: 7500,
      fairingDiameterM: 8.4,
      fairingHeightM: 19.0,
      costMillions: 850,
      reliabilityPct: 99,
      description: 'Flagship super-heavy exploration rocket. Massive payload fairing and high characteristic energy (C3) for direct fast-transit deep space trajectories.'
    }
  },

  // Mission Classes & Budget Caps (Risk Classification)
  missionClasses: {
    cubesat_tech: {
      id: 'cubesat_tech',
      name: 'SmallSat / Tech Demo',
      budgetCapMillions: 50,
      riskTolerance: 'High Risk / High Innovation',
      targetScoreMultiplier: 1.3
    },
    discovery: {
      id: 'discovery',
      name: 'Discovery Program',
      budgetCapMillions: 500,
      riskTolerance: 'Moderate Risk / High Science Value',
      targetScoreMultiplier: 1.0
    },
    new_frontiers: {
      id: 'new_frontiers',
      name: 'New Frontiers Program',
      budgetCapMillions: 1000,
      riskTolerance: 'Low-to-Moderate Risk / High Priority Decadal Science',
      targetScoreMultiplier: 1.0
    },
    flagship: {
      id: 'flagship',
      name: 'Flagship Class',
      budgetCapMillions: 2500,
      riskTolerance: 'Very Low Risk / Transformative National Mission',
      targetScoreMultiplier: 0.9
    }
  },

  // Orbital Maneuver Requirements (Delta-V budget benchmarks in m/s)
  deltaVRequirements: {
    earth: {
      leoInsertion: 0, // Rocket upper stage places spacecraft directly in SSO
      orbitMaintenancePerYear: 25,
      deorbitReserve: 120,
      totalRecommended: 150
    },
    moon: {
      tliInjectionByRocket: true,
      lunarOrbitInsertionBurn: 850, // Delta-V to capture into 100km polar orbit
      stationKeepingPerYear: 90, // Counteracting lunar mascons
      totalRecommended: 1050
    },
    mars: {
      tmiInjectionByRocket: true,
      trajectoryCorrectionBurns: 120, // Cruise TCM-1, TCM-2, TCM-3
      marsOrbitInsertionBurn: 1150, // Retro-burn to capture into elliptical Mars orbit
      orbitCircularizationBurn: 450, // Lowering apoapsis to 320km science orbit
      totalRecommended: 1850
    },
    europa: {
      jovianInsertionBurn: 900,
      jupiterTourTransfers: 650, // Resonant flybys of Ganymede/Callisto
      europaFlybyTrims: 400,
      totalRecommended: 2100
    }
  },

  // Deep Space Network (DSN) ground station profiles
  dsnStations: [
    { name: 'Goldstone (California, USA)', coords: '35.4267° N, 116.8900° W', antennaDishDiameterM: 70 },
    { name: 'Madrid (Robledo de Chavela, Spain)', coords: '40.4314° N, 4.2480° W', antennaDishDiameterM: 70 },
    { name: 'Canberra (Tidbinbilla, Australia)', coords: '35.4014° S, 148.9817° E', antennaDishDiameterM: 70 }
  ]
};

// Export for browser access
if (typeof window !== 'undefined') {
  window.MISSION_DATA = MISSION_DATA;
}
