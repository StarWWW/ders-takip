/* ============ Yönlendirme ============ */
const ROUTES = {
  bugun: { title: 'Bugün', icon: 'home', render: viewToday, tab: true },
  program: { title: 'Program', icon: 'calendar', render: viewProgram, tab: true },
  dersler: { title: 'Dersler', icon: 'book', render: viewCourses, tab: true },
  calisma: { title: 'Çalışma', icon: 'bookOpen', render: viewStudy, tab: true },
  ajanda: { title: 'Ajanda', icon: 'tasks', render: viewTasks, tab: false, nav: false, parent: 'calisma' },
  akademik: { title: 'Akademik', icon: 'cap', render: viewAcademic, tab: true },
  ayarlar: { title: 'Ayarlar', icon: 'sliders', render: viewSettings, tab: false },
};
let currentRoute = null, openCode = null, drawerPushed = false;

function parseHash() {
  const [name, arg] = location.hash.replace(/^#/, '').split('/');
  return { name: ROUTES[name] ? name : 'bugun', arg: arg && courseByCode[arg] ? arg : null };
}

function renderNav() {
  $('#brandSub').textContent = STUDENT.term || '';
  const overdue = state.tasks.filter((t) => !t.done && t.date && daysBetween(now(), parseDate(t.date)) < 0).length;
  const crit = findConflicts(state.sections).filter((c) => c.sev === 'kritik').length;
  const badge = (k) => (k === 'calisma' && overdue ? overdue : k === 'program' && crit ? crit : 0);
  const active = (k) => currentRoute === k || ROUTES[currentRoute]?.parent === k;
  const link = (k, r) => `<a href="#${k}" ${active(k) ? 'aria-current="page"' : ''}>${icon(r.icon)}<span>${r.title}</span>${badge(k) ? `<span class="nav-badge">${badge(k)}</span>` : ''}</a>`;
  $('#nav').innerHTML = Object.entries(ROUTES).filter(([, r]) => r.nav !== false).map(([k, r]) => link(k, r)).join('');
  $('#tabbar').innerHTML = Object.entries(ROUTES).filter(([, r]) => r.tab).map(([k, r]) => link(k, r)).join('');

  const si = semInfo();
  const pct = clamp(((si.wk - 1) / si.W) * 100, 0, 100);
  $('#sideFoot').innerHTML = `<div class="side-card">
    <div class="lbl">${si.before ? 'Dönem başlangıcı' : si.after ? 'Dönem bitti' : 'Dönem ilerlemesi'}</div>
    <div class="big">${si.before ? fmtDate(semesterStart(), { day: 'numeric', month: 'long' }) : si.after ? `${si.W}/${si.W} hafta` : `${si.wk}. hafta`}<span class="muted" style="font-size:13px;font-weight:600"> ${si.inSem ? `/ ${si.W}` : ''}</span></div>
    <div class="progress" style="margin-top:8px"><i style="width:${si.after ? 100 : pct}%"></i></div>
    <div class="lbl" style="margin-top:12px">GNO</div><div class="big">${fmt2(CURRENT.gno)}</div>
  </div>`;
  $('#weekPill').textContent = si.before ? `${daysBetween(now(), semesterStart())} gün sonra başlıyor` : si.after ? 'Dönem bitti' : `${si.wk}. hafta / ${si.W}`;
}

function render(opts = {}) {
  const r = ROUTES[currentRoute];
  const view = $('#view');
  view.innerHTML = r.render();
  const title = r.parent ? ROUTES[r.parent].title : r.title;
  $('#pageTitle').textContent = title;
  document.title = `${r.title} · Ders Takip`;
  if (currentRoute === 'calisma' && ui.studyFocus) {
    const el = document.getElementById(`study-${ui.studyFocus}`);
    ui.studyFocus = null;
    if (el) setTimeout(() => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 76, behavior: 'smooth' }), 60);
  }
  renderNav();
  if (currentRoute === 'akademik') bindChart();
  if (opts.focus) view.focus({ preventScroll: true });
}

function route() {
  const { name, arg } = parseHash();
  if (name !== currentRoute) {
    currentRoute = name;
    render({ focus: true });
    window.scrollTo({ top: 0 });
  }
  if (arg) showDrawer(arg); else hideDrawer();
}

