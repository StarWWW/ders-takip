/* ============ Ortak parçalar ============ */
const ui = { filter: 'all', q: '', day: null };
const sm = (s) => toMin(SLOTS[s.from][0]);
const em = (s) => toMin(SLOTS[s.to][1]);

function daySessions(d) {
  return allSessions().filter((s) => s.d === d)
    .sort((a, b) => a.from - b.from || needsAttendance(courseByCode[b.code]) - needsAttendance(courseByCode[a.code]));
}
function semInfo(n = now()) {
  const wk = weekOf(n), W = state.settings.weeks;
  return { wk, W, before: wk < 1, after: wk > W, inSem: wk >= 1 && wk <= W };
}
function alisBadge(c) {
  if (c.alis === 'Zorunlu') return `<span class="badge b-primary">${icon('shield')}Devam zorunlu</span>`;
  if (c.alis === 'Devamlı Alttan') return `<span class="badge b-warn">${icon('repeat')}Devamlı alttan</span>`;
  return `<span class="badge b-neutral" title="Devam şartı daha önce sağlandığı için devam zorunluluğu olmaması beklenir">${icon('repeat')}Alttan</span>`;
}
function sectionLabel(sec) { return sec ? `Şube ${sec}` : 'Tek şube'; }
function conflictMap(list) {
  const m = new Map();
  const rank = { kritik: 3, dikkat: 2, dusuk: 1 };
  for (const cf of list) for (const s of [cf.a, cf.b]) {
    const k = `${s.code}|${s.d}|${s.from}`;
    if (!m.has(k) || rank[cf.sev] > rank[m.get(k)]) m.set(k, cf.sev);
  }
  return m;
}
function nextClass(n = now()) {
  const semStart = semesterStart();
  const from = startOfDay(n) < semStart ? semStart : startOfDay(n);
  const mins = minutesOfDay(n);
  for (let i = 0; i < 21; i++) {
    const date = addDays(from, i), d = dayIdx(date);
    if (d > 4 || weekOf(date) > state.settings.weeks) continue;
    const isToday = daySessions(d) && daysBetween(n, date) === 0;
    for (const s of daySessions(d)) if (!isToday || sm(s) > mins) return { s, date };
  }
  return null;
}
function attButtons(s, week, compact) {
  const cur = getAtt(s.code, week, s);
  const base = `data-code="${s.code}" data-w="${week}" data-d="${s.d}" data-from="${s.from}" data-to="${s.to}"`;
  return `<div class="att-q" role="group" aria-label="Yoklama">
    <button type="button" class="att-btn ${cur === 'var' ? 'on-var' : ''}" data-act="att" data-val="var" ${base} aria-pressed="${cur === 'var'}" aria-label="Katıldım" title="Katıldım">${icon('check')}</button>
    <button type="button" class="att-btn ${cur === 'yok' ? 'on-yok' : ''}" data-act="att" data-val="yok" ${base} aria-pressed="${cur === 'yok'}" aria-label="Katılmadım" title="Katılmadım">${icon('x')}</button>
  </div>`;
}
function progressBar(pct, lvl) {
  return `<div class="progress lvl-${lvl}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><i style="width:${clamp(pct, 0, 100)}%"></i></div>`;
}

/* ============ BUGÜN ============ */
function greeting(h) { return h < 5 ? 'İyi geceler' : h < 12 ? 'Günaydın' : h < 18 ? 'İyi günler' : h < 22 ? 'İyi akşamlar' : 'İyi geceler'; }

function heroHtml() {
  const n = now(), mins = minutesOfDay(n), d = dayIdx(n), si = semInfo(n);
  if (si.after) {
    return `<section class="hero neutral"><div class="hero-k">${icon('flag')} Dönem tamamlandı</div>
      <div class="hero-name">${state.settings.weeks} haftalık dönem bitti</div>
      <div class="hero-meta"><span>Final ve bütünleme notlarını Akademik sekmesinden gir.</span></div></section>`;
  }
  const cur = si.inSem && d <= 4 ? daySessions(d).filter((s) => sm(s) <= mins && mins < em(s)) : [];
  if (cur.length) {
    const s = cur[0], c = courseByCode[s.code];
    const left = em(s) - mins, pct = ((mins - sm(s)) / (em(s) - sm(s))) * 100;
    const par = cur.slice(1).map((x) => courseByCode[x.code]);
    return `<section class="hero c" style="${cstyle(c)}" aria-live="polite">
      <div class="hero-k"><span class="live" aria-hidden="true"></span> Şu an derste · <span class="mono">${timeRange(s)}</span></div>
      <div class="hero-name">${esc(c.name)}</div>
      <div class="hero-meta"><span>${icon('pin')}${esc(s.room)}</span><span>${icon('user')}${esc(c.teacher)}</span>${s.sec ? `<span>${sectionLabel(s.sec)}</span>` : ''}</div>
      <div class="hero-count"><b>${durText(left)}</b><span class="muted">kaldı</span></div>
      ${progressBar(pct, 'x')}
      ${par.length ? `<div class="callout warn" style="margin-top:14px">${icon('alert')}<div>Aynı saatte <b>${par.map((p) => esc(p.name)).join(', ')}</b> dersi de var.</div></div>` : ''}
      <div class="hero-actions">${attButtons(s, si.wk)}<button class="btn btn-sm" type="button" data-act="open" data-code="${c.code}">Ders detayı ${icon('arrow')}</button></div>
    </section>`;
  }
  const nx = nextClass(n);
  if (!nx) {
    return `<section class="hero neutral"><div class="hero-k">${icon('coffee')} Ders yok</div><div class="hero-name">Yakında planlanmış ders bulunmuyor</div></section>`;
  }
  const c = courseByCode[nx.s.code];
  const dd = daysBetween(n, nx.date);
  let when;
  if (dd === 0) when = `<b>${durText(sm(nx.s) - mins)}</b><span class="muted">sonra başlıyor</span>`;
  else if (dd === 1) when = `<b>Yarın</b><span class="muted">${SLOTS[nx.s.from][0]}</span>`;
  else when = `<b>${fmtDate(nx.date, { weekday: 'long' })}</b><span class="muted">${fmtDate(nx.date, { day: 'numeric', month: 'long' })} · ${SLOTS[nx.s.from][0]}</span>`;
  const kicker = si.before
    ? `${icon('flag')} Dönem ${daysBetween(n, semesterStart())} gün sonra başlıyor · İlk ders`
    : dd === 0 ? `${icon('clock')} Sıradaki ders` : d > 4 ? `${icon('coffee')} Hafta sonu · Sıradaki ders` : `${icon('coffee')} Bugünlük bitti · Sıradaki ders`;
  return `<section class="hero c" style="${cstyle(c)}">
    <div class="hero-k">${kicker}</div>
    <div class="hero-name">${esc(c.name)}</div>
    <div class="hero-meta"><span>${icon('clock')}<span class="mono">${timeRange(nx.s)}</span></span><span>${icon('pin')}${esc(nx.s.room)}</span><span>${icon('user')}${esc(c.teacher)}</span></div>
    <div class="hero-count">${when}</div>
    <div class="hero-actions"><button class="btn btn-sm" type="button" data-act="open" data-code="${c.code}">Ders detayı ${icon('arrow')}</button><a class="btn btn-sm btn-ghost" href="#program">Haftalık program</a></div>
  </section>`;
}

