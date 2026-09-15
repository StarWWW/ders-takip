/* Kilit ekranı: veri.enc.json dosyasını tarayıcıda (WebCrypto) çözer, ardından uygulamayı başlatır.
 * Şifreleme: AES-256-GCM, anahtar PBKDF2-SHA256 ile şifreden türetilir (araclar/sifrele.py ile uyumlu).
 * Şifre hiçbir yere gönderilmez; "Bu cihazda açık kalsın" seçilirse yalnızca türetilmiş anahtar bu tarayıcıda saklanır.
 */
(function () {
  const KEY_STORE = 'dersTakip.anahtar';
  const APP_SCRIPTS = ['core.js', 'views.js', 'esitle.js', 'app.js'];
  const VERSION = document.currentScript.src.split('?')[1] || '';
  const $ = (s) => document.querySelector(s);

  const b64d = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const b64e = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));

  function loadScript(src) {
    return new Promise((res, rej) => {
      const el = document.createElement('script');
      el.src = VERSION ? `${src}?${VERSION}` : src;
      el.onload = res;
      el.onerror = () => rej(new Error(`${src} yüklenemedi`));
      document.body.appendChild(el);
    });
  }

  async function boot(data, key) {
    if (!data || !Array.isArray(data.courses) || !Array.isArray(data.transcript)) throw new Error('Veri biçimi geçersiz');
    window.STUDENT = data.student || { firstName: '' };
    window.COURSES = data.courses;
    window.TRANSCRIPT = data.transcript;
    window.DATA_SECTIONS = data.sections || null;
    window.SYNC_CONFIG = data.sync || null;
    window.TAKVIM = data.takvim || null;
    window.KURALLAR = data.kurallar || {};
    window.KAYNAKLAR = data.kaynaklar || [];
    window.UNIVERSITE = data.universite || null;
    window.MUFREDAT_YARIYIL = data.mufredatYariyil || {};
    window.DERS_NOTLARI = data.dersNotlari || {};
    window.DATA_KEY = key || null; // eşitleme verisini şifrelemek için (dışarı aktarılamaz CryptoKey)
    $('#lock').hidden = true;
    $('#app').hidden = false;
    for (const s of APP_SCRIPTS) await loadScript(s);
  }

  async function deriveKey(password, enc, extractable) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt: b64d(enc.salt), iterations: enc.iter },
      base, { name: 'AES-GCM', length: 256 }, extractable, ['encrypt', 'decrypt'],
    );
  }
  async function decrypt(enc, key) {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(enc.iv) }, key, b64d(enc.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }

  function showLock(enc, message) {
    const form = $('#lockForm'), pw = $('#lockPw'), btn = $('#lockBtn'), err = $('#lockErr');
    $('#lock').hidden = false;
    if (message) { err.textContent = message; err.hidden = false; }
    pw.focus();
    pw.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !btn.disabled) { e.preventDefault(); form.requestSubmit(); }
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!pw.value) return;
      err.hidden = true;
      btn.disabled = true; btn.textContent = 'Açılıyor…';
      const remember = $('#lockRemember').checked;
      try {
        const key = await deriveKey(pw.value, enc, remember);
        const data = await decrypt(enc, key);
        if (remember) {
          const raw = await crypto.subtle.exportKey('raw', key);
          try { localStorage.setItem(KEY_STORE, JSON.stringify({ salt: enc.salt, k: b64e(raw) })); } catch (x) { /* depolama kapalı */ }
        }
        pw.value = '';
        await boot(data, key);
      } catch (x) {
        btn.disabled = false; btn.textContent = 'Kilidi aç';
        err.textContent = x && x.name === 'OperationError' ? 'Şifre yanlış. Tekrar dene.' : `Açılamadı: ${x.message || x}`;
        err.hidden = false;
        pw.select();
      }
    });
  }

  async function start() {
    const params = new URLSearchParams(location.search);
    const local = location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(location.hostname);

    // Yerel geliştirme: ozel/veri.js varsa şifresiz aç (?kilit=1 ile şifreli akış denenebilir)
    if (local && params.get('kilit') !== '1') {
      try {
        await loadScript('ozel/veri.js');
        if (window.VERI) {
          // ?esitlemetest=1 → yalnızca yerelde, rastgele geçici anahtarla eşitleme akışını denemek için
          const devKey = params.get('esitlemetest') === '1'
            ? await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']) : null;
          await boot(window.VERI, devKey);
          return;
        }
      } catch (x) { /* yerel veri yok, şifreli akışa geç */ }
    }

    if (!window.crypto || !crypto.subtle) {
      $('#lock').hidden = false;
      $('#lockErr').textContent = 'Bu tarayıcı güvenli şifre çözmeyi desteklemiyor (HTTPS gerekli).';
      $('#lockErr').hidden = false;
      $('#lockForm').hidden = true;
      return;
    }

    let enc;
    try {
      const r = await fetch('veri.enc.json', { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status);
      enc = await r.json();
    } catch (x) {
      $('#lock').hidden = false;
      $('#lockForm').hidden = true;
      $('#lockErr').textContent = 'Şifreli veri dosyası bulunamadı. (araclar/sifrele.py ile oluşturup yükle.)';
      $('#lockErr').hidden = false;
      return;
    }

    // Kayıtlı anahtar varsa şifre sormadan aç
    try {
      const saved = JSON.parse(localStorage.getItem(KEY_STORE) || 'null');
      if (saved && saved.salt === enc.salt) {
        const key = await crypto.subtle.importKey('raw', b64d(saved.k), 'AES-GCM', false, ['encrypt', 'decrypt']);
        const data = await decrypt(enc, key);
        await boot(data, key);
        return;
      }
      if (saved) localStorage.removeItem(KEY_STORE);
    } catch (x) {
      try { localStorage.removeItem(KEY_STORE); } catch (y) { /* yok say */ }
    }
    showLock(enc);
  }

  // Uygulama içinden "Kilitle"
  window.lockApp = function () {
    try { localStorage.removeItem(KEY_STORE); localStorage.removeItem('dersTakip.erisim'); } catch (x) { /* yok say */ }
    location.reload();
  };
  window.hasRememberedKey = function () {
    try { return !!localStorage.getItem(KEY_STORE); } catch (x) { return false; }
  };

  // "Ana ekrana ekle" istemi kilit ekranındayken de gelebilir; sakla, uygulama kendi düğmesiyle gösterir
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.installPrompt = e;
    window.dispatchEvent(new Event('kurulabilir'));
  });

  // İnternetsiz açılış için servis çalışanı (yerel dosya modunda desteklenmez)
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* desteklenmiyor: normal çalışmaya devam */ });
    });
  }

  start();
})();