/* ============ Çekmece ============ */
let lastFocus = null;
function openCourse(code) {
  drawerPushed = true;
  location.hash = `${currentRoute}/${code}`;
}
function closeCourse() {
  if (drawerPushed) { drawerPushed = false; history.back(); }
  else location.hash = currentRoute;
}
function showDrawer(code) {
  const wrap = $('#drawerWrap'), dr = $('#drawer');
  const c = courseByCode[code];
  const same = openCode === code && !wrap.hidden;
  const scroll = same ? $('.dr-body', dr)?.scrollTop : 0;
  if (!same) lastFocus = document.activeElement;
  openCode = code;
  dr.innerHTML = drawerHtml(c);
  wrap.hidden = false;
  wrap.classList.remove('closing');
  document.body.style.overflow = 'hidden';
  if (same) $('.dr-body', dr).scrollTop = scroll;
  else $('.close', dr).focus();
}
function hideDrawer() {
  const wrap = $('#drawerWrap');
  if (wrap.hidden) return;
  openCode = null;
  wrap.classList.add('closing');
  setTimeout(() => { wrap.hidden = true; wrap.classList.remove('closing'); }, 160);
  document.body.style.overflow = '';
  lastFocus?.focus?.();
}
function refresh() {
  render();
  if (openCode) showDrawer(openCode);
}