function timelineHtml(date, conflicts) {
  const n = now(), d = dayIdx(date), isToday = daysBetween(n, date) === 0, mins = minutesOfDay(n);
  const week = weekOf(date), canMark = week >= 1 && week <= state.settings.weeks && daysBetween(n, date) <= 0;
  const cmap = conflictMap(conflicts);
  const list = daySessions(d);
  if (!list.length) return `<div class="empty">${icon('coffee')}<div>Bu gün ders yok</div></div>`;
  return `<div class="timeline">${list.map((s) => {
    const c = courseByCode[s.code];
    const st = isToday ? (em(s) <= mins ? 'past' : sm(s) <= mins ? 'now' : '') : '';
    const sev = cmap.get(`${s.code}|${s.d}|${s.from}`);
    return `<div class="tl-item ${st} c" style="${cstyle(c)}">
      <div class="tl-time">${SLOTS[s.from][0]}<small>${SLOTS[s.to][1]}</small></div>
      <div class="tl-body" data-act="open" data-code="${c.code}" role="button" tabindex="0" aria-label="${esc(c.name)} detayını aç">
        <div style="min-width:0">
          <div class="tl-name">${esc(c.name)}</div>
          <div class="tl-sub"><span class="mono">${c.code}</span><span>${icon('pin')}${esc(s.room)}</span>${s.sec ? `<span>Şb. ${s.sec}</span>` : ''}${sev ? `<span class="badge ${SEV_META[sev].cls}">${icon('alert')}Çakışma</span>` : ''}</div>
        </div>
        ${canMark ? attButtons(s, week) : ''}
      </div>
    </div>`;
  }).join('')}</div>`;
}

function viewToday() {
  const n = now(), d = dayIdx(n), si = semInfo(n);
  const conflicts = findConflicts(state.sections);
  const nx = nextClass(n);
  const showToday = si.inSem && d <= 4 && daySessions(d).length;
  const tDate = showToday ? startOfDay(n) : nx ? nx.date : null;
  const tTitle = !tDate ? 'Program' : daysBetween(n, tDate) === 0 ? 'Bugünün programı' : daysBetween(n, tDate) === 1 ? 'Yarının programı' : `${fmtDate(tDate, { weekday: 'long' })} programı`;
  const tSub = tDate ? fmtDate(tDate, { day: 'numeric', month: 'long' }) : '';
  const hoursToday = d <= 4 ? daySessions(d).reduce((a, s) => a + hoursOf(s), 0) : 0;

  const sevCount = { kritik: 0, dikkat: 0, dusuk: 0 };
  conflicts.forEach((c) => sevCount[c.sev]++);

  const req = COURSES.filter(needsAttendance).map((c) => ({ c, st: attStatus(c) })).sort((a, b) => b.st.ratio - a.st.ratio);
  const upcoming = state.tasks.filter((t) => !t.done).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')).slice(0, 4);
  const need = requiredDno(state.settings.targetGno);
  const sim = projection(state.sim);

  return `
  <div class="hello">
    <h2>${greeting(n.getHours())}, ${esc(STUDENT.firstName)}</h2>
    <p>${fmtDate(n, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${si.before ? `Dönem ${fmtDate(semesterStart(), { day: 'numeric', month: 'long' })} tarihinde başlıyor` : si.after ? 'Dönem sona erdi' : d <= 4 ? `Bugün ${hoursToday} saat dersin var` : 'Hafta sonu, iyi dinlen'}</p>
  </div>
  <div class="dash">
    <div class="dash-col">
      ${heroHtml()}
      <div class="stats">
        <div class="card stat"><div class="k">Ders</div><div class="v">${COURSES.length}</div><div class="s">${COURSES.filter(needsAttendance).length} devam zorunlu</div></div>
        <div class="card stat"><div class="k">AKTS</div><div class="v">${SEM_AKTS}</div><div class="s">bu dönem</div></div>
        <div class="card stat"><div class="k">Kredi</div><div class="v">${COURSES.reduce((a, c) => a + c.krd, 0)}</div><div class="s">yerel kredi</div></div>
        <div class="card stat"><div class="k">Haftalık</div><div class="v">${COURSES.reduce((a, c) => a + c.tu, 0)} sa</div><div class="s">T+U toplamı</div></div>
      </div>
      <section class="card card-pad">
        <div class="card-h"><h3 class="card-t">${icon('calendar')}${tTitle} <span class="muted" style="font-weight:500;font-size:13.5px">${tSub}</span></h3><a class="link-btn" href="#program">Hafta ${icon('arrow')}</a></div>
        ${tDate ? timelineHtml(tDate, conflicts) : '<div class="empty">Planlanmış ders yok</div>'}
      </section>
    </div>
    <div class="dash-col">
      <section class="card card-pad">
        <div class="card-h"><h3 class="card-t">${icon('alert')}Çakışmalar</h3><a class="link-btn" href="#program">Çöz ${icon('arrow')}</a></div>
        ${conflicts.length ? `
          <div class="row wrap" style="margin-bottom:10px">
            ${sevCount.kritik ? `<span class="badge b-danger">${sevCount.kritik} kritik</span>` : `<span class="badge b-ok">${icon('check')}Kritik çakışma yok</span>`}
            ${sevCount.dikkat ? `<span class="badge b-warn">${sevCount.dikkat} dikkat</span>` : ''}
            ${sevCount.dusuk ? `<span class="badge b-neutral">${sevCount.dusuk} düşük</span>` : ''}
          </div>
          <div class="help">${sevCount.kritik ? 'Devam zorunlu iki ders aynı saatte — şube değiştirmeyi dene.' : 'Devam zorunlu derslerin birbiriyle çakışmıyor; çakışmalar alttan aldığın derslerle.'}</div>`
          : `<div class="callout ok">${icon('check')}<div>Hiç çakışma yok.</div></div>`}
      </section>
      <section class="card card-pad">
        <div class="card-h"><h3 class="card-t">${icon('shield')}Devamsızlık</h3><a class="link-btn" href="#dersler">Tümü ${icon('arrow')}</a></div>
        ${req.map(({ c, st }) => `
          <div class="risk-row c" style="${cstyle(c)}" data-act="open" data-code="${c.code}" role="button" tabindex="0">
            <div class="nm"><i class="dot"></i><span>${esc(c.name)}</span></div>
            <div class="num">${st.abs} / ${st.lim} sa${st.lvl === 'danger' ? ` <span class="badge b-danger">Aşıldı</span>` : st.lvl === 'warn' ? ` <span class="badge b-warn">Sınırda</span>` : ''}</div>
            ${progressBar(st.lim ? (st.abs / st.lim) * 100 : 0, st.lvl)}
          </div>`).join('')}
        <div class="help" style="margin-top:10px">Yoklamayı programdaki ✓ / ✕ düğmeleriyle işaretle. Sınırlar: teori %${state.settings.theoryLimit}, lab %${state.settings.labLimit}.</div>
      </section>
      <section class="card card-pad">
        <div class="card-h"><h3 class="card-t">${icon('tasks')}Yaklaşanlar</h3><a class="link-btn" href="#ajanda">${icon('plus')}Ekle</a></div>
        ${upcoming.length ? upcoming.map(taskRow).join('') : `<div class="empty" style="padding:14px">${icon('tasks')}<div>Sınav, ödev veya proje ekleyerek takibe başla.</div></div>`}
      </section>
      <section class="card card-pad">
        <div class="card-h"><h3 class="card-t">${icon('cap')}GNO hedefi</h3><a class="link-btn" href="#akademik">Simülatör ${icon('arrow')}</a></div>
        <div class="gno-mini">
          <div><div class="muted" style="font-size:12.5px;font-weight:650">Şu anki GNO</div><div class="v">${fmt2(CURRENT.gno)}</div></div>
          ${sim.count ? `<div class="arrow">${icon('arrow')}</div><div><div class="muted" style="font-size:12.5px;font-weight:650">Simülasyon</div><div class="v" style="color:var(--primary)">${fmt2(sim.gno)}</div></div>` : ''}
        </div>
        <div class="callout info" style="margin-top:14px">${icon('target')}<div><b>${fmt2(state.settings.targetGno)}</b> GNO için bu dönem ortalaman en az <b>${fmt2(need)}</b> olmalı — yani derslerin ortalama <b>${nearestLetter(need)}</b> civarı.</div></div>
      </section>
    </div>
  </div>`;
}

/* ============ PROGRAM ============ */
const DAY_START = 8 * 60, DAY_END = 17 * 60 + 10, PPM = 1.12;
const yOf = (min) => (min - DAY_START) * PPM;

