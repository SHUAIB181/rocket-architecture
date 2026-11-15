/** Reliability + accessibility helpers: friendly error toast, ARIA labels, skip link, offline service worker. */
(function () {
  const live = Object.assign(document.createElement('div'), { id: 'guard-toast', role: 'status' }); live.setAttribute('aria-live', 'polite'); let last = 0;
  const show = msg => { const n = Date.now(); if (n - last < 10000) return; last = n; live.textContent = msg; live.classList.add('on'); setTimeout(() => live.classList.remove('on'), 6000); };
  const ours = f => !f || f.indexOf(location.origin) === 0 || location.protocol === 'file:';
  addEventListener('error', e => { if (ours(e.filename)) show('Something went wrong. Your design is safe. If a feature stops responding, refresh the page (Ctrl+F5).'); });
  addEventListener('unhandledrejection', () => show('A background request failed. The simulator keeps working offline.'));
  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(live);
    const skip = Object.assign(document.createElement('a'), { href: '#view-briefing', className: 'skip-link', textContent: 'Skip to content' }); document.body.prepend(skip);
    document.querySelectorAll('canvas').forEach(c => { if (!c.hasAttribute('aria-label')) { c.setAttribute('role', 'img'); c.setAttribute('aria-label', ({ 'launch-canvas': 'Rocket launch animation', 'ls-chart': 'Launch telemetry charts' })[c.id] || 'Simulation graphic: ' + (c.id || 'canvas')); } });
    document.querySelectorAll('button').forEach(b => { if (!b.textContent.trim() && !b.getAttribute('aria-label')) b.setAttribute('aria-label', b.title || 'Button'); });
    const tabs = [...document.querySelectorAll('.nav-tab')], nav = tabs[0] && tabs[0].parentElement; if (nav) nav.setAttribute('role', 'tablist');
    const sync = () => tabs.forEach(t => { t.setAttribute('role', 'tab'); t.setAttribute('aria-selected', t.classList.contains('active')); }); sync();
    tabs.forEach(t => new MutationObserver(sync).observe(t, { attributes: true, attributeFilter: ['class'] }));
    document.querySelectorAll('.view-section').forEach(s => s.setAttribute('role', 'tabpanel'));
    const f = document.getElementById('foot-src'); if (f) f.onclick = () => window.ToolboxAPI && window.ToolboxAPI.open('sources');
  });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
