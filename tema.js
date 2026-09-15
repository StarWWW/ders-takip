// Tema, ilk boyamadan önce uygulanır (yanıp sönmeyi önler)
try {
  var s = JSON.parse(localStorage.getItem('dersTakip.v1') || '{}');
  var t = s.settings && s.settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
} catch (e) { /* depolama kapalı */ }