function layoutDay(list) {
  const items = list.map((s) => ({ s, a: sm(s), b: em(s) })).sort((x, y) => x.a - y.a || y.b - x.b);
  let cluster = [], end = -1;
  const flush = () => {
    const lanes = [];
    for (const it of cluster) {
      let i = lanes.findIndex((e) => e <= it.a);
      if (i < 0) { i = lanes.length; lanes.push(0); }
      lanes[i] = it.b; it.lane = i;
    }
    cluster.forEach((it) => (it.lanes = lanes.length));
  };
  for (const it of items) {
    if (cluster.length && it.a >= end) { flush(); cluster = []; end = -1; }
    cluster.push(it); end = Math.max(end, it.b);
  }
  if (cluster.length) flush();
  return items;
}

function gridHtml(conflicts) {
  const n = now(), si = semInfo(n), today = dayIdx(n);
  const dispWeek = clamp(si.wk, 1, state.settings.weeks);
  const isCurWeek = si.inSem;
  const cmap = conflictMap(conflicts);
  const H = yOf(DAY_END);
  const slotStarts = Object.values(SLOTS).map((x) => toMin(x[0]));
  const lines = slotStarts.map((m) => `<div class="tt-line" style="top:${yOf(m)}px"></div>`).join('');
  const lunch = `<div class="tt-lunch" style="top:${yOf(12 * 60)}px;height:${70 * PPM}px">Öğle arası</div>`;
  const times = slotStarts.map((m, i) => `<div class="tt-time" style="top:${yOf(m)}px">${Object.values(SLOTS)[i][0]}</div>`).join('');
  const mins = minutesOfDay(n);

  const cols = DAYS.map((day, d) => {
    const items = layoutDay(daySessions(d));
    const blocks = items.map((it) => {
      const s = it.s, c = courseByCode[s.code];
      const sev = cmap.get(`${s.code}|${s.d}|${s.from}`);
      const w = 100 / it.lanes, narrow = it.lanes > 1;
      const cls = ['blk', 'c', c.lab ? 'lab' : '', needsAttendance(c) ? '' : 'opt', sev ? `conf-${sev}` : '', narrow ? 'narrow' : '', s.from === s.to ? 'short' : ''].join(' ');
      const label = `${c.name}, ${DAYS[d]} ${timeRange(s)}, ${s.room}${sev ? ', çakışma var' : ''}`;
      return `<button type="button" class="${cls}" style="${cstyle(c)};top:${yOf(it.a) + 1}px;height:${(it.b - it.a) * PPM - 2}px;left:calc(${it.lane * w}% + 3px);width:calc(${w}% - 6px)" data-act="open" data-code="${c.code}" aria-label="${esc(label)}" title="${esc(label)}">
        <span class="b-code">${sev ? icon('alert') : ''}${c.code}${s.sec ? ` · ${s.sec}` : ''}</span>
        <span class="b-name">${esc(c.name)}</span>
        <span class="b-room">${esc(s.room)}</span>
      </button>`;
    }).join('');
    const isToday = isCurWeek && d === today;
    const nowLine = isToday && mins >= DAY_START && mins <= DAY_END ? `<div class="tt-now" style="top:${yOf(mins)}px" aria-hidden="true"></div>` : '';
    return `<div class="tt-day ${isToday ? 'today' : ''}" style="height:${H}px">${lines}${lunch}${blocks}${nowLine}</div>`;
  }).join('');

  const heads = DAYS.map((day, d) => {
    const date = dateOfWeekDay(dispWeek, d);
    return `<div class="tt-head ${isCurWeek && d === today ? 'today' : ''}">${day}<small>${fmtDate(date, { day: 'numeric', month: 'short' })}</small></div>`;
  }).join('');

  return `<div class="card tt-wrap">
    <div class="tt">
      <div class="tt-head" style="border-right:1px solid var(--border)"><small>Hafta</small>${dispWeek}</div>${heads}
      <div class="tt-times" style="height:${H}px">${times}</div>${cols}
    </div>
    <div class="legend">
      <span><i class="lg-sw"></i>Devam zorunlu</span>
      <span><i class="lg-sw dash"></i>Alttan (devam şartı yok*)</span>
      <span><i class="lg-sw lab"></i>Laboratuvar</span>
      <span><i class="lg-sw cf"></i>Çakışma (renk = önem)</span>
    </div>
  </div>`;
}

function agendaHtml(conflicts) {
  const n = now(), today = dayIdx(n);
  if (ui.day == null) ui.day = today <= 4 ? today : 0;
  const cmap = conflictMap(conflicts);
  const dispWeek = clamp(weekOf(n), 1, state.settings.weeks);
  const tabs = DAYS.map((day, d) => {
    const hasCf = conflicts.some((c) => c.d === d);
    return `<button type="button" data-act="day" data-day="${d}" aria-pressed="${ui.day === d}">${DAYS_SHORT[d]}<small>${fmtDate(dateOfWeekDay(dispWeek, d), { day: 'numeric' })}</small>${hasCf ? '<i class="cf-dot" aria-label="çakışma var"></i>' : ''}</button>`;
  }).join('');
  const list = daySessions(ui.day);
  let lunchShown = false;
  const items = list.map((s) => {
    const c = courseByCode[s.code];
    const sev = cmap.get(`${s.code}|${s.d}|${s.from}`);
    let pre = '';
    if (!lunchShown && s.from >= 5 && list.some((x) => x.from < 5)) { lunchShown = true; pre = `<div class="tl-item"><div class="tl-time">12:00</div><div class="muted" style="padding:10px 0;font-size:13px;display:flex;gap:6px;align-items:center">${icon('coffee')}Öğle arası</div></div>`; }
    const live = weekOf(n) >= 1 && ui.day === today && sm(s) <= minutesOfDay(n) && minutesOfDay(n) < em(s) ? 'now' : '';
    return `${pre}<div class="tl-item ${live} c" style="${cstyle(c)}">
      <div class="tl-time">${SLOTS[s.from][0]}<small>${SLOTS[s.to][1]}</small></div>
      <div class="tl-body" data-act="open" data-code="${c.code}" role="button" tabindex="0">
        <div style="min-width:0">
          <div class="tl-name">${esc(c.name)}</div>
          <div class="tl-sub"><span class="mono">${c.code}${s.sec ? ` · Şb. ${s.sec}` : ''}</span><span>${icon('pin')}${esc(s.room)}</span></div>
          <div class="tl-sub" style="margin-top:6px">${needsAttendance(c) ? '<span class="badge b-primary">Devam zorunlu</span>' : '<span class="badge b-neutral">Alttan</span>'}${sev ? `<span class="badge ${SEV_META[sev].cls}">${icon('alert')}Çakışma</span>` : ''}${c.lab ? '<span class="badge b-neutral">Lab</span>' : ''}</div>
        </div>
      </div>
    </div>`;
  }).join('');
  return `<div class="agenda"><div class="day-tabs" role="group" aria-label="Gün seç">${tabs}</div>
    <div class="card card-pad">${list.length ? `<div class="timeline">${items}</div>` : `<div class="empty">${icon('coffee')}<div>Bu gün ders yok</div></div>`}</div></div>`;
}

function conflictAdvice(cf) {
  const A = courseByCode[cf.a.code], B = courseByCode[cf.b.code];
  if (cf.sev === 'kritik') return `İki ders de devam zorunlu. Şube değiştirmeyi dene ya da danışmanınla görüş.`;
  if (cf.sev === 'dikkat') {
    const req = needsAttendance(A) ? A : B, alt = req === A ? B : A;
    return `<b>${esc(req.name)}</b> dersine git (devam zorunlu). <b>${esc(alt.name)}</b> alttan olduğu için bu saati notlardan telafi et.`;
  }
  return `İki ders de alttan; hangisine gideceğini seç, diğerini kaynaktan çalış.`;
}

