// Başka bir sitenin içine çerçevelenmeyi engelle (tıklama hırsızlığına karşı)
try {
  if (window.top !== window.self) {
    document.documentElement.innerHTML = '';
    window.top.location = window.self.location.href;
  }
} catch (e) {
  document.documentElement.innerHTML = '<p style="font-family:sans-serif;padding:24px">Bu sayfa başka bir sitenin içinde açılamaz.</p>';
}

// Tema, ilk boyamadan önce uygulanır (yanıp sönmeyi önler); bu cihazda en son açılan hesabın ayarı kullanılır
try {
  var d = localStorage.getItem('dersTakip.aktif') || 'dersTakip';
  if (!/^[A-Za-z][\w.-]{0,40}$/.test(d)) d = 'dersTakip';
  var s = JSON.parse(localStorage.getItem(d + '.v1') || '{}');
  var t = s.settings && s.settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
} catch (e) { /* depolama kapalı */ }
