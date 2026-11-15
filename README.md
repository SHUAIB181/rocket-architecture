# Mission Architect

Design a spacecraft, pick a destination and launch vehicle, choose structural material, then watch a physics-based launch ascent play back like a video (record it as .webm). Built for a NASA hackathon.

## Run
- `npm start` then open http://localhost:8081  (or double-click `index.html`, or `python -m http.server 8081`)

## Structure
- `index.html` - app shell
- `css/styles.css` - minimal dark theme (single stylesheet)
- `js/mission-data.js` - destinations, instruments, subsystems, launch vehicles
- `js/systems-engine.js` - mass, delta-v, power, thermal, radiation, link budgets
- `js/launch-sim.js` - ascent physics + video-style player/recorder
- `js/simulation.js`, `visualizer.js`, `audio.js`, `app.js` - mission ops, graphics, sound, UI

## Data sources and honesty notes
Values are embedded (not fetched live). Public NASA references used:
- US Standard Atmosphere 1976 (NASA-TM-X-74335), simplified
- Earth gravitational parameter, radius and rotation rate (NASA Earth fact sheet / WGS-84)
- Sutton-Graves stagnation heating (NASA TR R-376); 1135 W/m2 fairing-jettison criterion
- Tsiolkovsky rocket equation (NASA Glenn Research Center rocket pages)
- Mission science facts from LRO, MRO/CRISM, MOLA, OCO-2, MODIS, Galileo and Europa Clipper public releases

Limits: launch vehicle masses/thrust are approximate public figures; structural-material mass factors are estimates; steering is simplified, so heavy payloads can fail where real rockets succeed. Please verify values before presenting them as NASA data. This project is not affiliated with or endorsed by NASA.

## New features
Toolbox (bottom-right): NASA live data (APOD, near-Earth objects, Perseverance photos), compare with a real mission, transfer-window planner, guided hints and challenges, 3D rocket view, shareable design link. Launch screen: live charts and a weather (wind) selector.

## Deploy free on GitHub Pages
1. Create a GitHub repository and push this project with its files at the repository root.
2. In Settings > Pages, set the source to **GitHub Actions**. The included Pages workflow deploys automatically whenever you push to `main`.
3. Open the published `https://USERNAME.github.io/REPO/` address and share it. The site is mobile-friendly, installable on supported devices, and caches the app shell for offline use after the first visit. Use the Toolbox > Share tab to share a design link that preserves its configuration.

See DEMO_SCRIPT.md for the video outline.

## AI Coach (optional)
The AI Coach opens automatically and checks whether the Gemini server is configured; it waits for the visitor to ask a question before sending anything. The built-in coach works offline for common questions and design troubleshooting. For full Gemini responses, use the Node server:

1. Install Node.js 18 or newer, then run `npm install` in this project folder.
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` to a key from Google AI Studio.
3. Run `npm start` and open http://localhost:8081.

The key stays on the server and is not sent to the browser. GitHub Pages serves only the static site, so it uses the offline coach there. To enable Gemini for a public site, host this Node app on a server and configure `GEMINI_API_KEY` there. Never commit `.env`.

### One-time public setup with Render
1. Push the project files, including `render.yaml`, to a GitHub repository.
2. In Render, choose **New > Blueprint** and connect that repository.
3. When prompted, enter your Gemini API key as `GEMINI_API_KEY`; Render stores it as a secret environment variable.
4. After deployment, share the Render URL. The hosted app and `/api/chat` backend use the same origin, so visitors do not need their own keys.

The site owner pays for Gemini usage. Set an appropriate usage limit in Google AI Studio before sharing publicly; the app's per-IP rate limit is not a total spending cap. Render's free service may also take a short time to wake after inactivity.

## Flow design and Blender animation
- `css/flow.css` + `js/flow.js`: drifting starfield, glowing mission-progress line, staggered reveals, cursor glow, animated hero rocket.
- Optional Blender render: install Blender, run `blender -b -P blender/rocket_flow.py`. It writes `assets/rocket_flow.mp4` (hero video, picked up automatically) and `assets/rocket.glb` (3D model). Delete the mp4 to return to the SVG hero.

## Gemini integration
The Coach sends JSON requests to the same-origin `/api/chat` endpoint. When the Node server has `GEMINI_API_KEY`, it uses Gemini; otherwise the built-in offline coach answers supported questions and can suggest design fixes. Do not put an API key in browser code or commit it to the repository.