function viewProgram() {
  const conflicts = findConflicts(state.sections);
  const isOptimal = COURSES.filter(hasSections).every((c) => state.sections[c.code] === OPTIMAL[c.code]);
  const totalCfHours = conflicts.reduce((a, c) => a + c.hours, 0);
  const crit = conflicts.filter((c) => c.sev === 'kritik').length;

  const secPanel = COURSES.filter(hasSections).map((c) => {
    const cur = state.sections[c.code];
    return `<div class="sec-item c" style="${cstyle(c)}">
      <div class="top"><i class="dot"></i><span class="nm">${esc(c.name)}</span></div>
      <div class="seg" role="group" aria-label="${esc(c.name)} şubesi">${secKeys(c).map((k) => `<button type="button" data-act="sec" data-code="${c.code}" data-sec="${k}" aria-pressed="${cur === k}" title="${OPTIMAL[c.code] === k ? 'Önerilen şube' : ''}">${k}${OPTIMAL[c.code] === k ? '<i class="rec" aria-label="önerilen"></i>' : ''}</button>`).join('')}</div>
      <div class="when">${sessionsFor(c).map((s) => `${DAYS_SHORT[s.d]} <span class="mono">${timeRange(s)}</span>`).join(' · ')}</div>
    </div>`;
  }).join('');

  const confList = conflicts.length ? conflicts.map((cf) => {
    const A = courseByCode[cf.a.code], B = courseByCode[cf.b.code], meta = SEV_META[cf.sev];
    const icCls = cf.sev === 'kritik' ? 'b-danger' : cf.sev === 'dikkat' ? 'b-warn' : 'b-neutral';
    return `<div class="conf-item">
      <div class="conf-ic badge ${icCls}">${icon('alert')}</div>
      <div>
        <div class="row wrap" style="gap:6px"><span class="t">${DAYS[cf.d]} <span class="mono">${SLOTS[cf.from][0]}–${SLOTS[cf.to][1]}</span></span><span class="badge ${meta.cls}">${meta.label} · ${cf.hours} saat</span></div>
        <div class="row wrap" style="gap:6px;margin-top:6px"><span class="chip-code c" style="${cstyle(A)}">${A.code}${cf.a.sec ? ' · ' + cf.a.sec : ''}</span><span class="muted" style="font-size:13px">${esc(A.name)}</span><span class="muted">×</span><span class="chip-code c" style="${cstyle(B)}">${B.code}${cf.b.sec ? ' · ' + cf.b.sec : ''}</span><span class="muted" style="font-size:13px">${esc(B.name)}</span></div>
        <div class="d">${conflictAdvice(cf)}</div>
      </div>
    </div>`;
  }).join('') : `<div class="callout ok">${icon('check')}<div>Seçtiğin şubelerle hiç çakışma yok.</div></div>`;

  return `
  <div class="toolbar">
    <div class="row wrap">
      ${crit ? `<span class="badge b-danger">${icon('alert')}${crit} kritik çakışma</span>` : `<span class="badge b-ok">${icon('check')}Devam zorunlu dersler çakışmıyor</span>`}
      <span class="badge b-neutral">${conflicts.length} çakışma · ${totalCfHours} saat</span>
    </div>
    <div class="row">
      ${isOptimal ? `<span class="badge b-primary">${icon('sparkles')}En iyi şube düzeni</span>` : `<button type="button" class="btn btn-primary btn-sm" data-act="optimize">${icon('sparkles')}En az çakışmalı düzeni uygula</button>`}
      <button type="button" class="btn btn-sm" data-act="print">Yazdır</button>
    </div>
  </div>
  ${gridHtml(conflicts)}
  ${agendaHtml(conflicts)}
  <h2 class="section-t">Şube seçimi</h2>
  ${SECTIONS_KNOWN
    ? `<div class="callout ok" style="margin-bottom:12px">${icon('check')}<div>Şubelerin bölümün açıkladığı listeye göre ayarlandı. Değişiklik olursa aşağıdan güncelleyebilirsin.</div></div>`
    : `<div class="callout warn" style="margin-bottom:12px">${icon('info')}<div><b>Şubeler henüz açıklanmadı.</b> Şimdilik çakışmayı en aza indiren düzen gösteriliyor (<span style="color:var(--primary)">●</span> önerilen). Şuben açıklanınca buradan seçebilirsin; yoklama kayıtların kaybolmaz.</div></div>`}
  <div class="sec-panel">${secPanel}</div>
  <h2 class="section-t">Çakışmalar ve öneriler</h2>
  <div class="conf-list">${confList}</div>
  <p class="help" style="margin-top:14px">* "Alttan" dersler için devam şartı daha önce sağlandığından devam zorunluluğu olmaması beklenir; "Devamlı alttan" dersler ise devam gerektirir. Yönetmeliği veya danışmanını kontrol et.</p>`;
}

/* ============ DERSLER ============ */
function courseCard(c, conflicts) {
  const ss = sessionsFor(c), st = attStatus(c), hist = historyOf(c), g = gradeCalc(c.code);
  const cf = conflictsOfCourse(c.code, conflicts);
  const worst = cf.some((x) => x.sev === 'kritik') ? 'b-danger' : cf.some((x) => x.sev === 'dikkat') ? 'b-warn' : 'b-neutral';
  const att = needsAttendance(c)
    ? `<div class="att"><div class="row"><span>Devamsızlık</span><b style="color:var(--text)">${st.abs} / ${st.lim} saat</b></div>${progressBar(st.lim ? (st.abs / st.lim) * 100 : 0, st.lvl)}</div>`
    : `<div class="att"><div class="row"><span>Devam şartı yok*</span><span>${st.present + st.abs ? `${st.present} sa katıldın` : ''}</span></div></div>`;
  return `<article class="ccard c" style="${cstyle(c)}" data-act="open" data-code="${c.code}" role="button" tabindex="0" aria-label="${esc(c.name)} detayını aç">
    <div class="top"><span class="chip-code">${c.code}</span>${alisBadge(c)}${c.lab ? `<span class="badge b-neutral">${icon('flask')}Lab</span>` : ''}${cf.length ? `<span class="badge ${worst}">${icon('alert')}${cf.length}</span>` : ''}</div>
    <h3>${esc(c.name)}</h3>
    <div class="teacher">${icon('user')}${esc(c.teacher)}</div>
    <div class="sched">${ss.map((s) => `<div><b>${DAYS_SHORT[s.d]}</b><span class="mono">${timeRange(s)}</span><span>${esc(s.room)}</span></div>`).join('')}</div>
    ${att}
    <div class="hist">${hist.length ? `${hist.map((h) => `<span class="g ${gradeClass(h.grade)}" title="${esc(h.term)}">${h.grade}</span>`).join('')}<span class="muted" style="font-size:12px">· ${hist.length + 1}. deneme</span>` : `<span class="badge b-info">İlk kez alıyorsun</span>`}</div>
    <div class="meta">
      <div><div class="k">T+U</div><div class="v">${c.tu}</div></div>
      <div><div class="k">Kredi</div><div class="v">${c.krd}</div></div>
      <div><div class="k">AKTS</div><div class="v">${c.akts}</div></div>
      <div><div class="k">Ort.</div><div class="v">${g.avg != null ? `${g.avg} <span class="g ${gradeClass(g.letter)}">${g.letter}</span>` : '—'}</div></div>
    </div>
  </article>`;
}

function viewCourses() {
  const conflicts = findConflicts(state.sections);
  const F = {
    all: ['Tümü', () => true],
    req: ['Devam zorunlu', needsAttendance],
    alt: ['Alttan', (c) => !needsAttendance(c) || c.alis === 'Devamlı Alttan'],
    lab: ['Laboratuvar', (c) => !!c.lab],
    new: ['İlk kez', (c) => !historyOf(c).length],
  };
  const q = ui.q.trim().toLocaleLowerCase('tr');
  const list = COURSES.filter(F[ui.filter][1]).filter((c) => !q || `${c.code} ${c.old || ''} ${c.name} ${c.teacher}`.toLocaleLowerCase('tr').includes(q));
  return `
  <div class="filters">
    ${Object.entries(F).map(([k, [lbl, fn]]) => `<button type="button" class="fchip" data-act="filter" data-f="${k}" aria-pressed="${ui.filter === k}">${lbl}<span class="n">${COURSES.filter(fn).length}</span></button>`).join('')}
    <label class="search"><span class="sr">Ders ara</span>${icon('search')}<input class="input" type="search" placeholder="Ders, kod veya hoca ara" value="${esc(ui.q)}" data-input="search"></label>
  </div>
  <div class="course-grid" id="courseGrid">${list.length ? list.map((c) => courseCard(c, conflicts)).join('') : `<div class="empty">${icon('search')}<div>Eşleşen ders yok</div></div>`}</div>
  <p class="help" style="margin-top:14px">* Alttan derslerde devam şartı genellikle aranmaz; yine de katıldığın saatleri işaretleyebilirsin.</p>`;
}