/* ============ Tema ============ */
function applyTheme() {
  const t = state.settings.theme;
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  // Uygulama kipinde durum çubuğu rengi seçili temaya uysun
  $$('meta[name="theme-color"]').forEach((m) => { m.removeAttribute('media'); m.setAttribute('content', dark ? '#0b0f15' : '#f5f6f8'); });
  $('#themeBtn').innerHTML = icon(dark ? 'sun' : 'moon');
  $('#themeBtn').setAttribute('aria-label', dark ? 'Açık temaya geç' : 'Koyu temaya geç');
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

/* ============ Grafik ipucu ============ */
function bindChart() {
  const box = $('#chartBox'); if (!box) return;
  const pts = JSON.parse($('#chartData').textContent);
  const tip = $('#chartTip'), svg = $('svg', box);
  const show = (el) => {
    const p = pts[Number(el.dataset.i)];
    const r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
    const vb = svg.viewBox.baseVal, scale = b.width / vb.width;
    const T = 16, ih = 250 - 16 - 34;
    const cy = (T + ih - (p.gno / 3) * ih) * scale;
    tip.innerHTML = `<b>${esc(p.term)}</b><br>GNO ${fmt2(p.gno)} · DNO ${fmt2(p.dno)}`;
    tip.style.left = `${r.left - b.left + r.width / 2}px`;
    tip.style.top = `${cy}px`;
    tip.hidden = false;
  };
  $$('.hit', box).forEach((h) => {
    h.addEventListener('mouseenter', () => show(h));
    h.addEventListener('focus', () => show(h));
    h.addEventListener('mouseleave', () => (tip.hidden = true));
    h.addEventListener('blur', () => (tip.hidden = true));
  });
}

/* ============ Olaylar ============ */
function attArgs(el) {
  return { code: el.dataset.code, w: Number(el.dataset.w), s: { d: Number(el.dataset.d), from: Number(el.dataset.from), to: Number(el.dataset.to) } };
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  switch (act) {
    case 'open': if (!e.target.closest('.att-q')) openCourse(el.dataset.code); break;
    case 'close': closeCourse(); break;
    case 'att': {
      e.stopPropagation();
      const { code, w, s } = attArgs(el);
      const cur = getAtt(code, w, s);
      const val = cur === el.dataset.val ? null : el.dataset.val;
      setAtt(code, w, s, val);
      const c = courseByCode[code], st = attStatus(c);
      if (val === 'yok' && needsAttendance(c)) {
        toast(st.abs > st.lim ? `${c.name}: devamsızlık sınırı aşıldı!` : `${c.name}: ${st.lim - st.abs} saat hakkın kaldı`);
      } else if (val === 'var') toast('Katılım kaydedildi');
      refresh();
      break;
    }
    case 'attcycle': {
      const { code, w, s } = attArgs(el);
      const cur = getAtt(code, w, s);
      setAtt(code, w, s, cur == null ? 'var' : cur === 'var' ? 'yok' : null);
      refresh();
      break;
    }
    case 'sec':
      state.sections[el.dataset.code] = el.dataset.sec; save();
      refresh();
      break;
    case 'optimize':
      { const prev = { ...state.sections };
        state.sections = { ...getOptimal() }; save(); refresh();
        toast('En az çakışmalı şube düzeni uygulandı', { label: 'Geri al', fn: () => { state.sections = prev; save(); refresh(); } }); }
      break;
    case 'print': window.print(); break;
    case 'lock': if (window.lockApp) window.lockApp(); break;
    case 'syncNow': Sync.run(); break;
    case 'repeatRule':
      state.settings.repeatAttendance = el.dataset.rule === 'yonetmelik' ? 'yonetmelik' : 'bolum';
      save(); refresh();
      toast(el.dataset.rule === 'yonetmelik' ? 'Alttan derslerde devam şartı aranmıyor (yönetmelik md. 20)' : 'Tüm derslerde devam zorunlu (bölüm kararı)');
      break;
    case 'studyDone':
    case 'studyReview': {
      const w = Number(el.dataset.w);
      const m = toggleStudy(el.dataset.code, w, act === 'studyDone' ? 'd' : 'r');
      if (act === 'studyDone' && m.d) toast('Konu çalışıldı olarak işaretlendi');
      if (act === 'studyReview' && m.r) toast('Tekrar listesine eklendi');
      refresh();
      break;
    }
    case 'studyScope': ui.studyScopeSel = el.dataset.scope; render(); break;
    case 'studyExpand': {
      const owners = studyOwners().map((c) => c.code);
      if (ui.studyOpen.size >= owners.length) ui.studyOpen.clear(); else owners.forEach((c) => ui.studyOpen.add(c));
      render();
      break;
    }
    case 'gotoStudy':
      ui.studyOpen.add(el.dataset.code);
      ui.studyFocus = el.dataset.code;
      drawerPushed = false;
      location.hash = 'calisma';
      break;
    case 'install': {
      const p = window.installPrompt;
      if (!p) { location.hash = 'ayarlar'; break; }
      p.prompt();
      p.userChoice.then((c) => {
        window.installPrompt = null;
        if (c.outcome === 'accepted') toast('Ana ekrana ekleniyor');
        render();
      });
      break;
    }
    case 'installDismiss': setUiPref('installDismissed', true); render(); break;
    case 'syncForget':
      if (confirm('Bu cihaz artık eşitlenmeyecek (diğer cihazlar etkilenmez). Devam edilsin mi?')) { Sync.forgetDevice(); render(); toast('Bu cihazda eşitleme kapatıldı'); }
      break;
    case 'syncOffAll':
      if (confirm('Kayıtlı erişim anahtarı eşitleme kaydından silinecek; tüm cihazlarda eşitleme durur. Anahtarı GitHub ayarlarından da iptal etmeni öneririm. Devam edilsin mi?')) {
        Sync.disableEverywhere().then(() => { render(); toast('Eşitleme tüm cihazlarda kapatıldı'); }).catch((err) => toast(err.message));
      }
      break;
    case 'day': ui.day = Number(el.dataset.day); render(); break;
    case 'filter': ui.filter = el.dataset.f; render(); break;
    case 'toggleTask': {
      const t = state.tasks.find((x) => x.id === el.dataset.id);
      if (t) { t.done = !t.done; save(); refresh(); if (t.done) toast('Tamamlandı'); }
      break;
    }
    case 'delTask': {
      const i = state.tasks.findIndex((x) => x.id === el.dataset.id);
      if (i < 0) break;
      const [removed] = state.tasks.splice(i, 1); save(); refresh();
      toast('Görev silindi', { label: 'Geri al', fn: () => { state.tasks.splice(i, 0, removed); save(); refresh(); } });
      break;
    }
    case 'simAll':
      GRADED.forEach((c) => (state.sim[c.code] = el.dataset.l)); save(); render(); break;
    case 'simClear': state.sim = {}; save(); render(); break;
    case 'simFromGrades': {
      let n = 0;
      GRADED.forEach((c) => { const g = gradeCalc(c.code); if (g.letter) { state.sim[c.code] = g.letter; n++; } });
      save(); render();
      toast(n ? `${n} ders girilen notlardan dolduruldu` : 'Henüz vize ve final notu girilmiş ders yok');
      break;
    }
    case 'theme': state.settings.theme = el.dataset.theme; save(); applyTheme(); render(); break;
    case 'export': {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ders-takip-yedek-${isoDate(now())}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      break;
    }
    case 'reset':
      if (confirm('Tüm yoklama, not, görev ve ayarların silinecek. Emin misin?')) {
        state = defaultState(); delete state.migrated; state.sections = { ...(OFFICIAL_SECTIONS ? { ...getOptimal(), ...OFFICIAL_SECTIONS } : getOptimal()) };
        if (OFFICIAL_SECTIONS) state.appliedDataSections = JSON.stringify(OFFICIAL_SECTIONS);
        save(); applyTheme(); refresh(); toast('Veriler sıfırlandı');
      }
      break;
  }
});

