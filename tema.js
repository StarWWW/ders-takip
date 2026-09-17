// Tema, ilk boyamadan önce uygulanır (yanıp sönmeyi önler); bu cihazda en son açılan hesabın ayarı kullanılır
try {
  var d = localStorage.getItem('dersTakip.aktif') || 'dersTakip';
  if (!/^[A-Za-z][\w.-]{0,40}$/.test(d)) d = 'dersTakip';
  var s = JSON.parse(localStorage.getItem(d + '.v1') || '{}');
  var t = s.settings && s.settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
} catch (e) { /* depolama kapalı */ }