/* ============ Ders detayı (çekmece) ============ */
function drawerHtml(c) {
  const conflicts = findConflicts(state.sections);
  const ss = sessionsFor(c), st = attStatus(c), hist = historyOf(c);
  const si = semInfo(), W = state.settings.weeks;
  const cf = conflictsOfCourse(c.code, conflicts);
  const tasks = state.tasks.filter((t) => t.course === c.code);

  const weeks = ss.map((s) => {
    const cells = Array.from({ length: W }, (_, i) => i + 1).map((w) => {
      const v = getAtt(c.code, w, s);
      const date = dateOfWeekDay(w, s.d);
      const future = daysBetween(now(), date) > 0;
      const lbl = `${w}. hafta, ${fmtDate(date, { day: 'numeric', month: 'long' })}: ${v === 'var' ? 'katıldım' : v === 'yok' ? 'katılmadım' : 'işaretlenmedi'}`;
      return `<button type="button" class="att-cell ${v || ''} ${future ? 'future' : ''} ${si.wk === w ? 'cur' : ''}" data-act="attcycle" data-code="${c.code}" data-w="${w}" data-d="${s.d}" data-from="${s.from}" data-to="${s.to}" aria-label="${lbl}" title="${lbl}">
        <span class="wn">${w}</span>${v === 'var' ? icon('check') : v === 'yok' ? icon('x') : ''}</button>`;
    }).join('');
    return `<div class="att-sess"><div class="att-sess-h"><b>${DAYS[s.d]}</b> <span class="mono">${timeRange(s)}</span> <span class="muted">· ${hoursOf(s)} saat</span></div><div class="att-weeks">${cells}</div></div>`;
  }).join('');

  return `
  <header class="dr-head c" style="${cstyle(c)}">
    <button type="button" class="icon-btn close" data-act="close" aria-label="Kapat">${icon('x')}</button>
    <div class="row wrap" style="gap:6px"><span class="chip-code">${c.code}${c.old ? ` [${c.old}]` : ''}</span>${alisBadge(c)}${c.lab ? `<span class="badge b-neutral">${icon('flask')}Laboratuvar</span>` : ''}<span class="badge b-neutral">${c.sinif}. sınıf</span></div>
    <h2 id="drawerTitle">${esc(c.name)}</h2>
    <div class="row" style="gap:6px;color:var(--text-2);font-size:14px">${icon('user')}${esc(c.teacher)}</div>
  </header>
  <div class="dr-body">
    <div class="info-grid">
      <div class="info"><div class="k">T+U saat</div><div class="v">${c.tu} / hafta</div></div>
      <div class="info"><div class="k">Kredi</div><div class="v">${c.krd}</div></div>
      <div class="info"><div class="k">AKTS</div><div class="v">${c.akts}</div></div>
      <div class="info span3"><div class="k">Ders saatleri</div>
        ${ss.map((s) => `<div class="v row wrap" style="gap:8px;margin-top:4px"><span>${DAYS[s.d]}</span><span class="mono">${timeRange(s)}</span><span class="muted" style="font-weight:600">${icon('pin')} ${esc(s.room)}</span></div>`).join('')}
        ${hasSections(c) ? `<div style="margin-top:10px" class="row wrap"><span class="k">Şube${SECTIONS_KNOWN ? '' : ' (henüz açıklanmadı)'}</span><div class="seg" role="group" aria-label="Şube">${secKeys(c).map((k) => `<button type="button" data-act="sec" data-code="${c.code}" data-sec="${k}" aria-pressed="${state.sections[c.code] === k}">${k}${OPTIMAL[c.code] === k ? '<i class="rec" aria-label="önerilen"></i>' : ''}</button>`).join('')}</div></div>` : ''}
      </div>
    </div>
    ${cf.map((x) => { const o = courseByCode[x.a.code === c.code ? x.b.code : x.a.code]; return `<div class="callout ${x.sev === 'kritik' ? 'danger' : x.sev === 'dikkat' ? 'warn' : 'info'}">${icon('alert')}<div><b>${DAYS[x.d]} ${SLOTS[x.from][0]}–${SLOTS[x.to][1]}</b> saatinde <b>${esc(o.name)}</b> ile çakışıyor. ${conflictAdvice(x)}</div></div>`; }).join('')}
    ${!needsAttendance(c) ? `<div class="callout info">${icon('info')}<div>Bu dersi <b>alttan</b> alıyorsun; devam şartını daha önce sağladığın için derse devam zorunluluğun olmaması beklenir. Sınavlara girmen yeterli olabilir — danışmanınla teyit et.</div></div>` : ''}

    <section class="card card-pad">
      <div class="card-h"><h3 class="card-t">${icon('shield')}Devamsızlık</h3>
        <span class="badge ${st.lvl === 'danger' ? 'b-danger' : st.lvl === 'warn' ? 'b-warn' : st.lvl === 'ok' ? 'b-ok' : 'b-neutral'}">${!needsAttendance(c) ? 'Takip isteğe bağlı' : st.lvl === 'danger' ? 'Sınır aşıldı' : `${Math.max(st.left, 0)} saat hakkın kaldı`}</span></div>
      <div class="row between" style="font-size:13.5px;margin-bottom:6px"><span>${st.abs} saat devamsız · ${st.present} saat katıldın</span><span class="muted">Sınır ${st.lim} sa (%${limitPct(c)})</span></div>
      ${progressBar(st.lim ? (st.abs / st.lim) * 100 : 0, st.lvl)}
      <div class="row wrap" style="margin:14px 0 10px;gap:8px">
        <label class="field" style="flex-direction:row;align-items:center;gap:8px"><span class="lbl">Devamsızlık sınırı %</span><input class="input" style="width:84px;min-height:36px" type="number" min="0" max="100" value="${limitPct(c)}" data-input="limit" data-code="${c.code}"></label>
        <span class="help">Toplam ${totalHours(c)} saat (${c.tu} sa × ${W} hafta)</span>
      </div>
      <div class="help" style="margin-bottom:10px">Hafta kutusuna dokun: boş → <span style="color:var(--ok);font-weight:700">katıldım</span> → <span style="color:var(--danger);font-weight:700">katılmadım</span> → boş.</div>
      <div class="att-grid">${weeks}</div>
    </section>

    <section class="card card-pad">
      <div class="card-h"><h3 class="card-t">${icon('target')}Not hesaplama</h3><span class="help">Vize %${state.settings.vizeW} · Final %${100 - state.settings.vizeW}</span></div>
      <div class="grade-inputs">
        ${['vize', 'final', 'but'].map((f) => `<div class="field"><label for="g-${f}">${f === 'but' ? 'Bütünleme' : f[0].toLocaleUpperCase('tr') + f.slice(1)}</label><input id="g-${f}" class="input" type="number" inputmode="numeric" min="0" max="100" placeholder="—" value="${esc(state.grades[c.code]?.[f] ?? '')}" data-input="grade" data-code="${c.code}" data-field="${f}"></div>`).join('')}
      </div>
      <div id="gradeOut" style="margin-top:12px">${gradeOutHtml(c)}</div>
    </section>

    <section class="card card-pad">
      <div class="card-h"><h3 class="card-t">${icon('repeat')}Geçmiş denemeler</h3></div>
      ${hist.length ? `<div class="timeline">${hist.map((h) => `<div class="row between" style="padding:7px 0;border-top:1px dashed var(--border)"><span style="font-size:14px">${esc(h.term)} <span class="mono muted">${h.code}</span></span><span class="g ${gradeClass(h.grade)}">${h.grade}</span></div>`).join('')}</div>
        <p class="help" style="margin:10px 0 0">Bu dönem ${hist.length + 1}. denemen. Yeni notun eski notun yerine geçer ve GNO'na doğrudan yansır.</p>` : `<div class="help">Bu dersi ilk kez alıyorsun.</div>`}
    </section>

    <section class="card card-pad">
      <div class="card-h"><h3 class="card-t">${icon('tasks')}Görevler ve sınavlar</h3></div>
      <form class="row wrap" data-form="task" data-course="${c.code}" style="gap:8px;margin-bottom:10px">
        <input class="input" style="flex:2;min-width:160px" name="title" placeholder="Örn. Vize, 2. ödev…" aria-label="Görev başlığı" required>
        <select class="select input" style="flex:1;min-width:110px" name="type" aria-label="Tür">${TASK_TYPES.map((t) => `<option>${t}</option>`).join('')}</select>
        <input class="input" style="flex:1;min-width:140px" type="date" name="date" aria-label="Tarih">
        <button class="btn btn-primary" type="submit">${icon('plus')}Ekle</button>
      </form>
      ${tasks.length ? tasks.sort(taskSort).map(taskRow).join('') : '<div class="help">Henüz görev yok.</div>'}
    </section>

    <section class="card card-pad">
      <div class="card-h"><h3 class="card-t">${icon('note')}Notlarım</h3><span class="help" id="noteSaved"></span></div>
      <textarea class="input" data-input="note" data-code="${c.code}" placeholder="Kaynak kitap, hocanın e-postası, sınav konuları…" aria-label="Ders notları">${esc(state.notes[c.code] || '')}</textarea>
    </section>
  </div>`;
}

function gradeOutHtml(c) {
  const g = gradeCalc(c.code);
  if (g.v == null) return `<div class="help">Vize notunu girdiğinde finalden kaç alman gerektiğini hesaplarım.</div>`;
  const needs = ['DD', 'CC', 'BB', 'AA'].map((L) => {
    const n = g.need(L);
    return `<div class="info"><div class="k">${L} için final</div><div class="v">${n > 100 ? '<span class="muted">Mümkün değil</span>' : n}</div></div>`;
  }).join('');
  return `${g.avg != null ? `<div class="grade-out"><div><div class="help">Ortalama</div><div class="avg">${g.avg}</div></div><span class="letter ${gradeClass(g.letter)}">${g.letter}</span><div class="help" style="flex:1;min-width:160px">${g.b != null ? 'Bütünleme notu finalin yerine sayıldı. ' : ''}Tahmini harf; bağıl değerlendirmede değişebilir.</div></div>` : ''}
    <div class="info-grid" style="margin-top:10px;grid-template-columns:repeat(4,minmax(0,1fr))">${needs}</div>`;
}

/* ============ AJANDA ============ */
const taskSort = (a, b) => (a.done - b.done) || (a.date || '9999').localeCompare(b.date || '9999');
function taskRow(t) {
  const c = courseByCode[t.course];
  const rd = t.date ? relDay(t.date) : null;
  const overdue = t.date && !t.done && daysBetween(now(), parseDate(t.date)) < 0;
  const soon = t.date && !t.done && daysBetween(now(), parseDate(t.date)) >= 0 && daysBetween(now(), parseDate(t.date)) <= 3;
  const isExam = ['Vize', 'Final', 'Quiz'].includes(t.type);
  return `<div class="task ${t.done ? 'done' : ''}">
    <button type="button" class="check ${t.done ? 'on' : ''}" data-act="toggleTask" data-id="${t.id}" aria-pressed="${!!t.done}" aria-label="Tamamlandı olarak işaretle">${icon('check')}</button>
    <div style="min-width:0">
      <div class="tt-title">${esc(t.title)}</div>
      <div class="tt-meta">
        ${c ? `<span class="chip-code c" style="${cstyle(c)}">${c.code}</span>` : '<span class="badge b-neutral">Genel</span>'}
        <span class="badge ${isExam ? 'b-info' : 'b-neutral'}">${esc(t.type)}</span>
        ${rd ? `<span class="badge ${overdue ? 'b-danger' : soon ? 'b-warn' : 'b-neutral'}">${icon('clock')}${rd}</span>` : ''}
      </div>
    </div>
    <button type="button" class="icon-btn" style="width:36px;height:36px;border:0;background:transparent" data-act="delTask" data-id="${t.id}" aria-label="Sil">${icon('trash')}</button>
  </div>`;
}

function viewTasks() {
  const n = now();
  const open = state.tasks.filter((t) => !t.done).sort(taskSort);
  const groups = [
    ['Gecikmiş', open.filter((t) => t.date && daysBetween(n, parseDate(t.date)) < 0)],
    ['Bu hafta', open.filter((t) => t.date && daysBetween(n, parseDate(t.date)) >= 0 && daysBetween(n, parseDate(t.date)) <= 7)],
    ['Daha sonra', open.filter((t) => t.date && daysBetween(n, parseDate(t.date)) > 7)],
    ['Tarihsiz', open.filter((t) => !t.date)],
  ];
  const done = state.tasks.filter((t) => t.done);
  return `
  <section class="card card-pad">
    <form class="task-form" data-form="task">
      <div class="field"><label for="tTitle">Başlık</label><input id="tTitle" class="input" name="title" placeholder="Örn. Veri Yapıları vizesi" required></div>
      <div class="field"><label for="tCourse">Ders</label><select id="tCourse" class="select input" name="course"><option value="">Genel</option>${COURSES.map((c) => `<option value="${c.code}">${c.code} · ${esc(c.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="tType">Tür</label><select id="tType" class="select input" name="type">${TASK_TYPES.map((t) => `<option>${t}</option>`).join('')}</select></div>
      <div class="field"><label for="tDate">Tarih</label><input id="tDate" class="input" type="date" name="date"></div>
      <button class="btn btn-primary" type="submit" style="min-height:42px">${icon('plus')}Ekle</button>
    </form>
  </section>
  ${state.tasks.length === 0 ? `<div class="card empty" style="margin-top:16px;padding:40px">${icon('tasks')}<div style="font-weight:700;color:var(--text);margin-bottom:4px">Ajandan boş</div><div>Vize tarihlerini, ödevleri ve proje teslimlerini ekle; Bugün ekranında geri sayımı görürsün.</div></div>` : ''}
  ${groups.filter(([, l]) => l.length).map(([t, l]) => `<div class="task-group"><h3>${t}<span class="badge ${t === 'Gecikmiş' ? 'b-danger' : 'b-neutral'}">${l.length}</span></h3>${l.map(taskRow).join('')}</div>`).join('')}
  ${done.length ? `<details class="task-group"><summary style="cursor:pointer;font-size:13px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Tamamlanan (${done.length})</summary>${done.map(taskRow).join('')}</details>` : ''}`;
}

/* ============ AKADEMİK ============ */
function trendNote() {
  const t = TRANSCRIPT.filter((x) => !x.muaf);
  if (t.length < 3) return '';
  const a = t[t.length - 3].gno, b = t[t.length - 1].gno;
  if (Math.abs(b - a) < 0.005) return `Son iki dönemde GNO ${fmt2(b)} seviyesinde kaldı.`;
  return `Son iki dönemde GNO ${fmt2(a)} → ${fmt2(b)} ${b > a ? 'yükseldi' : 'düştü'}.`;
}
function chartHtml(sim) {
  const terms = TRANSCRIPT.filter((t) => !t.muaf);
  const pts = terms.map((t) => ({ label: t.short, gno: t.gno, dno: t.dno, term: t.term }));
  if (sim.count) pts.push({ label: 'Bu dönem*', gno: sim.gno, dno: sim.dno, term: `${STUDENT.term || 'Bu dönem'} (simülasyon)`, proj: true });
  const Wd = 640, Hd = 250, L = 34, R = 14, T = 16, B = 34;
  const iw = Wd - L - R, ih = Hd - T - B, maxY = 3;
  const x = (i) => L + (iw / pts.length) * (i + 0.5);
  const y = (v) => T + ih - (v / maxY) * ih;
  const bw = Math.min(26, (iw / pts.length) * 0.34);
  const grid = [0, 1, 2, 3].map((v) => `<line x1="${L}" x2="${Wd - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--border)" stroke-width="1"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join('');
  const thr = `<line x1="${L}" x2="${Wd - R}" y1="${y(2)}" y2="${y(2)}" stroke="var(--text-3)" stroke-width="1.2" stroke-dasharray="4 4"/><text x="${L + 6}" y="${y(2) - 6}" text-anchor="start" style="font-weight:600">2,00 eşiği</text>`;
  const bars = pts.map((p, i) => `<rect x="${x(i) - bw / 2}" y="${y(p.dno ?? 0)}" width="${bw}" height="${Math.max(0, y(0) - y(p.dno ?? 0))}" rx="4" fill="var(--surface-3)" ${p.proj ? 'stroke="var(--border-strong)" stroke-dasharray="3 3"' : ''}/>`).join('');
  const real = pts.filter((p) => !p.proj);
  const path = real.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.gno)}`).join(' ');
  const projPath = sim.count ? `<path d="M${x(real.length - 1)},${y(real[real.length - 1].gno)} L${x(pts.length - 1)},${y(sim.gno)}" stroke="var(--primary)" stroke-width="2" fill="none" stroke-dasharray="5 5"/>` : '';
  const dots = pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.gno)}" r="5" fill="${p.proj ? 'var(--surface)' : 'var(--primary)'}" stroke="${p.proj ? 'var(--primary)' : 'var(--surface)'}" stroke-width="2"/>`).join('');
  const labels = pts.map((p, i) => (i === 0 || i === pts.length - 1 || p.proj || i === real.length - 1) ? `<text class="val" x="${x(i)}" y="${y(p.gno) - 12}" text-anchor="middle">${fmt2(p.gno)}</text>` : '').join('');
  const xl = pts.map((p, i) => `<text x="${x(i)}" y="${Hd - 12}" text-anchor="middle">${p.label}</text>`).join('');
  const hits = pts.map((p, i) => `<rect class="hit" x="${x(i) - iw / pts.length / 2}" y="${T}" width="${iw / pts.length}" height="${ih}" fill="transparent" tabindex="0" data-i="${i}" aria-label="${esc(p.term)}: GNO ${fmt2(p.gno)}, dönem ortalaması ${fmt2(p.dno)}"/>`).join('');
  return `<div style="position:relative" id="chartBox">
    <svg class="chart" viewBox="0 0 ${Wd} ${Hd}" role="img" aria-label="Dönemlere göre GNO değişimi">${grid}${bars}${thr}<path d="${path}" stroke="var(--primary)" stroke-width="2" fill="none"/>${projPath}${dots}${labels}${xl}${hits}</svg>
    <div class="chart-tip" id="chartTip" hidden></div>
  </div>
  <script type="application/json" id="chartData">${JSON.stringify(pts).replace(/</g, '\\u003c')}</script>`;
}

