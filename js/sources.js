/** Data sources and honesty notes. Links were not checked from the build environment: verify before citing. */
window.SOURCES = [
  { topic: 'Atmosphere model', src: 'U.S. Standard Atmosphere, 1976 (NASA-TM-X-74335), simplified layers', url: 'https://ntrs.nasa.gov/' },
  { topic: 'Earth constants (GM, radius, rotation)', src: 'NASA Earth Fact Sheet', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html' },
  { topic: 'Planet constants for travel budgets', src: 'NASA Planetary Fact Sheets', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/' },
  { topic: 'Rocket equation and thrust', src: 'NASA Glenn Research Center, Beginner\'s Guide to Rockets', url: 'https://www.grc.nasa.gov/www/k-12/rocket/' },
  { topic: 'Nose heating (Sutton-Graves)', src: 'Sutton & Graves, NASA TR R-376 (1971); fairing drop at 1135 W/m2', url: 'https://ntrs.nasa.gov/' },
  { topic: 'Falcon 9 / Falcon Heavy', src: 'SpaceX vehicle pages and payload user\'s guide', url: 'https://www.spacex.com/vehicles/falcon-9/' },
  { topic: 'Electron', src: 'Rocket Lab Electron payload user\'s guide', url: 'https://www.rocketlabusa.com/' },
  { topic: 'SLS Block 1', src: 'NASA SLS reference guide and fact sheet', url: 'https://www.nasa.gov/sls/' },
  { topic: 'Real-mission comparisons', src: 'NASA mission pages: MAVEN, LRO, Europa Clipper, Landsat 9', url: 'https://science.nasa.gov/' },
  { topic: 'Ephemerides (not yet integrated)', src: 'NASA JPL Horizons System', url: 'https://ssd.jpl.nasa.gov/horizons/' }];
window.SOURCE_NOTES = [
  'Vehicle masses, thrust and Isp are approximate public figures entered by hand, not read from the sources above.',
  'Steering was tuned so simulated payload capacity is near published values (Electron ~0.3 t, Falcon 9 ~22 t, Falcon Heavy ~41 t reusable-class, SLS ~95 t to low Earth orbit). That is calibration, not independent validation.',
  'Structural-material mass factors, launch-reliability numbers and failure rates in the risk analysis are stated assumptions.',
  'Launch windows use a circular-orbit model good to within weeks; real planning needs full ephemerides.',
  'This project is not affiliated with or endorsed by NASA, SpaceX, Rocket Lab or any agency.'];