// Klavye: role="button" öğeler ve Esc
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && openCode) { closeCourse(); return; }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-act]')) {
    e.preventDefault(); e.target.click();
  }
  if (openCode && e.key === 'Tab') { // odak çekmecede kalsın
    const f = $$('button, input, select, textarea, [tabindex="0"]', $('#drawer')).filter((x) => !x.disabled && x.offsetParent);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
});

document.addEventListener('click', (e) => { if (e.target.matches('[data-close]')) closeCourse(); });

let noteTimer;
document.addEventListener('input', (e) => {
  const el = e.target, kind = el.dataset.input;
  if (!kind) return;
  switch (kind) {
    case 'search': {
      ui.q = el.value;
      const pos = el.selectionStart;
      render();
      const inp = $('[data-input="search"]'); inp.focus(); inp.setSelectionRange(pos, pos);
      break;
    }
    case 'grade': {
      const code = el.dataset.code, f = el.dataset.field;
      let v = el.value === '' ? '' : clamp(Number(el.value), 0, 100);
      state.grades[code] = { ...(state.grades[code] || {}), [f]: v };
      save();
      $('#gradeOut').innerHTML = gradeOutHtml(courseByCode[code]);
      break;
    }
    case 'note':
      state.notes[el.dataset.code] = el.value; save();
      clearTimeout(noteTimer);
      $('#noteSaved').textContent = 'Kaydedildi';
      noteTimer = setTimeout(() => ($('#noteSaved').textContent = ''), 1400);
      break;
    case 'target':
      state.settings.targetGno = Number(el.value); save();
      $('#tgtVal').textContent = fmt2(state.settings.targetGno);
      break;
  }
});

document.addEventListener('change', (e) => {
  const el = e.target, kind = el.dataset.input;
  if (!kind) return;
  switch (kind) {
    case 'grade': render(); break; // kartlardaki ortalamayı güncelle
    case 'target': render(); $('[data-input="target"]')?.focus(); break;
    case 'sim':
      if (el.value) state.sim[el.dataset.code] = el.value; else delete state.sim[el.dataset.code];
      save(); render();
      break;
    case 'limit': {
      const v = el.value === '' ? null : clamp(Number(el.value), 0, 100);
      if (v == null) delete state.limitOverride[el.dataset.code]; else state.limitOverride[el.dataset.code] = v;
      save(); refresh();
      break;
    }
    case 'setting': {
      const k = el.dataset.key;
      if (el.hasAttribute('data-num')) {
        const v = Number(el.value);
        if (el.value === '' && el.hasAttribute('data-optional')) { state.settings[k] = null; save(); render(); toast('Ayar temizlendi'); break; }
        if (el.value === '' || isNaN(v)) { render(); break; }
        state.settings[k] = k === 'weeks' ? clamp(Math.round(v), 1, 20) : k === 'midtermWeek' ? clamp(Math.round(v), 2, 20) : clamp(v, 0, 100);
      } else if (el.value) state.settings[k] = el.value;
      save(); render(); toast('Ayar kaydedildi');
      break;
    }
    case 'scale': {
      const v = Number(el.value);
      if (!isNaN(v)) { state.settings.scale[Number(el.dataset.i)] = clamp(v, 0, 100); save(); toast('Harf skalası güncellendi'); }
      break;
    }
    case 'import': {
      const file = el.files?.[0]; if (!file) break;
      if (file.size > 5 * 1024 * 1024) { toast('Dosya çok büyük'); break; }
      file.text().then((txt) => {
        const data = JSON.parse(txt);
        if (!data || typeof data !== 'object' || !('attendance' in data)) throw new Error('bad');
        state = sanitizeState(data);
        delete state.migrated;
        if (!state.sections) state.sections = { ...getOptimal() };
        save(); applyTheme(); refresh(); toast('Yedek yüklendi');
      }).catch(() => toast('Dosya okunamadı — geçerli bir yedek seç'));
      break;
    }
  }
});

