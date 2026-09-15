/* ============ İkonlar (Lucide tarzı, inline SVG) ============ */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  tasks: '<rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4M13 6h8M13 12h8M13 18h8"/>',
  cap: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  sparkles: '<path d="m12 3-1.9 5.8L4 10.7l6.1 1.9L12 18.5l1.9-5.9 6.1-1.9-6.1-1.9z"/><path d="M19 3v4M17 5h4"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  flask: '<path d="M9 3h6M10 3v6.5L4.5 19A1.5 1.5 0 0 0 5.8 21h12.4a1.5 1.5 0 0 0 1.3-2L14 9.5V3"/><path d="M7 15h10"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  coffee: '<path d="M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M6 2v2M10 2v2M14 2v2"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  minus: '<path d="M5 12h14"/>',
  note: '<path d="M15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9z"/><path d="M15 3v6h6"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  cloudOff: '<path d="m2 2 20 20"/><path d="M5.78 5.78A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.31-.2"/><path d="M21.53 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7 7 0 0 0 10.12 5.2"/>',
  refresh: '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>',
  external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
};
const icon = (n, cls = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" class="${cls}">${ICONS[n] || ''}</svg>`;

/* ============ Yardımcılar ============ */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt2 = (n) => (n == null || isNaN(n) ? '—' : n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fmt1 = (n) => (n == null || isNaN(n) ? '—' : n.toLocaleString('tr-TR', { maximumFractionDigits: 1 }));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const courseByCode = Object.fromEntries(COURSES.map((c) => [c.code, c]));
const needsAttendance = (c) => c.alis !== 'Alttan';
const secKeys = (c) => Object.keys(c.sections);
const hasSections = (c) => secKeys(c).length > 1;
const cstyle = (c) => `--h:${c.hue}`;
const timeRange = (s) => `${SLOTS[s.from][0]}–${SLOTS[s.to][1]}`;
const hoursOf = (s) => s.to - s.from + 1;

/* ============ Zaman ============ */
// Test için: ?now=2026-09-22T10:30
const NOW_OVERRIDE = (() => {
  const p = new URLSearchParams(location.search).get('now');
  if (!p) return null;
  const d = new Date(p);
  return isNaN(d) ? null : d.getTime() - Date.now();
})();
const now = () => new Date(Date.now() + (NOW_OVERRIDE || 0));
const dayIdx = (d) => (d.getDay() + 6) % 7; // Pazartesi=0
const minutesOfDay = (d) => d.getHours() * 60 + d.getMinutes();
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const parseDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
const fmtDate = (d, opts) => new Intl.DateTimeFormat('tr-TR', opts).format(d);

function semesterStart() {
  const d = parseDate(state.settings.start);
  return addDays(d, -dayIdx(d)); // o haftanın pazartesisi
}
function weekOf(date) {
  const diff = daysBetween(semesterStart(), date);
  return Math.floor(diff / 7) + 1;
}
function dateOfWeekDay(week, d) { return addDays(semesterStart(), (week - 1) * 7 + d); }
function relDay(dateStr) {
  const n = daysBetween(now(), parseDate(dateStr));
  if (n === 0) return 'Bugün';
  if (n === 1) return 'Yarın';
  if (n === -1) return 'Dün';
  if (n < 0) return `${-n} gün geçti`;
  if (n < 7) return `${n} gün kaldı`;
  return fmtDate(parseDate(dateStr), { day: 'numeric', month: 'short' });
}
const durText = (min) => {
  if (min < 60) return `${min} dk`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} sa ${m} dk` : `${h} sa`;
};

/* ============ Durum ============ */
const STORE_KEY = 'dersTakip.v1';
const TASK_TYPES = ['Ödev', 'Vize', 'Final', 'Quiz', 'Proje', 'Sunum', 'Diğer'];
const DEFAULT_SETTINGS = {
  start: '2026-09-14', weeks: 14, vizeW: 40, theoryLimit: 30, labLimit: 20, theme: 'system',
  scale: [90, 85, 80, 75, 70, 60, 50, 40], // AA BA BB CB CC DC DD FD alt sınırları
  targetGno: 2.0,
};
const defaultState = () => ({
  v: 2, sections: null, appliedDataSections: null, attendance: {}, grades: {}, sim: {}, tasks: [], notes: {}, limitOverride: {},
  settings: { ...DEFAULT_SETTINGS, scale: [...DEFAULT_SETTINGS.scale] },
});

// Depodan ya da yedek dosyasından gelen veriyi doğrular: yalnızca beklenen alan ve değerler kalır
const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const numOr = (v, def, lo, hi) => { const n = Number(v); return v === '' || v == null || !isFinite(n) ? def : clamp(n, lo, hi); };
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
function sanitizeState(s) {
  const out = defaultState();
  if (!isObj(s)) return out;
  const st = isObj(s.settings) ? s.settings : {};
  const S = out.settings;
  S.start = ISO_DATE.test(st.start) ? st.start : DEFAULT_SETTINGS.start;
  S.weeks = Math.round(numOr(st.weeks, 14, 1, 20));
  S.vizeW = numOr(st.vizeW, 40, 0, 100);
  S.theoryLimit = numOr(st.theoryLimit, 30, 0, 100);
  S.labLimit = numOr(st.labLimit, 20, 0, 100);
  S.theme = ['system', 'light', 'dark'].includes(st.theme) ? st.theme : 'system';
  if (Array.isArray(st.scale) && st.scale.length === 8) S.scale = st.scale.map((v, i) => numOr(v, DEFAULT_SETTINGS.scale[i], 0, 100));
  S.targetGno = numOr(st.targetGno, 2, 0, 4);
  // v1'de dönem başlangıcı tahmini 21 Eylül'dü; gerçek tarih 14 Eylül
  if ((Number(s.v) || 1) < 2 && st.start === '2026-09-21') S.start = '2026-09-14';

  if (isObj(s.sections)) {
    out.sections = {};
    for (const c of COURSES) {
      const k = s.sections[c.code];
      out.sections[c.code] = typeof k === 'string' && Object.prototype.hasOwnProperty.call(c.sections, k) ? k : secKeys(c)[0];
    }
  }
  if (typeof s.appliedDataSections === 'string') out.appliedDataSections = s.appliedDataSections;
  if (isObj(s.attendance)) {
    for (const [code, m] of Object.entries(s.attendance)) {
      if (!courseByCode[code] || !isObj(m)) continue;
      const mm = {};
      for (const [k, v] of Object.entries(m)) if (/^\d{1,2}\|[0-4]\|[1-8]\|[1-8]$/.test(k) && (v === 'var' || v === 'yok')) mm[k] = v;
      out.attendance[code] = mm;
    }
  }
  if (isObj(s.grades)) {
    for (const [code, g] of Object.entries(s.grades)) {
      if (!courseByCode[code] || !isObj(g)) continue;
      out.grades[code] = Object.fromEntries(['vize', 'final', 'but'].map((f) => [f, numOr(g[f], '', 0, 100)]));
    }
  }
  if (isObj(s.sim)) for (const [code, L] of Object.entries(s.sim)) if (courseByCode[code] && LETTERS.includes(L)) out.sim[code] = L;
  if (isObj(s.notes)) for (const [code, t] of Object.entries(s.notes)) if (courseByCode[code] && typeof t === 'string') out.notes[code] = t.slice(0, 20000);
  if (isObj(s.limitOverride)) {
    for (const [code, v] of Object.entries(s.limitOverride)) { const n = numOr(v, null, 0, 100); if (courseByCode[code] && n != null) out.limitOverride[code] = n; }
  }
  if (Array.isArray(s.tasks)) {
    out.tasks = s.tasks.filter(isObj).slice(0, 2000).map((t) => ({
      id: typeof t.id === 'string' && /^[a-z0-9]{1,16}$/i.test(t.id) ? t.id : Math.random().toString(36).slice(2, 10),
      title: String(t.title ?? '').slice(0, 200),
      type: TASK_TYPES.includes(t.type) ? t.type : 'Diğer',
      date: ISO_DATE.test(t.date) ? t.date : '',
      course: courseByCode[t.course] ? t.course : '',
      done: !!t.done,
    })).filter((t) => t.title.trim());
  }
  return out;
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return sanitizeState(JSON.parse(raw));
  } catch (e) { /* bozuk veri: varsayılana dön */ }
  return defaultState();
}
let state = loadState();
let saveOk = true;

/* ============ Eşitleme için değişiklik takibi ============
 * Durum, küçük anahtarlara düzleştirilir (ör. "att~DERS101~3|3|3|4"). Her anahtarın son değişme zamanı
 * syncMeta'da tutulur; birleştirmede anahtar bazında en yeni değer kazanır, silinenler de zamanla işaretlenir.
 */
const META_STORE = 'dersTakip.meta';
const SYNC_SETTINGS = ['start', 'weeks', 'vizeW', 'theoryLimit', 'labLimit', 'scale', 'targetGno']; // tema cihaza özeldir
const SYNC_KEY_RE = /^(att|grade|sim|note|limit|sec|set|task)~[^~]+(~[^~]+)?$/;
function flattenState(st) {
  const m = new Map();
  const put = (k, v) => { if (v === undefined || v === null || v === '') return; m.set(k, JSON.stringify(v)); };
  for (const [code, a] of Object.entries(st.attendance)) for (const [k, v] of Object.entries(a)) put(`att~${code}~${k}`, v);
  for (const [code, g] of Object.entries(st.grades)) for (const f of ['vize', 'final', 'but']) put(`grade~${code}~${f}`, g[f]);
  for (const [code, L] of Object.entries(st.sim)) put(`sim~${code}`, L);
  for (const [code, t] of Object.entries(st.notes)) put(`note~${code}`, t);
  for (const [code, v] of Object.entries(st.limitOverride)) put(`limit~${code}`, v);
  if (st.sections) for (const [code, k] of Object.entries(st.sections)) put(`sec~${code}`, k);
  for (const k of SYNC_SETTINGS) put(`set~${k}`, st.settings[k]);
  for (const t of st.tasks) put(`task~${t.id}`, t);
  return m;
}
function applySyncValue(st, key, raw) {
  const v = raw === undefined ? undefined : JSON.parse(raw);
  const [type, a, b] = key.split('~');
  const setIn = (obj, prop, val) => { if (val === undefined) delete obj[prop]; else obj[prop] = val; };
  switch (type) {
    case 'att': st.attendance[a] = st.attendance[a] || {}; setIn(st.attendance[a], b, v); break;
    case 'grade': st.grades[a] = st.grades[a] || {}; st.grades[a][b] = v === undefined ? '' : v; break;
    case 'sim': setIn(st.sim, a, v); break;
    case 'note': setIn(st.notes, a, v); break;
    case 'limit': setIn(st.limitOverride, a, v); break;
    case 'sec': st.sections = st.sections || {}; setIn(st.sections, a, v); break;
    case 'set': if (v !== undefined && SYNC_SETTINGS.includes(a)) st.settings[a] = v; break;
    case 'task': {
      const i = st.tasks.findIndex((t) => t.id === a);
      if (v === undefined) { if (i >= 0) st.tasks.splice(i, 1); } else if (i >= 0) st.tasks[i] = v; else st.tasks.push(v);
      break;
    }
  }
}
let syncMeta = {};
let hadMetaStore = false;
try {
  const raw = localStorage.getItem(META_STORE);
  if (raw) { hadMetaStore = true; const m = JSON.parse(raw); if (isObj(m)) for (const [k, t] of Object.entries(m)) if (SYNC_KEY_RE.test(k) && Number(t) > 0) syncMeta[k] = Number(t); }
} catch (e) { /* yok say */ }
let baseFlat = flattenState(state);
// Eşitleme gelmeden önce girilmiş kayıtlar: düşük zaman damgasıyla işaretle (uzaktaki gerçek değişikliklere yenilir, boş uzağa gönderilir)
if (!hadMetaStore && localStorage.getItem(STORE_KEY)) for (const k of baseFlat.keys()) syncMeta[k] = 1;
const saveMeta = () => { try { localStorage.setItem(META_STORE, JSON.stringify(syncMeta)); } catch (e) { /* yok say */ } };
saveMeta();

// silent: kullanıcı değişikliği değil (varsayılanların kurulması, uzaktan birleştirme) — zaman damgası atılmaz
function save(opts = {}) {
  const cur = flattenState(state);
  if (!opts.silent) {
    const t = Date.now();
    let changed = false;
    for (const k of new Set([...baseFlat.keys(), ...cur.keys()])) if (baseFlat.get(k) !== cur.get(k)) { syncMeta[k] = t; changed = true; }
    if (changed) saveMeta();
    if (changed && typeof window.onLocalChange === 'function') window.onLocalChange();
  }
  baseFlat = cur;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); saveOk = true; } catch (e) { saveOk = false; }
}

function syncSnapshot() {
  return { v: 1, at: Date.now(), meta: syncMeta, values: Object.fromEntries(flattenState(state)) };
}
// Uzaktaki anlık görüntüyü yerel durumla birleştirir
function mergeRemote(remote) {
  const rMeta = isObj(remote?.meta) ? remote.meta : {};
  const rVals = isObj(remote?.values) ? remote.values : {};
  const next = JSON.parse(JSON.stringify(state));
  let changedLocal = false, needPush = false;
  for (const k of new Set([...Object.keys(rMeta), ...Object.keys(syncMeta)])) {
    if (!SYNC_KEY_RE.test(k)) continue;
    const lt = syncMeta[k] || 0, rt = Number(rMeta[k]) || 0;
    if (rt > lt) {
      try { applySyncValue(next, k, typeof rVals[k] === 'string' ? rVals[k] : undefined); } catch (e) { continue; }
      syncMeta[k] = rt; changedLocal = true;
    } else if (lt > rt) needPush = true;
  }
  if (changedLocal) {
    const theme = state.settings.theme, applied = state.appliedDataSections;
    state = sanitizeState({ ...next, v: 2 });
    state.settings.theme = theme; state.appliedDataSections = applied;
    if (!state.sections) state.sections = {};
    saveMeta();
    save({ silent: true });
  }
  return { changedLocal, needPush };
}

/* ============ Program & çakışma motoru ============ */
function sessionsFor(c, sec) {
  const key = sec ?? (state.sections?.[c.code] ?? secKeys(c)[0]);
  return (c.sections[key] || c.sections[secKeys(c)[0]]).map((s) => ({ ...s, code: c.code, sec: key }));
}
function allSessions(secMap) {
  return COURSES.flatMap((c) => sessionsFor(c, secMap ? secMap[c.code] ?? secKeys(c)[0] : undefined));
}
function severity(a, b) {
  const na = needsAttendance(courseByCode[a]), nb = needsAttendance(courseByCode[b]);
  if (na && nb) return 'kritik';
  if (na || nb) return 'dikkat';
  return 'dusuk';
}
function findConflicts(secMap) {
  const ss = allSessions(secMap);
  const out = [];
  for (let i = 0; i < ss.length; i++) {
    for (let j = i + 1; j < ss.length; j++) {
      const a = ss[i], b = ss[j];
      if (a.d !== b.d || a.code === b.code) continue;
      const from = Math.max(a.from, b.from), to = Math.min(a.to, b.to);
      if (from > to) continue;
      out.push({ a, b, d: a.d, from, to, hours: to - from + 1, sev: severity(a.code, b.code) });
    }
  }
  return out.sort((x, y) => x.d - y.d || x.from - y.from);
}
const SEV_WEIGHT = { kritik: 1000, dikkat: 10, dusuk: 1 };
function conflictScore(secMap) {
  return findConflicts(secMap).reduce((sum, c) => sum + c.hours * SEV_WEIGHT[c.sev], 0);
}
// Tüm şube kombinasyonlarını dener, en az (ağırlıklı) çakışmayı bulur
function optimizeSections() {
  const multi = COURSES.filter(hasSections);
  const base = Object.fromEntries(COURSES.map((c) => [c.code, secKeys(c)[0]]));
  let best = null, bestScore = Infinity;
  const rec = (i, cur) => {
    if (i === multi.length) {
      const sc = conflictScore(cur);
      if (sc < bestScore) { bestScore = sc; best = { ...cur }; }
      return;
    }
    for (const k of secKeys(multi[i])) { cur[multi[i].code] = k; rec(i + 1, cur); }
  };
  rec(0, { ...base });
  return best;
}
const OPTIMAL = optimizeSections();
// Bölümün açıkladığı resmi şubeler (şifreli veride "sections" alanı) varsa onları uygula
const OFFICIAL_SECTIONS = (() => {
  const ds = window.DATA_SECTIONS;
  if (!isObj(ds)) return null;
  const m = {};
  for (const c of COURSES) if (typeof ds[c.code] === 'string' && Object.prototype.hasOwnProperty.call(c.sections, ds[c.code])) m[c.code] = ds[c.code];
  return Object.keys(m).length ? m : null;
})();
const SECTIONS_KNOWN = !!OFFICIAL_SECTIONS;
if (OFFICIAL_SECTIONS && state.appliedDataSections !== JSON.stringify(OFFICIAL_SECTIONS)) {
  state.sections = { ...OPTIMAL, ...(state.sections || {}), ...OFFICIAL_SECTIONS };
  state.appliedDataSections = JSON.stringify(OFFICIAL_SECTIONS);
  save(); // bölümün açıkladığı şube: gerçek değişiklik olarak eşitlenir
}
if (!state.sections || COURSES.some((c) => hasSections(c) && !state.sections[c.code])) {
  state.sections = { ...OPTIMAL, ...(state.sections || {}) };
  save({ silent: true }); // varsayılan öneri: diğer cihazlardaki seçimi ezmesin
}

const conflictsOfCourse = (code, list) => (list || findConflicts(state.sections)).filter((c) => c.a.code === code || c.b.code === code);
const SEV_META = {
  kritik: { label: 'Kritik', cls: 'b-danger', desc: 'İki ders de devam zorunlu' },
  dikkat: { label: 'Dikkat', cls: 'b-warn', desc: 'Alttan dersin bu saatini kaçırırsın' },
  dusuk: { label: 'Düşük', cls: 'b-neutral', desc: 'İki ders de alttan (devam şartı yok)' },
};

/* ============ Devamsızlık ============ */
const attKey = (w, s) => `${w}|${s.d}|${s.from}|${s.to}`;
function getAtt(code, w, s) { return state.attendance[code]?.[attKey(w, s)] || null; }
function setAtt(code, w, s, val) {
  state.attendance[code] = state.attendance[code] || {};
  if (val) state.attendance[code][attKey(w, s)] = val; else delete state.attendance[code][attKey(w, s)];
  save();
}
function attHours(code, val) {
  let h = 0;
  for (const [k, v] of Object.entries(state.attendance[code] || {})) {
    if (v !== val) continue;
    const p = k.split('|').map(Number);
    h += p[3] - p[2] + 1;
  }
  return h;
}
const limitPct = (c) => state.limitOverride[c.code] ?? (c.lab ? state.settings.labLimit : state.settings.theoryLimit);
const totalHours = (c) => c.tu * state.settings.weeks;
const limitHours = (c) => Math.floor((totalHours(c) * limitPct(c)) / 100);
function attStatus(c) {
  const abs = attHours(c.code, 'yok'), lim = limitHours(c), left = lim - abs;
  const ratio = lim ? abs / lim : 0;
  let lvl = 'ok';
  if (!needsAttendance(c)) lvl = 'muted';
  else if (abs > lim) lvl = 'danger';
  else if (ratio >= 0.7) lvl = 'warn';
  return { abs, lim, left, ratio, lvl, present: attHours(c.code, 'var') };
}

/* ============ Notlar ============ */
const num = (v) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v));
function letterOf(score) {
  const sc = state.settings.scale;
  for (let i = 0; i < sc.length; i++) if (score >= sc[i]) return LETTERS[i];
  return 'FF';
}
function gradeCalc(code) {
  const g = state.grades[code] || {};
  const w = state.settings.vizeW / 100;
  const v = num(g.vize), f = num(g.final), b = num(g.but);
  const fin = b ?? f;
  const avg = v != null && fin != null ? Math.round(v * w + fin * (1 - w)) : null;
  const need = (letter) => {
    if (v == null) return null;
    const thr = state.settings.scale[LETTERS.indexOf(letter)];
    return clamp(Math.ceil((thr - v * w) / (1 - w)), 0, 999);
  };
  return { v, f, b, avg, letter: avg != null ? letterOf(avg) : null, need };
}
const gradeClass = (L) => (!L ? 'g-none' : ['FD', 'FF', 'DS'].includes(L) ? 'g-fail' : ['DC', 'DD'].includes(L) ? 'g-cond' : 'g-pass');

/* ============ GNO ============ */
function latestMap() {
  const m = new Map();
  for (const t of TRANSCRIPT) for (const [code, name, akts, grade] of t.courses) m.set(code, { code, name, akts, grade, term: t.term });
  return m;
}
function gpaOf(map) {
  let pts = 0, akts = 0;
  for (const x of map.values()) { pts += x.akts * GRADE_POINTS[x.grade]; akts += x.akts; }
  return { pts, akts, gno: akts ? pts / akts : 0 };
}
const CURRENT = gpaOf(latestMap());
function historyOf(c) {
  const codes = [c.code, c.old].filter(Boolean);
  const out = [];
  for (const t of TRANSCRIPT) for (const row of t.courses) if (codes.includes(row[0])) out.push({ term: t.term, short: t.short, code: row[0], grade: row[3] });
  return out;
}
function projection(sim) {
  const m = latestMap();
  let semPts = 0, semAkts = 0, count = 0;
  for (const c of COURSES) {
    const g = sim[c.code];
    if (!g) continue;
    m.delete(c.old || c.code);
    m.set(c.code, { code: c.code, akts: c.akts, grade: g });
    semPts += c.akts * GRADE_POINTS[g]; semAkts += c.akts; count++;
  }
  const all = gpaOf(m);
  return { ...all, dno: semAkts ? semPts / semAkts : null, count };
}
// Bu dönemin dersleri hariç taban
const BASE = (() => {
  const m = latestMap();
  for (const c of COURSES) m.delete(c.old || c.code);
  return gpaOf(m);
})();
const SEM_AKTS = COURSES.reduce((s, c) => s + c.akts, 0);
function requiredDno(target) {
  return (target * (BASE.akts + SEM_AKTS) - BASE.pts) / SEM_AKTS;
}
function nearestLetter(gp) {
  let best = 'FF';
  for (const L of LETTERS) if (GRADE_POINTS[L] >= gp - 1e-9) best = L;
  return best; // gp'yi karşılayan en düşük harf
}
function remainingDebts() {
  const taking = new Set(COURSES.flatMap((c) => [c.code, c.old].filter(Boolean)));
  return [...latestMap().values()].filter((x) => ['FF', 'FD', 'DS'].includes(x.grade) && !taking.has(x.code));
}
const conditionalPasses = () => [...latestMap().values()].filter((x) => ['DC', 'DD'].includes(x.grade));

/* ============ Toast ============ */
function toast(msg, action) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ''}`;
  if (action) el.querySelector('button').onclick = () => { action.fn(); el.remove(); };
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), action ? 5000 : 2600);
}
