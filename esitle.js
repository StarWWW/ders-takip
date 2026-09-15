/* Cihazlar arası otomatik eşitleme (GitHub Gist).
 *
 * - Gizli Gist'te iki dosya: durum.enc.json (kayıtlar) ve erisim.enc.json (GitHub erişim anahtarı).
 * - İkisi de site şifresinden türetilen AES-256-GCM anahtarıyla şifrelenir; Gist'i gören biri içeriği okuyamaz.
 * - Erişim anahtarı bir kez girilir; şifreli hâli Gist'e konur, diğer cihazlar kilidi açınca otomatik alır.
 * - Birleştirme core.js'deki mergeRemote ile anahtar bazında "en yeni kazanır" mantığıyla yapılır.
 */
const Sync = (() => {
  const API = 'https://api.github.com';
  const STATE_FILE = 'durum.enc.json';
  const TOKEN_FILE = 'erisim.enc.json';
  const TOKEN_STORE = 'dersTakip.erisim';
  const cfg = window.SYNC_CONFIG && /^[0-9a-f]{20,40}$/i.test(window.SYNC_CONFIG.gistId || '') ? window.SYNC_CONFIG : null;
  const key = window.DATA_KEY || null;

  let token = null;
  let status = !cfg ? 'yok' : !key ? 'yerel' : 'baslatiliyor';
  let lastSync = null, lastError = '', busy = false, again = false, pushTimer = null, pollTimer = null;
  const listeners = new Set();

  const b64d = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const b64e = (buf) => {
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  };
  async function encrypt(obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(obj)));
    return { v: 1, iv: b64e(iv), ct: b64e(ct) };
  }
  async function decrypt(blob) {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(blob.iv) }, key, b64d(blob.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }

  function setStatus(s, err = '') {
    status = s; lastError = err;
    listeners.forEach((fn) => { try { fn(); } catch (e) { /* yok say */ } });
  }

  async function api(path, { method = 'GET', body, auth = true } = {}) {
    const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    if (body) headers['Content-Type'] = 'application/json';
    const r = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
    if (!r.ok) {
      const e = new Error(r.status === 401 ? 'Erişim anahtarı geçersiz ya da süresi dolmuş' : r.status === 403 || r.status === 429 ? 'GitHub isteği reddetti (izin ya da istek sınırı)' : r.status === 404 ? 'Eşitleme kaydı bulunamadı ya da anahtarın Gist izni yok' : `GitHub hatası (${r.status})`);
      e.status = r.status;
      throw e;
    }
    return r.status === 204 ? null : r.json();
  }
  async function fileContent(f) {
    if (!f) return null;
    if (!f.truncated) return f.content;
    const r = await fetch(f.raw_url, { cache: 'no-store' });
    return r.ok ? r.text() : null;
  }
  const getGist = (auth = true) => api(`/gists/${cfg.gistId}`, { auth });
  const parseBlob = (text) => { try { const j = JSON.parse(text); return j && j.iv && j.ct ? j : null; } catch (e) { return null; } };

  async function loadToken(gist) {
    try {
      const local = parseBlob(localStorage.getItem(TOKEN_STORE));
      if (local) { token = (await decrypt(local)).t; return true; }
    } catch (e) { try { localStorage.removeItem(TOKEN_STORE); } catch (x) { /* yok say */ } }
    const blob = parseBlob(await fileContent(gist.files[TOKEN_FILE]));
    if (!blob) return false;
    try {
      token = (await decrypt(blob)).t;
      localStorage.setItem(TOKEN_STORE, JSON.stringify(blob));
      return true;
    } catch (e) { return false; }
  }

  async function push(extraFiles = {}) {
    const blob = await encrypt(syncSnapshot());
    await api(`/gists/${cfg.gistId}`, { method: 'PATCH', body: { files: { [STATE_FILE]: { content: JSON.stringify(blob) }, ...extraFiles } } });
  }

  async function run() {
    if (!cfg || !key) return;
    if (busy) { again = true; return; }
    busy = true;
    setStatus('esitleniyor');
    try {
      const gist = await getGist(!!token);
      if (!token) await loadToken(gist);
      const text = await fileContent(gist.files[STATE_FILE]);
      const blob = parseBlob(text);
      let result = { changedLocal: false, needPush: Object.keys(syncMeta).length > 0 };
      if (blob) {
        try { result = mergeRemote(await decrypt(blob)); }
        catch (e) { result = { changedLocal: false, needPush: true }; } // eski şifreyle yazılmış: bu cihazın verisiyle yenile
      }
      if (result.changedLocal && typeof refresh === 'function') refresh();
      if (result.needPush && token) await push();
      lastSync = Date.now();
      setStatus(token ? 'acik' : 'kurulum');
    } catch (e) {
      if (e.status === 401 && token) {
        token = null;
        try { localStorage.removeItem(TOKEN_STORE); } catch (x) { /* yok say */ }
      }
      setStatus('hata', e.message || String(e));
    } finally {
      busy = false;
      if (again) { again = false; run(); }
    }
  }

  function schedulePush() {
    if (!cfg || !key || !token) return;
    clearTimeout(pushTimer);
    setStatus('bekliyor');
    pushTimer = setTimeout(run, 2500);
  }

  async function setup(newToken) {
    if (!cfg || !key) throw new Error('Eşitleme bu modda kullanılamaz');
    const t = String(newToken || '').trim();
    if (!/^(github_pat_|ghp_|gho_)[A-Za-z0-9_]{20,}$/.test(t)) throw new Error('Bu bir GitHub erişim anahtarına benzemiyor');
    const prev = token;
    token = t;
    try {
      await getGist(true); // okuma izni
      const tokenBlob = await encrypt({ t });
      await push({ [TOKEN_FILE]: { content: JSON.stringify(tokenBlob) } }); // yazma izni + anahtarı paylaş
      localStorage.setItem(TOKEN_STORE, JSON.stringify(tokenBlob));
    } catch (e) {
      token = prev;
      throw e;
    }
    await run();
  }

  function forgetDevice() {
    token = null;
    try { localStorage.removeItem(TOKEN_STORE); } catch (e) { /* yok say */ }
    setStatus(cfg && key ? 'kurulum' : status);
  }

  async function disableEverywhere() {
    if (!token) throw new Error('Önce eşitlemenin açık olması gerekir');
    await api(`/gists/${cfg.gistId}`, { method: 'PATCH', body: { files: { [TOKEN_FILE]: null } } });
    forgetDevice();
  }

  function start() {
    if (!cfg || !key) { setStatus(status); return; }
    window.onLocalChange = schedulePush;
    run();
    const poll = () => { if (document.visibilityState === 'visible' && token) run(); };
    document.addEventListener('visibilitychange', poll);
    window.addEventListener('online', poll);
    pollTimer = setInterval(poll, 60000);
    // Sayfadan çıkarken bekleyen değişikliği gönder
    window.addEventListener('pagehide', () => { if (pushTimer && token) { clearTimeout(pushTimer); run(); } });
  }

  return {
    start, run, setup, forgetDevice, disableEverywhere,
    onChange: (fn) => listeners.add(fn),
    get info() { return { status, lastSync, lastError, hasToken: !!token, available: !!(cfg && key), configured: !!cfg }; },
  };
})();