document.addEventListener('submit', (e) => {
  const syncForm = e.target.closest('[data-form="sync"]');
  if (syncForm) {
    e.preventDefault();
    const input = syncForm.elements.token, btn = syncForm.querySelector('button'), err = $('#syncErr');
    btn.disabled = true; btn.textContent = 'Doğrulanıyor…'; err.hidden = true;
    Sync.setup(input.value).then(() => {
      input.value = '';
      toast('Eşitleme açıldı');
      render();
    }).catch((x) => {
      btn.disabled = false; btn.innerHTML = `${icon('cloud')}Eşitlemeyi aç`;
      err.textContent = x.message || String(x); err.hidden = false;
    });
    return;
  }
  const form = e.target.closest('[data-form="task"]');
  if (!form) return;
  e.preventDefault();
  const fd = new FormData(form);
  const title = String(fd.get('title') || '').trim();
  if (!title) return;
  state.tasks.push({
    id: Math.random().toString(36).slice(2, 10),
    title, type: fd.get('type') || 'Ödev', date: fd.get('date') || '',
    course: form.dataset.course || fd.get('course') || '', done: false,
  });
  save(); refresh(); toast('Görev eklendi');
  const again = form.dataset.course ? $('[data-form="task"] [name="title"]', $('#drawer')) : $('#tTitle');
  again?.focus();
});

$('#themeBtn').addEventListener('click', () => {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
    (!document.documentElement.hasAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
  state.settings.theme = dark ? 'light' : 'dark'; save(); applyTheme();
  if (currentRoute === 'ayarlar') render();
});
$('#settingsBtnTop').innerHTML = icon('sliders');
$('#settingsBtnTop').addEventListener('click', () => (location.hash = 'ayarlar'));

window.addEventListener('scroll', () => $('.topbar').classList.toggle('scrolled', window.scrollY > 4), { passive: true });
window.addEventListener('hashchange', route);

// Canlı saat: Bugün/Program ekranını dakikada bir tazele (kullanıcı yazmıyorsa)
setInterval(() => {
  const busy = document.activeElement && document.activeElement.matches('input, textarea, select');
  if (!busy && !openCode && (currentRoute === 'bugun' || currentRoute === 'program')) render();
}, 30000);

// Açılan/kapanan ders kartlarını yeniden çizimlerde koru ("toggle" olayı kabarcıklanmaz, yakalama evresinde dinle)
document.addEventListener('toggle', (e) => {
  const d = e.target;
  if (!(d instanceof HTMLDetailsElement) || !d.dataset.study) return;
  if (d.open) ui.studyOpen.add(d.dataset.study); else ui.studyOpen.delete(d.dataset.study);
}, true);

/* ============ Uygulama kurulumu ve bağlantı ============ */
window.addEventListener('kurulabilir', () => { if (currentRoute === 'bugun' || currentRoute === 'ayarlar') render(); });
window.addEventListener('appinstalled', () => { window.installPrompt = null; toast('Ders Takip ana ekrana eklendi'); render(); });
window.addEventListener('offline', () => toast('İnternet yok — kayıtların bu cihazda saklanıyor, bağlantı gelince eşitlenecek'));
window.addEventListener('online', () => toast('Tekrar çevrimiçi'));

/* ============ Eşitleme göstergesi ============ */
function renderSyncPill() {
  const pill = $('#syncPill'), i = Sync.info;
  if (!i.available) { pill.hidden = true; return; }
  const [cls, label] = SYNC_STATUS[i.status] || SYNC_STATUS.yok;
  const ic = i.status === 'esitleniyor' || i.status === 'bekliyor' ? 'refresh' : ['hata', 'kurulum', 'cevrimdisi'].includes(i.status) ? 'cloudOff' : 'cloud';
  pill.hidden = false;
  pill.className = `sync-pill ${cls} ${i.status === 'esitleniyor' ? 'spin' : ''}`;
  pill.innerHTML = `${icon(ic)}<span>${label}</span>`;
  pill.title = i.lastError || `Son eşitleme: ${agoText(i.lastSync)}`;
  pill.setAttribute('aria-label', `Eşitleme durumu: ${label}`);
}
Sync.onChange(() => {
  renderSyncPill();
  const typing = document.activeElement && document.activeElement.matches('input, textarea, select');
  if (currentRoute === 'ayarlar' && !typing) render();
});

/* ============ Başlat ============ */
applyTheme();
{
  const { arg } = parseHash();
  route();
  if (arg) drawerPushed = false;
  renderSyncPill();
  Sync.start();
}
