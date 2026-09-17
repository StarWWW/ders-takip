/* Kilit ekranı: girilen şifreyle açılabilen hesabı bulur, o hesabın şifreli verisini tarayıcıda (WebCrypto) çözer
 * ve uygulamayı başlatır.
 *
 * - hesaplar.json yalnızca rastgele hesap kimliklerini, dosya adlarını, PBKDF2 tuzunu ve bir doğrulama bloğunu içerir;
 *   isim ya da kişisel bilgi içermez. Doğrulama bloğu hesabın anahtarıyla şifrelenmiş sabit bir metindir.
 * - Şifreleme: AES-256-GCM, anahtar PBKDF2-SHA256 ile şifreden türetilir (araclar/sifrele.py ile uyumlu).
 * - Şifre hiçbir yere gönderilmez; "Bu cihazda açık kalsın" seçilirse yalnızca türetilmiş anahtar bu tarayıcıda saklanır.
 */
(function () {
  const KEY_STORE = 'dersTakip.anahtar';
  const ACTIVE_STORE = 'dersTakip.aktif'; // son açılan hesabın depolama öneki (tema ilk boyamada buradan okunur)
  const APP_SCRIPTS = ['core.js', 'views.js', 'esitle.js', 'app.js'];
  const VERSION = document.currentScript.src.split('?')[1] || '';
  const CHECK_PREFIX = 'ders-takip-hesap:';
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

  const depoOf = (acc) => (typeof acc.depo === 'string' && /^[A-Za-z][\w.-]{0,40}$/.test(acc.depo) ? acc.depo : `dersTakip.${acc.id}`);

  async function boot(data, key, acc) {
    if (!data || !Array.isArray(data.courses) || !Array.isArray(data.transcript)) throw new Error('Veri biçimi geçersiz');
    window.HESAP = { id: acc.id, depo: depoOf(acc) };
    try { localStorage.setItem(ACTIVE_STORE, window.HESAP.depo); } catch (x) { /* depolama kapalı */ }
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

  async function deriveKey(password, salt, iter, extractable) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt: b64d(salt), iterations: iter },
      base, { name: 'AES-GCM', length: 256 }, extractable, ['encrypt', 'decrypt'],
    );
  }
  async function decryptRaw(enc, key) {
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(enc.iv) }, key, b64d(enc.ct)));
  }
  async function decryptJson(enc, key) {
    return JSON.parse(new TextDecoder().decode(await decryptRaw(enc, key)));
  }
  // Anahtar bu hesaba mı ait? (doğrulama bloğu çözülüp hesabın kimliğini veriyorsa)
  async function keyFits(acc, key) {
    try { return new TextDecoder().decode(await decryptRaw(acc.kontrol, key)) === CHECK_PREFIX + acc.id; } catch (x) { return false; }
  }
  async function fetchJson(url) {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(`${url} alınamadı (${r.status})`);
    return r.json();
  }
  async function openAccount(acc, key) {
    const enc = await fetchJson(acc.dosya);
    await boot(await decryptJson(enc, key), key, acc);
  }

  function lockMessage(text) {
    $('#app').hidden = true;
    $('#lock').hidden = false;
    $('#lockForm').hidden = true;
    $('#lockErr').textContent = text;
    $('#lockErr').hidden = false;
  }

  function showLock(accounts, message) {
    const form = $('#lockForm'), pw = $('#lockPw'), btn = $('#lockBtn'), err = $('#lockErr');
    $('#lock').hidden = false;
    if (message) { err.textContent = message; err.hidden = false; }
    pw.focus();
    pw.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !btn.disabled) { e.preventDefault(); form.requestSubmit(); }
    });
    // Aynı tuzu kullanan hesaplar için anahtar bir kez türetilir
    const groups = new Map();
    for (const acc of accounts) {
      const g = `${acc.salt}|${acc.iter}`;
      if (!groups.has(g)) groups.set(g, { salt: acc.salt, iter: acc.iter, accounts: [] });
      groups.get(g).accounts.push(acc);
    }
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!pw.value) return;
      err.hidden = true;
      btn.disabled = true; btn.textContent = 'Açılıyor…';
      const remember = $('#lockRemember').checked;
      let opened = false;
      try {
        const list = [...groups.values()];
        const keys = await Promise.all(list.map((g) => deriveKey(pw.value, g.salt, g.iter, remember)));
        let found = null;
        for (let i = 0; i < list.length && !found; i++) {
          for (const acc of list[i].accounts) if (await keyFits(acc, keys[i])) { found = { acc, key: keys[i] }; break; }
        }
        if (!found) throw Object.assign(new Error('Şifre yanlış. Tekrar dene.'), { wrong: true });
        if (remember) {
          const raw = await crypto.subtle.exportKey('raw', found.key);
          try { localStorage.setItem(KEY_STORE, JSON.stringify({ hesap: found.acc.id, salt: found.acc.salt, k: b64e(raw) })); } catch (x) { /* depolama kapalı */ }
        }
        pw.value = '';
        opened = true;
        await openAccount(found.acc, found.key);
      } catch (x) {
        if (opened) { try { localStorage.removeItem(KEY_STORE); } catch (y) { /* yok say */ } }
        btn.disabled = false; btn.textContent = 'Kilidi aç';
        err.textContent = x.wrong ? x.message : `Açılamadı: ${x.message || x}`;
        err.hidden = false;
        pw.select();
      }
    });
  }

  async function start() {
    const params = new URLSearchParams(location.search);
    const local = location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(location.hostname);

    // Yerel geliştirme: ozel/<hesap>/veri.js varsa şifresiz aç (?hesap=ad ile hesap seçilir, ?kilit=1 ile şifreli akış denenir)
    if (local && params.get('kilit') !== '1') {
      try {
        const list = await fetchJson('ozel/hesaplar.json');
        const names = Object.keys(list).filter((n) => !n.startsWith('_'));
        const name = names.includes(params.get('hesap')) ? params.get('hesap') : names[0];
        await loadScript(`ozel/${name}/veri.js`);
        if (window.VERI) {
          // ?esitlemetest=1 → yalnızca yerelde, rastgele geçici anahtarla eşitleme akışını denemek için
          const devKey = params.get('esitlemetest') === '1'
            ? await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']) : null;
          await boot(window.VERI, devKey, { id: list[name].id, depo: list[name].depo });
          return;
        }
      } catch (x) { /* yerel veri yok, şifreli akışa geç */ }
    }

    if (!window.crypto || !crypto.subtle) {
      lockMessage('Bu tarayıcı güvenli şifre çözmeyi desteklemiyor (HTTPS gerekli).');
      return;
    }

    let accounts;
    try {
      const index = await fetchJson('hesaplar.json');
      accounts = (index.hesaplar || []).filter((a) => a && /^[a-z0-9]{6,32}$/.test(a.id) && /^veri\/[a-z0-9]{6,32}\.enc\.json$/.test(a.dosya)
        && typeof a.salt === 'string' && Number(a.iter) >= 100000 && a.kontrol?.iv && a.kontrol?.ct);
      if (!accounts.length) throw new Error('boş');
    } catch (x) {
      lockMessage('Hesap listesi bulunamadı. İnternet bağlantını kontrol edip sayfayı yenile.');
      return;
    }

    // Kayıtlı anahtar varsa şifre sormadan aç (eski sürümün kaydında hesap kimliği yoktur; tuz ve doğrulama bloğuyla eşleştirilir)
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY_STORE) || 'null'); } catch (x) { saved = null; }
    if (saved && saved.k) {
      let key = null, match = null;
      try { key = await crypto.subtle.importKey('raw', b64d(saved.k), 'AES-GCM', false, ['encrypt', 'decrypt']); } catch (x) { key = null; }
      if (key) {
        const candidates = accounts.filter((a) => a.salt === saved.salt).sort((a, b) => (b.id === saved.hesap) - (a.id === saved.hesap));
        for (const acc of candidates) if (await keyFits(acc, key)) { match = acc; break; }
      }
      if (match) {
        if (saved.hesap !== match.id) {
          try { localStorage.setItem(KEY_STORE, JSON.stringify({ hesap: match.id, salt: match.salt, k: saved.k })); } catch (x) { /* yok say */ }
        }
        // Veri alınamazsa (ör. internetsiz ve önbellekte yok) kayıtlı anahtar silinmez
        try { await openAccount(match, key); } catch (x) { lockMessage(`Açılamadı: ${x.message || x}. İnternet bağlantını kontrol edip sayfayı yenile.`); }
        return;
      }
      try { localStorage.removeItem(KEY_STORE); } catch (x) { /* şifre değişmiş ya da hesap kaldırılmış */ }
    }
    showLock(accounts);
  }

  // Uygulama içinden "Kilitle": bu cihazdaki anahtar ve erişim anahtarı kopyası silinir
  window.lockApp = function () {
    try {
      localStorage.removeItem(KEY_STORE);
      if (window.HESAP) localStorage.removeItem(`${window.HESAP.depo}.erisim`);
    } catch (x) { /* yok say */ }
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