function viewAcademic() {
  const sim = projection(state.sim);
  const target = state.settings.targetGno;
  const need = requiredDno(target);
  const debts = remainingDebts();
  const cond = conditionalPasses();
  const latest = latestMap();
  const delta = sim.count ? sim.gno - CURRENT.gno : null;
  const simRows = COURSES.map((c) => {
    const old = latest.get(c.old || c.code);
    const g = gradeCalc(c.code);
    return `<div class="sim-row c" style="${cstyle(c)}">
      <div class="nm"><i class="dot"></i><span class="t">${esc(c.name)}</span></div>
      <div class="old">${old ? `önceki <span class="g ${gradeClass(old.grade)}">${old.grade}</span>` : '<span class="badge b-info">yeni</span>'}${g.letter ? ` · tahmin <span class="g ${gradeClass(g.letter)}">${g.letter}</span>` : ''} · ${c.akts} AKTS</div>
      <select class="select input" style="min-height:38px" data-input="sim" data-code="${c.code}" aria-label="${esc(c.name)} için beklenen harf notu">
        <option value="">—</option>${LETTERS.map((L) => `<option ${state.sim[c.code] === L ? 'selected' : ''}>${L}</option>`).join('')}
      </select>
    </div>`;
  }).join('');

  return `
  <div class="kpis">
    <div class="card card-pad kpi"><div class="k">Mevcut GNO</div><div class="v">${fmt2(CURRENT.gno)}</div><div class="s">${CURRENT.akts} AKTS · transkript</div></div>
    <div class="card card-pad kpi"><div class="k">Simülasyon GNO</div><div class="v" style="color:${sim.count ? 'var(--primary)' : 'var(--text-3)'}">${sim.count ? fmt2(sim.gno) : '—'}</div><div class="s">${sim.count ? `<span class="${delta >= 0 ? 'delta-up' : 'delta-down'}">${delta >= 0 ? '▲' : '▼'} ${fmt2(Math.abs(delta))}</span> · ${sim.count}/${COURSES.length} ders` : 'Aşağıdan not seç'}</div></div>
    <div class="card card-pad kpi"><div class="k">Dönem ortalaması (DNO)</div><div class="v">${sim.dno != null ? fmt2(sim.dno) : '—'}</div><div class="s">${SEM_AKTS} AKTS bu dönem</div></div>
    <div class="card card-pad kpi"><div class="k">${fmt2(target)} için gereken DNO</div><div class="v">${need > 4 ? '4,00+' : fmt2(Math.max(need, 0))}</div><div class="s">${need > 4 ? 'Bu dönem tek başına yetmez' : `≈ ortalama ${nearestLetter(need)}`}</div></div>
  </div>
  <div class="acad" style="margin-top:16px">
    <div class="grid">
      <section class="card card-pad">
        <div class="card-h"><h3 class="card-t">${icon('trend')}GNO gelişimi</h3>
          <div class="row" style="gap:14px;font-size:12.5px;color:var(--text-2)"><span class="row" style="gap:6px"><i style="width:16px;height:2px;background:var(--primary);display:inline-block"></i>GNO</span><span class="row" style="gap:6px"><i style="width:10px;height:10px;border-radius:3px;background:var(--surface-3);display:inline-block"></i>DNO</span></div></div>
        ${chartHtml(sim)}
        <p class="help" style="margin:8px 0 0">${trendNote()} ${sim.count ? '* Kesik çizgi simülasyondur.' : 'Simülatörde not seçince tahmini noktayı görürsün.'}</p>
      </section>
      <section class="card card-pad">
        <div class="card-h"><h3 class="card-t">${icon('sparkles')}Not simülatörü</h3><button type="button" class="link-btn" data-act="simFromGrades">Girilen notlardan doldur</button></div>
        <div class="row wrap" style="gap:6px;margin-bottom:12px">
          <span class="help">Hepsini:</span>
          ${['DD', 'CC', 'CB', 'BB', 'BA'].map((L) => `<button type="button" class="btn btn-sm" data-act="simAll" data-l="${L}">${L}</button>`).join('')}
          <button type="button" class="btn btn-sm btn-ghost" data-act="simClear">Temizle</button>
        </div>
        ${simRows}
        <p class="help" style="margin:10px 0 0">Tekrar aldığın derslerde yeni not eskisinin yerine geçer${COURSES.some((c) => c.old) ? ` (${COURSES.filter((c) => c.old).map((c) => `${c.code} → ${c.old}`).join(', ')})` : ''}. Seçilmeyen dersler hesaba eski notuyla girer.</p>
      </section>
    </div>
    <div class="grid sim-sticky">
      <section class="card card-pad">
        <div class="card-h"><h3 class="card-t">${icon('target')}Hedef hesaplayıcı</h3></div>
        <div class="field">
          <label for="tgt">Hedef GNO: <b style="color:var(--text)" id="tgtVal">${fmt2(target)}</b></label>
          <input id="tgt" type="range" min="1.5" max="2.6" step="0.05" value="${target}" data-input="target">
        </div>
        <div class="callout ${need > 4 ? 'danger' : need > 3 ? 'warn' : 'info'}" style="margin-top:12px">${icon('target')}<div>
          ${need > 4 ? `Bu hedef tek dönemde ulaşılabilir değil (gereken DNO ${fmt2(need)}). Bahar dönemiyle birlikte planla.` : `Bu dönemki ${COURSES.length} dersin ortalaması <b>${fmt2(Math.max(need, 0))}</b> olursa GNO'n <b>${fmt2(target)}</b> olur. Örneğin tüm dersler <b>${nearestLetter(need)}</b> ile geçilirse yeterli.`}
        </div></div>
        <div class="help" style="margin-top:10px">Tüm dersler CC → GNO ${fmt2(projection(Object.fromEntries(COURSES.map((c) => [c.code, 'CC']))).gno)} · CB → ${fmt2(projection(Object.fromEntries(COURSES.map((c) => [c.code, 'CB']))).gno)} · BB → ${fmt2(projection(Object.fromEntries(COURSES.map((c) => [c.code, 'BB']))).gno)}</div>
      </section>
      <section class="card card-pad">
        <div class="card-h"><h3 class="card-t">${icon('flag')}Bu dönem dışında kalan dersler</h3><span class="badge b-neutral">${debts.length}</span></div>
        ${['Güz', 'Bahar'].map((sem) => {
          const l = debts.filter((x) => (Number(x.code.slice(-1)) % 2 === 1) === (sem === 'Güz'));
          return l.length ? `<div class="help" style="font-weight:700;margin:6px 0 4px">${sem} dönemi dersleri</div>${l.map((x) => `<div class="row between" style="padding:6px 0;border-top:1px dashed var(--border);font-size:14px"><span><span class="mono muted">${x.code}</span> ${esc(x.name)}</span><span class="row" style="gap:6px"><span class="muted" style="font-size:12px">${x.akts} AKTS</span><span class="g ${gradeClass(x.grade)}">${x.grade}</span></span></div>`).join('')}` : '';
        }).join('')}
        <p class="help" style="margin:10px 0 0">Bahar dersleri çoğunlukla bahar döneminde açılır; müfredatı değişen dersler için karşılığını danışmanına sor.</p>
      </section>
      <section class="card card-pad">
        <div class="card-h"><h3 class="card-t">${icon('info')}Şartlı geçilen dersler</h3><span class="badge b-warn">${cond.length}</span></div>
        <div class="hist">${cond.map((x) => `<span class="badge b-neutral" title="${esc(x.name)}">${x.code} <span class="g g-cond">${x.grade}</span></span>`).join('')}</div>
        <p class="help" style="margin:10px 0 0">DC/DD notları genelde GNO 2,00 ve üzerindeyken başarılı sayılır; GNO'nu yükseltmek bu dersleri de güvenceye alır.</p>
      </section>
      <section>
        <h2 class="section-t" style="margin-top:4px">Transkript</h2>
        ${TRANSCRIPT.slice().reverse().map((t, i) => `<details class="term" ${i === 0 ? 'open' : ''}>
          <summary>${esc(t.term)}<span class="badge b-neutral">DNO ${fmt2(t.dno)}</span><span class="badge b-primary">GNO ${fmt2(t.gno)}</span>${icon('chevron', 'chev')}</summary>
          <div style="overflow-x:auto"><table><thead><tr><th>Kod</th><th>Ders</th><th class="r">AKTS</th><th class="r">Not</th></tr></thead><tbody>
          ${t.courses.map(([code, name, akts, g]) => `<tr><td class="mono">${code}</td><td>${esc(name)}</td><td class="r">${akts}</td><td class="r"><span class="g ${gradeClass(g)}">${g}</span></td></tr>`).join('')}
          </tbody></table></div>
        </details>`).join('')}
      </section>
    </div>
  </div>`;
}

/* ============ AYARLAR ============ */
function viewSettings() {
  const s = state.settings;
  return `
  <div class="set-grid">
    <section class="card card-pad">
      <div class="card-h"><h3 class="card-t">${icon('calendar')}Dönem</h3></div>
      <div class="grid" style="grid-template-columns:1fr 1fr">
        <div class="field"><label for="sStart">Derslerin başladığı gün</label><input id="sStart" class="input" type="date" value="${s.start}" data-input="setting" data-key="start"></div>
        <div class="field"><label for="sWeeks">Hafta sayısı</label><input id="sWeeks" class="input" type="number" min="1" max="20" value="${s.weeks}" data-input="setting" data-key="weeks" data-num></div>
      </div>
      <p class="help" style="margin:10px 0 0">Dönemin ilk haftasının herhangi bir günü olabilir. Hafta sayacı ve yoklama tabloları buna göre hesaplanır.</p>
    </section>
    <section class="card card-pad">
      <div class="card-h"><h3 class="card-t">${icon('shield')}Devamsızlık sınırları</h3></div>
      <div class="grid" style="grid-template-columns:1fr 1fr">
        <div class="field"><label for="sTh">Teorik dersler (%)</label><input id="sTh" class="input" type="number" min="0" max="100" value="${s.theoryLimit}" data-input="setting" data-key="theoryLimit" data-num></div>
        <div class="field"><label for="sLab">Laboratuvar (%)</label><input id="sLab" class="input" type="number" min="0" max="100" value="${s.labLimit}" data-input="setting" data-key="labLimit" data-num></div>
      </div>
      <p class="help" style="margin:10px 0 0">Toplam ders saatinin en fazla bu oranı kadar devamsızlık yapılabilir. Ders bazında çekmeceden ayrıca değiştirebilirsin.</p>
    </section>
    <section class="card card-pad">
      <div class="card-h"><h3 class="card-t">${icon('target')}Not değerlendirme</h3></div>
      <div class="field" style="max-width:220px"><label for="sVize">Vize ağırlığı (%) — final ${100 - s.vizeW}%</label><input id="sVize" class="input" type="number" min="0" max="100" value="${s.vizeW}" data-input="setting" data-key="vizeW" data-num></div>
      <div class="lbl help" style="margin:14px 0 6px;font-weight:650">Harf notu alt sınırları (tahmin için)</div>
      <div class="scale-grid">${LETTERS.slice(0, 8).map((L, i) => `<div class="field"><label for="sc${i}">${L} ≥</label><input id="sc${i}" class="input" type="number" min="0" max="100" value="${s.scale[i]}" data-input="scale" data-i="${i}"></div>`).join('')}</div>
    </section>
    <section class="card card-pad">
      <div class="card-h"><h3 class="card-t">${icon('monitor')}Görünüm</h3></div>
      <div class="seg" role="group" aria-label="Tema">
        ${[['system', 'Sistem', 'monitor'], ['light', 'Açık', 'sun'], ['dark', 'Koyu', 'moon']].map(([k, l, ic]) => `<button type="button" data-act="theme" data-theme="${k}" aria-pressed="${s.theme === k}"><span class="row" style="gap:6px">${icon(ic)}${l}</span></button>`).join('')}
      </div>
      <div class="card-h" style="margin:22px 0 10px"><h3 class="card-t">${icon('download')}Veriler</h3></div>
      <p class="help" style="margin:0 0 10px">Tüm kayıtlar yalnızca bu tarayıcıda saklanır${saveOk ? '' : ' — <b style="color:var(--danger)">şu an kaydedilemiyor</b>'}. Başka cihaza taşımak için yedek al.</p>
      <div class="row wrap">
        <button type="button" class="btn" data-act="export">${icon('download')}Yedeği indir</button>
        <label class="btn" style="cursor:pointer">${icon('upload')}Yedek yükle<input type="file" accept="application/json" hidden data-input="import"></label>
        <button type="button" class="btn btn-ghost btn-danger" data-act="reset">${icon('trash')}Sıfırla</button>
      </div>
      <div class="card-h" style="margin:22px 0 10px"><h3 class="card-t">${icon('shield')}Güvenlik</h3></div>
      <p class="help" style="margin:0 0 10px">${window.hasRememberedKey && window.hasRememberedKey() ? 'Bu cihaz şifreni hatırlıyor. Ortak bir cihazdaysan kilitle.' : 'Sayfa her açılışta şifre ister.'}</p>
      <button type="button" class="btn" data-act="lock">${icon('shield')}Kilitle ve şifreyi unut</button>
    </section>
  </div>`;
}
