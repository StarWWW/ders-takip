/* ============ Ortak parçalar ============ */
const ui = { filter: 'all', q: '', day: null };
const sm = (s) => toMin(SLOTS[s.from][0]);
const em = (s) => toMin(SLOTS[s.to][1]);

function daySessions(d) {
  return allSessions().filter((s) => s.d === d)
    .sort((a, b) => a.from - b.from || needsAttendance(courseByCode[b.code]) - needsAttendance(courseByCode[a.code]));
}
// Belirli bir tarihteki oturumlar (resmi tatile denk gelenler hariç)
function dateSessions(date) {
  const d = dayIdx(date);
  return d > 4 ? [] : daySessions(d).filter((s) => !sessionHoliday(date, s));
}
const fmtRange = (e) => (e.bas === e.bit ? fmtDate(parseDate(e.bas), { day: 'numeric', month: 'long' })
  : `${fmtDate(parseDate(e.bas), { day: 'numeric', month: 'short' })} – ${fmtDate(parseDate(e.bit), { day: 'numeric', month: 'short' })}`);
const EVENT_ICON = { sinav: 'target', tatil: 'coffee', kayit: 'note', donem: 'flag' };
function eventRow(e) {
  const n = now(), started = e.bas <= isoDate(n), left = daysBetween(n, parseDate(started ? e.bit : e.bas));
  const rel = started ? (left === 0 ? 'Bugün bitiyor' : `Sürüyor · ${left} gün kaldı`) : left === 0 ? 'Bugün' : left === 1 ? 'Yarın' : `${left} gün sonra`;
  return `<div class="task event">
    <div class="ev-ic ev-${e.tur}" aria-hidden="true">${icon(EVENT_ICON[e.tur] || 'calendar')}</div>
    <div style="min-width:0">
      <div class="tt-title">${esc(e.ad)}</div>
      <div class="tt-meta"><span class="badge b-neutral">${e.tur === 'tatil' ? 'Resmi tatil' : 'Akademik takvim'}</span><span>${fmtRange(e)}</span><span class="badge ${started || left <= 3 ? 'b-warn' : 'b-neutral'}">${icon('clock')}${rel}</span></div>
    </div>
    <span></span>
  </div>`;
}
function semInfo(n = now()) {
  const wk = weekOf(n), W = state.settings.weeks;
  return { wk, W, before: wk < 1, after: wk > W, inSem: wk >= 1 && wk <= W };
}
function alisBadge(c) {
  if (c.alis === 'Zorunlu') return `<span class="badge b-primary">${icon('shield')}Devam zorunlu</span>`;
  if (c.alis === 'Devamlı Alttan') return `<span class="badge b-warn">${icon('repeat')}Devamlı alttan</span>`;
  return `<span class="badge b-neutral" title="${repeatRule() === 'bolum' ? 'Bölüm kurulu kararıyla bu derste de devam zorunlu' : 'Yönetmelik md. 20: devam şartı aranmaz; ara sınav ve yarıyıl içi etkinliklere katılım zorunlu'}">${icon('repeat')}Alttan</span>`;
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
    const isToday = daysBetween(n, date) === 0;
    for (const s of dateSessions(date)) if (!isToday || sm(s) > mins) return { s, date };
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
    const ev = calendarEvents().filter((e) => e.tur === 'sinav' && e.bit >= isoDate(n))[0];
    return `<section class="hero neutral"><div class="hero-k">${icon('flag')} Güz yarıyılı eğitimi tamamlandı</div>
      <div class="hero-name">${ev ? esc(ev.ad) : 'Sınav dönemi'}</div>
      <div class="hero-meta">${ev ? `<span>${icon('calendar')}${fmtRange(ev)}</span>` : ''}<span>Sınav programı bölüm tarafından en az iki hafta önce ilan edilir (yönetmelik md. 21).</span></div></section>`;
  }
  const hol = si.inSem && d <= 4 ? holidayOn(n) : null;
  const todays = si.inSem ? dateSessions(startOfDay(n)) : [];
  const cur = todays.filter((s) => sm(s) <= mins && mins < em(s));
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
  if (hol && !todays.some((s) => sm(s) > mins)) {
    return `<section class="hero neutral"><div class="hero-k">${icon('coffee')} Resmi tatil</div>
      <div class="hero-name">${esc(hol.ad)}</div>
      <div class="hero-meta"><span>${hol.saat ? `${hol.saat}'ten sonra ders yapılmaz.` : 'Bugün ders yapılmaz.'}</span>${nx ? `<span>${icon('clock')}Sıradaki: ${esc(courseByCode[nx.s.code].name)} · ${fmtDate(nx.date, { weekday: 'long' })} ${SLOTS[nx.s.from][0]}</span>` : ''}</div></section>`;
  }
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
  const list = dateSessions(date);
  const hol = holidayOn(date);
  const holNote = hol ? `<div class="callout info" style="margin-bottom:12px">${icon('coffee')}<div><b>${esc(hol.ad)}</b> — ${hol.saat ? `${hol.saat}'ten sonraki dersler yapılmaz` : 'resmi tatil, ders yapılmaz'}.</div></div>` : '';
  if (!list.length) return `${holNote}<div class="empty">${icon('coffee')}<div>Bu gün ders yok</div></div>`;
  return `${holNote}<div class="timeline">${list.map((s) => {
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
  const showToday = si.inSem && d <= 4 && (dateSessions(startOfDay(n)).length || holidayOn(n));
  const tDate = showToday ? startOfDay(n) : nx ? nx.date : null;
  const tTitle = !tDate ? 'Program' : daysBetween(n, tDate) === 0 ? 'Bugünün programı' : daysBetween(n, tDate) === 1 ? 'Yarının programı' : `${fmtDate(tDate, { weekday: 'long' })} programı`;
  const tSub = tDate ? fmtDate(tDate, { day: 'numeric', month: 'long' }) : '';
  const hoursToday = dateSessions(startOfDay(n)).reduce((a, s) => a + hoursOf(s), 0);
  const budgets = conflicts.map((cf) => ({ cf, b: conflictBudget(cf) }));
  const infeasible = budgets.filter((x) => !x.b.feasible);
  const regEvent = activeEvents(n, 'kayit')[0];
  const events = upcomingEvents(n, 45).filter((e) => e.tur !== 'donem' || e.bas >= isoDate(n)).slice(0, 3);

  const sevCount = { kritik: 0, dikkat: 0, dusuk: 0 };
  conflicts.forEach((c) => sevCount[c.sev]++);

  const req = COURSES.filter(needsAttendance).map((c) => ({ c, st: attStatus(c) })).sort((a, b) => b.st.ratio - a.st.ratio);
  const upcoming = state.tasks.filter((t) => !t.done).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')).slice(0, 3);
  const need = requiredDno(state.settings.targetGno);
  const sim = projection(state.sim);

  return `
  ${installBannerHtml()}
  <div class="hello">
    <h2>${greeting(n.getHours())}, ${esc(STUDENT.firstName)}</h2>
    <p>${fmtDate(n, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${si.before ? `Dönem ${fmtDate(semesterStart(), { day: 'numeric', month: 'long' })} tarihinde başlıyor` : si.after ? 'Güz eğitimi sona erdi' : d > 4 ? 'Hafta sonu, iyi dinlen' : holidayOn(n) && !hoursToday ? 'Resmi tatil' : `Bugün ${hoursToday} saat dersin var`}</p>
  </div>
  ${regEvent && infeasible.length ? `<div class="callout danger" style="margin-bottom:16px">${icon('alert')}<div><b>${esc(regEvent.ad)} ${fmtDate(parseDate(regEvent.bit), { day: 'numeric', month: 'long' })}'de bitiyor.</b> Seçtiğin derslerde ${infeasible.length} çakışmada iki dersin devam şartı aynı anda sağlanamıyor (${infeasible.map((x) => `${esc(courseByCode[x.cf.a.code].name)} × ${esc(courseByCode[x.cf.b.code].name)}`).join('; ')}). Süre dolmadan danışmanınla görüş. <a href="#program">Ayrıntılar</a></div></div>` : regEvent ? `<div class="callout info" style="margin-bottom:16px">${icon('note')}<div><b>${esc(regEvent.ad)}</b> ${fmtDate(parseDate(regEvent.bit), { day: 'numeric', month: 'long' })}'de bitiyor.</div></div>` : ''}
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
          <div class="help">${infeasible.length ? `${infeasible.length} çakışmada iki dersin devamsızlık hakları toplamı çakışan saatlerden az; iki derste de devam şartını sağlamak mümkün değil.` : sevCount.kritik ? 'Devam zorunlu iki ders aynı saatte; devamsızlık haklarını dikkatli kullan.' : 'Devam zorunlu derslerin birbiriyle çakışmıyor.'} ${repeatRule() === 'bolum' ? 'Bölüm kurulu kararına göre tüm derslerde devam zorunlu.' : ''}</div>`
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
        <div class="help" style="margin-top:10px">Yoklamayı programdaki ✓ / ✕ düğmeleriyle işaretle. Yönetmelik md. 20: derslere en az %70, uygulamalara en az %80 devam; resmi tatiller hesaba katılmaz.</div>
      </section>
      ${studyOwners().length && !si.after ? (() => { const tw = thisWeekRows(4); return `<section class="card card-pad">
        <div class="card-h"><h3 class="card-t">${icon('bookOpen')}Bu hafta çalış</h3><a class="link-btn" href="#calisma">Konular ${icon('arrow')}</a></div>
        ${tw.allDone ? `<div class="callout ok">${icon('check')}<div>${tw.wk}. haftanın bütün konularını çalıştın.</div></div>` : `<div class="tw-list">${tw.html}</div><div class="help" style="margin-top:8px">${tw.wk}. hafta · ${tw.done}/${tw.total} konu tamam</div>`}
      </section>`; })() : ''}
      <section class="card card-pad">
        <div class="card-h"><h3 class="card-t">${icon('tasks')}Yaklaşanlar</h3><a class="link-btn" href="#ajanda">${icon('plus')}Ekle</a></div>
        ${events.map(eventRow).join('')}
        ${upcoming.length ? upcoming.map(taskRow).join('') : `<div class="empty" style="padding:14px">${icon('tasks')}<div>Vize tarihleri ilan edilince Ajanda'ya "Vize" olarak ekle.</div></div>`}
      </section>
      <section class="card card-pad">
        <div class="card-h"><h3 class="card-t">${icon('cap')}GNO hedefi</h3><a class="link-btn" href="#akademik">Simülatör ${icon('arrow')}</a></div>
        <div class="gno-mini">
          <div><div class="muted" style="font-size:12.5px;font-weight:650">Şu anki GNO</div><div class="v">${fmt2(CURRENT.gno)}</div></div>
          ${sim.count ? `<div class="arrow">${icon('arrow')}</div><div><div class="muted" style="font-size:12.5px;font-weight:650">Simülasyon</div><div class="v" style="color:var(--primary)">${fmt2(sim.gno)}</div></div>` : ''}
        </div>
        <div class="callout info" style="margin-top:14px">${icon('target')}<div><b>${fmt2(state.settings.targetGno)}</b> GNO için bu dönem ortalaman en az <b>${fmt2(need)}</b> olmalı; örneğin bütün derslerden en az <b>${nearestLetter(need)}</b> almak bunu sağlar.</div></div>
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
    const hol = holidayOn(dateOfWeekDay(dispWeek, d));
    const holTop = hol?.saat ? yOf(toMin(hol.saat)) : 0;
    const holBand = hol ? `<div class="tt-holiday" style="top:${holTop}px;height:${H - holTop}px"><span>${esc(hol.ad)}</span></div>` : '';
    return `<div class="tt-day ${isToday ? 'today' : ''}" style="height:${H}px">${lines}${lunch}${blocks}${holBand}${nowLine}</div>`;
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
      <span><i class="lg-sw dash"></i>Alttan alınan ders</span>
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
  const dayDate = dateOfWeekDay(dispWeek, ui.day);
  const list = dateSessions(dayDate);
  const dayHol = holidayOn(dayDate);
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
    <div class="card card-pad">${dayHol ? `<div class="callout info" style="margin-bottom:12px">${icon('coffee')}<div><b>${esc(dayHol.ad)}</b> — ${dayHol.saat ? `${dayHol.saat}'ten sonra ders yok` : 'ders yok'}.</div></div>` : ''}${list.length ? `<div class="timeline">${items}</div>` : `<div class="empty">${icon('coffee')}<div>Bu gün ders yok</div></div>`}</div></div>`;
}

function attendanceRuleHtml(compact) {
  const k = KURALLAR.devamKarari;
  if (repeatRule() === 'bolum') {
    return `<div class="callout warn" style="margin-bottom:12px">${icon('shield')}<div><b>Tüm derslerde devam zorunlu.</b> ${k ? `Bölüm Kurulu ${fmtDate(parseDate(k.tarih), { day: 'numeric', month: 'long', year: 'numeric' })} tarihli kararıyla 2025–2026 Bahar döneminden itibaren bölümdeki tüm derslerde devam zorunluluğu uygulanıyor; devam şartını sağlamayan öğrenci o dersten devamsızlık nedeniyle başarısız sayılıyor.` : ''}${compact ? '' : ' Yönetmelik (md. 20) tekrar alınan derslerde devam şartı aramasa da bölüm kararı alttan aldığın dersleri de kapsıyor. Uygulamayı danışmanına teyit ettirmen iyi olur; kural Ayarlar\'dan değiştirilebilir.'}${k?.url ? ` <a href="${esc(k.url)}" target="_blank" rel="noopener noreferrer">Duyuru ${icon('external')}</a>` : ''}</div></div>`;
  }
  return `<div class="callout info" style="margin-bottom:12px">${icon('shield')}<div><b>Yönetmelik md. 20 uygulanıyor:</b> derse devamını daha önce sağladığın alttan derslerde devam şartı aranmaz; ancak ara sınavlara ve nota katkısı olan tüm yarıyıl içi etkinliklere katılman zorunlu. ${k ? '<b>Dikkat:</b> bölüm kurulunun tüm derslerde devam zorunluluğu kararı var; bu seçim ona göre riskli olabilir.' : ''}</div></div>`;
}

function conflictAdvice(cf) {
  const A = courseByCode[cf.a.code], B = courseByCode[cf.b.code];
  const b = conflictBudget(cf);
  const math = `Dönem boyunca çakışan süre ${b.overlap} saat; devamsızlık hakların ${esc(A.name)} için ${b.limA}, ${esc(B.name)} için ${b.limB} saat.`;
  if (cf.sev === 'kritik') {
    return b.feasible
      ? `İki ders de devam zorunlu. ${math} Bu çakışma için iki dersin haklarından toplam ${b.overlap} saat kullanman gerekir; iki derste birlikte ${b.limA + b.limB - b.overlap} saatlik başka devamsızlık hakkın kalır.`
      : `<b>İki derste de devam şartı aynı anda sağlanamaz.</b> ${math} Şube değişikliği bu çakışmayı çözmüyorsa danışmanınla görüş.`;
  }
  if (cf.sev === 'dikkat') {
    const req = needsAttendance(A) ? A : B, alt = req === A ? B : A;
    return `<b>${esc(req.name)}</b> dersine git (devam zorunlu). <b>${esc(alt.name)}</b> için devam şartı yok ama ara sınav ve nota katkısı olan etkinliklere katılman gerekir (yönetmelik md. 20).`;
  }
  return `İki derste de devam şartı yok (yönetmelik md. 20); ara sınavlara ve nota katkısı olan etkinliklere katılman yeterli.`;
}

function viewProgram() {
  const conflicts = findConflicts(state.sections);
  const isOptimal = COURSES.filter(hasSections).every((c) => state.sections[c.code] === getOptimal()[c.code]);
  const totalCfHours = conflicts.reduce((a, c) => a + c.hours, 0);
  const crit = conflicts.filter((c) => c.sev === 'kritik').length;

  const secPanel = COURSES.filter(hasSections).map((c) => {
    const cur = state.sections[c.code];
    return `<div class="sec-item c" style="${cstyle(c)}">
      <div class="top"><i class="dot"></i><span class="nm">${esc(c.name)}</span></div>
      <div class="seg" role="group" aria-label="${esc(c.name)} şubesi">${secKeys(c).map((k) => `<button type="button" data-act="sec" data-code="${c.code}" data-sec="${k}" aria-pressed="${cur === k}" title="${getOptimal()[c.code] === k ? 'Önerilen şube' : ''}">${k}${getOptimal()[c.code] === k ? '<i class="rec" aria-label="önerilen"></i>' : ''}</button>`).join('')}</div>
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
  ${attendanceRuleHtml(false)}
  ${gridHtml(conflicts)}
  ${agendaHtml(conflicts)}
  <h2 class="section-t">Şube seçimi</h2>
  ${SECTIONS_KNOWN
    ? `<div class="callout ok" style="margin-bottom:12px">${icon('check')}<div>Şubelerin bölümün açıkladığı listeye göre ayarlandı. Değişiklik olursa aşağıdan güncelleyebilirsin.</div></div>`
    : `<div class="callout warn" style="margin-bottom:12px">${icon('info')}<div><b>Şubeler henüz açıklanmadı.</b> Şimdilik çakışmayı en aza indiren düzen gösteriliyor (<span style="color:var(--primary)">●</span> önerilen). Şuben açıklanınca buradan seçebilirsin; yoklama kayıtların kaybolmaz.</div></div>`}
  <div class="sec-panel">${secPanel}</div>
  <h2 class="section-t">Çakışmalar ve öneriler</h2>
  <div class="conf-list">${confList}</div>
  <p class="help" style="margin-top:14px">Devamsızlık hakları yönetmelik md. 20'ye göre (derslere %70, uygulamalara %80 devam) ${state.settings.weeks} haftalık dönemin gerçek ders saatlerinden, resmi tatiller çıkarılarak hesaplanır. Ders saatleri ve derslikler bölümün 07.09.2026 tarihli ders programından alınmıştır.</p>`;
}

/* ============ DERSLER ============ */
function courseCard(c, conflicts) {
  const ss = sessionsFor(c), st = attStatus(c), hist = historyOf(c), g = gradeCalc(c.code);
  const cf = conflictsOfCourse(c.code, conflicts);
  const worst = cf.some((x) => x.sev === 'kritik') ? 'b-danger' : cf.some((x) => x.sev === 'dikkat') ? 'b-warn' : 'b-neutral';
  const att = needsAttendance(c)
    ? `<div class="att"><div class="row"><span>Devamsızlık</span><b style="color:var(--text)">${st.abs} / ${st.lim} saat</b></div>${progressBar(st.lim ? (st.abs / st.lim) * 100 : 0, st.lvl)}</div>`
    : `<div class="att"><div class="row"><span>Devam şartı yok (md. 20)</span><span>${st.present + st.abs ? `${st.present} sa katıldın` : ''}</span></div></div>`;
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
  ${attendanceRuleHtml(true)}`;
}

/* ============ Ders detayı (çekmece) ============ */
function drawerHtml(c) {
  const conflicts = findConflicts(state.sections);
  const ss = sessionsFor(c), st = attStatus(c), hist = historyOf(c);
  const si = semInfo(), W = state.settings.weeks;
  const cf = conflictsOfCourse(c.code, conflicts);
  const tasks = state.tasks.filter((t) => t.course === c.code);
  const gp = gradeParts(c);
  const owner = studyOwner(c), topics = studyTopics(c);
  const curWk = clamp(weekOf(now()), 1, W);
  const curTopic = topics.find((h) => h.h === curWk);
  const vStats = topics.length ? studyStats(c, 'vize') : null, aStats = topics.length ? studyStats(c, 'tum') : null;

  const weeks = ss.map((s) => {
    const cells = Array.from({ length: W }, (_, i) => i + 1).map((w) => {
      const v = getAtt(c.code, w, s);
      const date = dateOfWeekDay(w, s.d);
      const future = daysBetween(now(), date) > 0;
      const hol = sessionHoliday(date, s);
      if (hol) return `<span class="att-cell holiday" title="${w}. hafta, ${esc(hol.ad)}: ders yok" aria-label="${w}. hafta, resmi tatil"><span class="wn">${w}</span>${icon('coffee')}</span>`;
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
        ${hasSections(c) ? `<div style="margin-top:10px" class="row wrap"><span class="k">Şube${SECTIONS_KNOWN ? '' : ' (henüz açıklanmadı)'}</span><div class="seg" role="group" aria-label="Şube">${secKeys(c).map((k) => `<button type="button" data-act="sec" data-code="${c.code}" data-sec="${k}" aria-pressed="${state.sections[c.code] === k}">${k}${getOptimal()[c.code] === k ? '<i class="rec" aria-label="önerilen"></i>' : ''}</button>`).join('')}</div></div>` : ''}
      </div>
    </div>
    ${cf.map((x) => { const o = courseByCode[x.a.code === c.code ? x.b.code : x.a.code]; return `<div class="callout ${x.sev === 'kritik' ? 'danger' : x.sev === 'dikkat' ? 'warn' : 'info'}">${icon('alert')}<div><b>${DAYS[x.d]} ${SLOTS[x.from][0]}–${SLOTS[x.to][1]}</b> saatinde <b>${esc(o.name)}</b> ile çakışıyor. ${conflictAdvice(x)}</div></div>`; }).join('')}
    ${c.uyari ? `<div class="callout warn">${icon('pin')}<div>${esc(c.uyari)}</div></div>` : ''}
    ${c.alis === 'Alttan' ? (repeatRule() === 'bolum'
      ? `<div class="callout warn">${icon('shield')}<div>Bu dersi <b>alttan</b> alıyorsun. Yönetmelik (md. 20) tekrar alınan derslerde devam şartı aramaz; ancak bölüm kurulu kararıyla bölümdeki tüm derslerde devam zorunlu. Devamsızlığını buna göre takip et.</div></div>`
      : `<div class="callout info">${icon('info')}<div>Bu dersi <b>alttan</b> alıyorsun. Yönetmelik md. 20'ye göre devam şartı aranmaz; ama ara sınavlara ve nota katkısı olan tüm yarıyıl içi etkinliklere katılman zorunlu.</div></div>`) : ''}

    ${topics.length ? `<section class="card card-pad">
      <div class="card-h"><h3 class="card-t">${icon('bookOpen')}Çalışılacak konular</h3><button type="button" class="link-btn" data-act="gotoStudy" data-code="${owner.code}">Tümü ${icon('arrow')}</button></div>
      ${owner !== c ? `<p class="help" style="margin:-6px 0 10px">${esc(owner.name)} dersiyle ortak konular.</p>` : ''}
      <div class="row wrap" style="gap:14px;margin-bottom:10px">
        <div style="flex:1;min-width:140px"><div class="help">${vizeInfo(c) ? `Vize konuları (${vizeInfo(c).date ? fmtDate(parseDate(vizeInfo(c).date), { day: 'numeric', month: 'short' }) : `${vizeInfo(c).week}. hafta`} öncesi)` : 'Vize tarihi girilmedi'}</div><b>${vStats.done}/${vStats.total}</b>${progressBar(vStats.total ? (vStats.done / vStats.total) * 100 : 0, 'x')}</div>
        <div style="flex:1;min-width:140px"><div class="help">Tüm dönem</div><b>${aStats.done}/${aStats.total}</b>${progressBar(aStats.total ? (aStats.done / aStats.total) * 100 : 0, 'x')}</div>
      </div>
      ${curTopic ? `<div class="tw-row c" style="${cstyle(owner)}">${studyCheck(owner.code, curWk, true)}<div class="tw-main"><div class="tw-course">${curWk}. hafta · bu hafta</div><div class="tw-topic">${esc(curTopic.konu)}</div></div></div>` : ''}
      ${evalChips(c) ? `<div style="margin-top:10px">${evalChips(c)}</div>` : ''}
    </section>` : ''}

    <section class="card card-pad">
      <div class="card-h"><h3 class="card-t">${icon('shield')}Devamsızlık</h3>
        <span class="badge ${st.lvl === 'danger' ? 'b-danger' : st.lvl === 'warn' ? 'b-warn' : st.lvl === 'ok' ? 'b-ok' : 'b-neutral'}">${!needsAttendance(c) ? 'Takip isteğe bağlı' : st.lvl === 'danger' ? 'Sınır aşıldı' : `${Math.max(st.left, 0)} saat hakkın kaldı`}</span></div>
      <div class="row between" style="font-size:13.5px;margin-bottom:6px"><span>${st.abs} saat devamsız · ${st.present} saat katıldın</span><span class="muted">Sınır ${st.lim} sa (%${limitPct(c)})</span></div>
      ${progressBar(st.lim ? (st.abs / st.lim) * 100 : 0, st.lvl)}
      <div class="row wrap" style="margin:14px 0 10px;gap:8px">
        <label class="field" style="flex-direction:row;align-items:center;gap:8px"><span class="lbl">Devamsızlık sınırı %</span><input class="input" style="width:84px;min-height:36px" type="number" min="0" max="100" value="${limitPct(c)}" data-input="limit" data-code="${c.code}"></label>
        <span class="help">Toplam ${totalHours(c)} saat (${W} hafta, resmi tatiller hariç)</span>
      </div>
      ${c.devamNot ? `<p class="help" style="margin:0 0 10px">${esc(c.devamNot)}</p>` : ''}
      <div class="help" style="margin-bottom:10px">Hafta kutusuna dokun: boş → <span style="color:var(--ok);font-weight:700">katıldım</span> → <span style="color:var(--danger);font-weight:700">katılmadım</span> → boş.</div>
      <div class="att-grid">${weeks}</div>
    </section>

    <section class="card card-pad">
      <div class="card-h"><h3 class="card-t">${icon('target')}Not hesaplama</h3><span class="help">${gp.official ? 'Bilgi paketindeki oranlar' : 'Varsayılan oranlar'}</span></div>
      <div class="grade-inputs">
        ${[...gp.parts, { key: 'but', label: 'Bütünleme', pct: null }].map((p) => `<div class="field"><label for="g-${p.key}">${esc(p.label)}${p.pct != null ? ` <span class="muted">%${p.pct}</span>` : ''}</label><input id="g-${p.key}" class="input" type="number" inputmode="numeric" min="0" max="100" placeholder="—" value="${esc(state.grades[c.code]?.[p.key] ?? '')}" data-input="grade" data-code="${c.code}" data-field="${p.key}"></div>`).join('')}
      </div>
      ${gp.parts.some((p) => p.count > 1) ? '<p class="help" style="margin:8px 0 0">Birden fazla olan bileşenlerde ortalamasını gir.</p>' : ''}
      <p class="help" style="margin:8px 0 0">Finale girebilmek için ara sınava girmiş olman ve devam şartını sağlaman gerekir (yönetmelik md. 23). Bütünleme notu finalin yerine geçer; devamsızlıktan kalınan derste bütünlemeye girilemez (md. 21).</p>
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
  if (g.missing.length) {
    return `<div class="help">${g.anyEntered ? `Finalden kaç alman gerektiğini hesaplamak için ${g.missing.map(esc).join(', ')} notunu da gir.` : `${g.parts.filter((p) => p.key !== 'final').map((p) => esc(p.label)).join(' ve ')} notlarını girdiğinde finalden kaç alman gerektiğini hesaplarım.`}</div>`;
  }
  const needs = ['DD', 'CC', 'BB', 'AA'].map((L) => {
    const n = g.need(L);
    return `<div class="info"><div class="k">${L} için final</div><div class="v">${n > 100 ? '<span class="muted">Mümkün değil</span>' : n}</div></div>`;
  }).join('');
  return `${g.avg != null ? `<div class="grade-out"><div><div class="help">Ham başarı notu</div><div class="avg">${g.avg.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</div></div><span class="letter ${gradeClass(g.letter)}">${g.letter}</span><div class="help" style="flex:1;min-width:160px">${g.b != null ? 'Bütünleme notu finalin yerine sayıldı. ' : ''}Harf, yönetmelik md. 24'teki mutlak değerlendirme tablosuna göredir. Hoca bağıl değerlendirme kullanırsa harf notu sınıfın dağılımına göre verilir.${g.avg % 1 && state.settings.scale.some((t) => Math.abs(t - g.avg) < 1) ? ' Tablo tam sayı aralıkları verir; küsuratın yuvarlanıp yuvarlanmadığı yönetmelikte yazmadığı için sınırdaki notlarda harf farklı çıkabilir.' : ''}</div></div>` : ''}
    <div class="info-grid" style="margin-top:10px;grid-template-columns:repeat(4,minmax(0,1fr))">${needs}</div>`;
}

/* ============ ÇALIŞMA ============ */
const BOLOGNA_URL = (id) => (window.UNIVERSITE?.bologna ? `${window.UNIVERSITE.bologna}${encodeURIComponent(id)}` : '');
const UNI = () => window.UNIVERSITE?.kisaAd || '';
if (!ui.studyOpen) ui.studyOpen = new Set();

function studyTabsHtml(active) {
  const overdue = state.tasks.filter((t) => !t.done && t.date && daysBetween(now(), parseDate(t.date)) < 0).length;
  const open = state.tasks.filter((t) => !t.done).length;
  return `<nav class="seg study-tabs" aria-label="Çalışma bölümleri">
    <a href="#calisma" ${active === 'calisma' ? 'aria-current="page"' : ''}>${icon('bookOpen')}Konular</a>
    <a href="#ajanda" ${active === 'ajanda' ? 'aria-current="page"' : ''}>${icon('tasks')}Ajanda${open ? `<span class="n ${overdue ? 'late' : ''}">${open}</span>` : ''}</a>
  </nav>`;
}
function studyScope() {
  if (ui.studyScopeSel) return ui.studyScopeSel;
  const anyVize = studyOwners().some((c) => vizeInfo(c));
  return anyVize && studyOwners().some((c) => { const v = vizeInfo(c); return v && weekOf(now()) < v.week; }) ? 'vize' : 'tum';
}
function weekLabel(w) {
  return fmtDate(dateOfWeekDay(w, 0), { day: 'numeric', month: 'short' });
}
function studyDoneBtn(code, h) {
  const m = studyMark(code, h) || {};
  return `<button type="button" class="check ${m.d ? 'on' : ''}" data-act="studyDone" data-code="${code}" data-w="${h}" aria-pressed="${!!m.d}" aria-label="${h}. hafta konusunu çalıştım olarak işaretle" title="Çalıştım">${icon('check')}</button>`;
}
function studyFlagBtn(code, h) {
  const m = studyMark(code, h) || {};
  return `<button type="button" class="flag ${m.r ? 'on' : ''}" data-act="studyReview" data-code="${code}" data-w="${h}" aria-pressed="${!!m.r}" aria-label="${h}. hafta konusunu tekrar edilecek olarak işaretle" title="Tekrar et">${icon('bookmark')}</button>`;
}
const studyCheck = (code, h, compact) => studyDoneBtn(code, h) + (compact ? '' : studyFlagBtn(code, h));
function topicRow(c, h) {
  const owner = studyOwner(c).code, m = studyMark(owner, h.h) || {};
  const cur = weekOf(now());
  const isCur = h.h === cur, behind = !m.d && h.h < cur;
  const prep = [h.hazirlik, h.dokuman].filter(Boolean).filter((x) => !/^sınav$/i.test(x)).join(' · ');
  return `<li class="topic ${isCur ? 'cur' : ''} ${behind ? 'behind' : ''} ${m.d ? 'done' : ''}">
    ${studyDoneBtn(owner, h.h)}
    <div class="topic-main">
      <div class="topic-meta"><span class="wk">${h.h}. hafta</span><span>${weekLabel(h.h)}</span>${isCur ? '<span class="badge b-primary">Bu hafta</span>' : ''}${h.sinav ? '<span class="badge b-info">Sınav haftası</span>' : ''}${m.r ? `<span class="badge b-warn">${icon('bookmark')}Tekrar</span>` : ''}</div>
      <div class="topic-title">${esc(h.konu)}</div>
      ${prep ? `<div class="topic-prep">${esc(prep)}</div>` : ''}
    </div>
    ${studyFlagBtn(owner, h.h)}
  </li>`;
}
function evalChips(c) {
  const { official, parts } = gradeParts(c);
  if (!official) return '';
  return `<div class="eval-chips">${parts.map((p) => `<span class="badge b-neutral">${esc(p.label)}${p.count > 1 ? ` ×${p.count}` : ''} %${p.pct}</span>`).join('')}</div>`;
}
function studyCourseHtml(c, scope) {
  const st = c.study, stats = studyStats(c, scope);
  const list = studyScopeTopics(c, scope);
  const vz = vizeInfo(c), mw = vz?.week;
  const pct = stats.total ? (stats.done / stats.total) * 100 : 0;
  const labs = COURSES.filter((x) => x.study?.ortak === c.code);
  const open = ui.studyOpen.has(c.code);
  let rows = '';
  list.forEach((h) => {
    if (scope === 'tum' && mw && h.h === mw) rows += `<li class="topic-divider"><span>Vize · ${vz.date ? fmtDate(parseDate(vz.date), { day: 'numeric', month: 'long' }) : `${mw}. hafta`}</span></li>`;
    rows += topicRow(c, h);
  });
  const next = studyTopics(c).find((h) => !studyMark(c.code, h.h)?.d);
  return `<details class="study-course c card" style="${cstyle(c)}" id="study-${c.code}" data-study="${c.code}" ${open ? 'open' : ''}>
    <summary>
      <i class="dot"></i>
      <div class="sc-head">
        <div class="sc-name">${esc(c.name)} <span class="mono muted">${c.code}</span></div>
        <div class="sc-sub">${stats.total ? `${stats.done}/${stats.total} konu` : 'Konu yok'}${stats.review ? ` · <span style="color:var(--warn)">${stats.review} tekrar</span>` : ''}${stats.behind && scope !== 'tekrar' ? ` · ${stats.behind} geride` : ''}${next && scope !== 'tekrar' ? ` · Sıradaki: ${esc(next.konu)}` : ''}</div>
      </div>
      <div class="sc-prog">${progressBar(pct, pct >= 100 ? 'ok' : 'x')}</div>
      ${icon('chevron', 'chev')}
    </summary>
    <div class="sc-body">
      ${labs.length ? `<p class="help sc-note">${icon('flask')} ${labs.map((l) => esc(l.name)).join(', ')} bu dersle aynı konuları izliyor; ilerleme ortak tutulur.</p>` : ''}
      ${scope === 'vize' && !vz ? `<p class="help sc-note">${icon('info')} Bu dersin vize tarihi girilmedi; tüm konular gösteriliyor.</p>` : ''}
      ${list.length ? `<ol class="topics">${rows}</ol>` : `<div class="empty" style="padding:14px">${scope === 'tekrar' ? 'Tekrar için işaretlediğin konu yok.' : 'Bu kapsamda konu yok.'}</div>`}
      <div class="sc-info">
        ${gradeParts(c).official ? `<div><div class="lbl">Değerlendirme</div>${evalChips(c)}</div>` : ''}
        ${st.kaynaklar?.length ? `<div><div class="lbl">Kaynaklar</div><ul class="sources">${st.kaynaklar.map((k) => `<li>${esc(k)}</li>`).join('')}</ul></div>` : ''}
      </div>
      <details class="sc-more">
        <summary>Dersin amacı, içeriği ve kazanımları</summary>
        ${st.amac ? `<p><b>Amaç.</b> ${esc(st.amac)}</p>` : ''}
        ${st.icerik ? `<p><b>İçerik.</b> ${esc(st.icerik)}</p>` : ''}
        ${st.ciktilar?.length ? `<p><b>Bu dersi bitirince:</b></p><ul class="sources">${st.ciktilar.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      </details>
      <p class="help sc-src">${st.not ? `${esc(st.not)} ` : ''}Kaynak: ${esc(UNI())} Bologna bilgi paketi (${esc(st.kaynak.kod)}, ${esc(st.kaynak.yil)} müfredatı${st.kaynak.guncelleme ? `, güncelleme ${esc(st.kaynak.guncelleme)}` : ''}) · ${BOLOGNA_URL(st.kaynak.id) ? `<a href="${esc(BOLOGNA_URL(st.kaynak.id))}" target="_blank" rel="noopener noreferrer">Bilgi paketini aç ${icon('external')}</a>` : ''}</p>
    </div>
  </details>`;
}
function thisWeekRows(limit) {
  const wk = clamp(weekOf(now()), 1, state.settings.weeks), d = dayIdx(now());
  const todayCodes = new Set(d <= 4 ? daySessions(d).map((s) => studyOwner(courseByCode[s.code]).code) : []);
  const items = studyOwners().map((c) => ({ c, h: studyTopics(c).find((x) => x.h === wk) })).filter((x) => x.h)
    .sort((a, b) => (studyMark(a.c.code, wk)?.d ? 1 : 0) - (studyMark(b.c.code, wk)?.d ? 1 : 0) || (todayCodes.has(b.c.code) ? 1 : 0) - (todayCodes.has(a.c.code) ? 1 : 0));
  const done = items.filter((x) => studyMark(x.c.code, wk)?.d).length;
  const shown = limit ? items.filter((x) => !studyMark(x.c.code, wk)?.d).slice(0, limit) : items;
  const html = shown.map(({ c, h }) => `<div class="tw-row c" style="${cstyle(c)}">
      ${studyCheck(c.code, wk, true)}
      <div class="tw-main"><div class="tw-course"><i class="dot"></i>${esc(c.name)}${todayCodes.has(c.code) ? ' <span class="badge b-primary">Bugün derste</span>' : ''}</div><div class="tw-topic">${esc(h.konu)}</div></div>
    </div>`).join('');
  return { wk, done, total: items.length, html, allDone: items.length > 0 && done === items.length };
}

function viewStudy() {
  const scope = studyScope();
  const si = semInfo();
  const owners = studyOwners();
  const vizeKnown = owners.filter((c) => vizeInfo(c)).length;
  if (!owners.length) {
    return `${studyTabsHtml('calisma')}<div class="card empty" style="margin-top:16px;padding:40px">${icon('bookOpen')}<div>Ders konuları bulunamadı.</div></div>`;
  }
  const agg = owners.reduce((a, c) => { const s = studyStats(c, scope); a.total += s.total; a.done += s.done; a.review += s.review; a.behind += s.behind; return a; }, { total: 0, done: 0, review: 0, behind: 0 });
  const allReview = owners.reduce((a, c) => a + studyStats(c, 'tekrar').total, 0);
  const tw = thisWeekRows(0);
  const scopes = [['vize', `Vize konuları${vizeKnown ? '' : ' (tarih girilmedi)'}`], ['tum', 'Tüm dönem'], ['tekrar', `Tekrar edilecekler${allReview ? ` (${allReview})` : ''}`]];
  const pct = agg.total ? (agg.done / agg.total) * 100 : 0;
  return `
  ${studyTabsHtml('calisma')}
  <div class="study-grid">
    <section class="card card-pad study-summary">
      <div class="card-h"><h3 class="card-t">${icon('target')}${scope === 'vize' ? 'Vize hazırlığı' : scope === 'tekrar' ? 'Tekrar listesi' : 'Dönem hazırlığı'}</h3><span class="badge b-neutral">${si.inSem ? `${si.wk}. hafta` : si.before ? 'Dönem başlamadı' : 'Dönem bitti'}</span></div>
      <div class="ss-big"><b>${agg.done}</b><span>/ ${agg.total} konu çalışıldı</span></div>
      ${progressBar(pct, pct >= 100 ? 'ok' : 'x')}
      <div class="row wrap" style="gap:6px;margin-top:12px">
        ${agg.behind && scope !== 'tekrar' ? `<span class="badge b-warn">${agg.behind} konu geride</span>` : ''}
        ${agg.review ? `<span class="badge b-neutral">${icon('bookmark')}${agg.review} tekrar bekliyor</span>` : ''}
        <span class="badge ${vizeKnown ? 'b-info' : 'b-neutral'}">Vize tarihi girilen ders: ${vizeKnown}/${owners.length}</span>
      </div>
      <p class="help" style="margin:12px 0 0">"Geride": derste işlenmiş ama henüz çalıştım olarak işaretlemediğin konular. ${esc(TAKVIM?.araSinavNotu || '')} İlan edilince Ajanda'ya dersin vizesini "Vize" türüyle ekle; o dersin vize konuları tarihe göre ayarlanır.</p>
    </section>
    ${si.after ? '' : `<section class="card card-pad">
      <div class="card-h"><h3 class="card-t">${icon('calendar')}Bu haftanın konuları</h3><span class="badge ${tw.allDone ? 'b-ok' : 'b-neutral'}">${tw.done}/${tw.total}</span></div>
      <div class="tw-list">${tw.html}</div>
    </section>`}
  </div>
  <div class="filters" style="margin:18px 0 12px">
    ${scopes.map(([k, l]) => `<button type="button" class="fchip" data-act="studyScope" data-scope="${k}" aria-pressed="${scope === k}">${l}</button>`).join('')}
    <button type="button" class="link-btn" style="margin-left:auto" data-act="studyExpand">${ui.studyOpen.size >= owners.length ? 'Tümünü daralt' : 'Tümünü aç'}</button>
  </div>
  <div class="study-list">${owners.map((c) => studyCourseHtml(c, scope)).join('')}</div>
  <p class="help" style="margin-top:14px">Konular ${esc(UNI())} Bologna bilgi paketindeki 14 haftalık plandan alındı; akademik takvimde ${state.settings.weeks} eğitim haftası var ve hocan sırayı değiştirebilir. Laboratuvarlar teorik dersle aynı konuları izlediğinde ilerleme ortak tutulur.</p>`;
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
  const calEvents = calendarEvents().filter((e) => e.bit >= isoDate(n));
  return `
  ${studyTabsHtml('ajanda')}
  <section class="card card-pad" style="margin-top:16px">
    <form class="task-form" data-form="task">
      <div class="field"><label for="tTitle">Başlık</label><input id="tTitle" class="input" name="title" placeholder="Örn. 1. ödev teslimi" required></div>
      <div class="field"><label for="tCourse">Ders</label><select id="tCourse" class="select input" name="course"><option value="">Genel</option>${COURSES.map((c) => `<option value="${c.code}">${c.code} · ${esc(c.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="tType">Tür</label><select id="tType" class="select input" name="type">${TASK_TYPES.map((t) => `<option>${t}</option>`).join('')}</select></div>
      <div class="field"><label for="tDate">Tarih</label><input id="tDate" class="input" type="date" name="date"></div>
      <button class="btn btn-primary" type="submit" style="min-height:42px">${icon('plus')}Ekle</button>
    </form>
  </section>
  ${state.tasks.length === 0 ? `<div class="card empty" style="margin-top:16px;padding:40px">${icon('tasks')}<div style="font-weight:700;color:var(--text);margin-bottom:4px">Ajandan boş</div><div>Vize tarihlerini, ödevleri ve proje teslimlerini ekle; Bugün ekranında geri sayımı görürsün.</div></div>` : ''}
  ${groups.filter(([, l]) => l.length).map(([t, l]) => `<div class="task-group"><h3>${t}<span class="badge ${t === 'Gecikmiş' ? 'b-danger' : 'b-neutral'}">${l.length}</span></h3>${l.map(taskRow).join('')}</div>`).join('')}
  ${done.length ? `<details class="task-group"><summary style="cursor:pointer;font-size:13px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Tamamlanan (${done.length})</summary>${done.map(taskRow).join('')}</details>` : ''}
  ${calEvents.length ? `<div class="task-group"><h3>Akademik takvim<span class="badge b-neutral">${calEvents.length}</span></h3>${calEvents.map(eventRow).join('')}<p class="help">${esc(TAKVIM?.araSinavNotu || '')}</p></div>` : ''}`;
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
  const thr = `<line x1="${L}" x2="${Wd - R}" y1="${y(2)}" y2="${y(2)}" stroke="var(--text-3)" stroke-width="1.2" stroke-dasharray="4 4"/><text x="${L + 6}" y="${y(2) - 6}" text-anchor="start" style="font-weight:600">2,00 · mezuniyet şartı</text>`;
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
          const l = debts.filter((x) => { const y = curriculumTerm(x.code); return y ? (y % 2 === 1) === (sem === 'Güz') : false; });
          return l.length ? `<div class="help" style="font-weight:700;margin:6px 0 4px">${sem} yarıyılı dersleri</div>${l.map((x) => `<div class="row between" style="padding:6px 0;border-top:1px dashed var(--border);font-size:14px"><span><span class="mono muted">${x.code}</span> ${esc(x.name)} <span class="muted" style="font-size:12px">· ${curriculumTerm(x.code)}. yarıyıl</span></span><span class="row" style="gap:6px"><span class="muted" style="font-size:12px">${x.akts} AKTS</span><span class="g ${gradeClass(x.grade)}">${x.grade}</span></span></div>`).join('')}` : '';
        }).join('')}
        ${debts.some((x) => !curriculumTerm(x.code)) ? `<div class="help" style="font-weight:700;margin:6px 0 4px">Yarıyılı bilinmeyen</div>${debts.filter((x) => !curriculumTerm(x.code)).map((x) => `<div class="row between" style="padding:6px 0;border-top:1px dashed var(--border);font-size:14px"><span><span class="mono muted">${x.code}</span> ${esc(x.name)}</span><span class="g ${gradeClass(x.grade)}">${x.grade}</span></div>`).join('')}` : ''}
        <p class="help" style="margin:10px 0 0">Yarıyıllar 2023 müfredatından. Yönetmelik md. 26: FF, FD veya DS aldığın dersi verildiği ilk yarıyılda almak zorundasın; programdan çıkarılan dersler için eşdeğer dersi birim kurulu belirler (md. 26, 31).</p>
        ${debts.filter((x) => window.DERS_NOTLARI?.[x.code]).map((x) => `<p class="help" style="margin:6px 0 0"><b class="mono">${esc(x.code)}:</b> ${esc(window.DERS_NOTLARI[x.code])}</p>`).join('')}
      </section>
      <section class="card card-pad">
        <div class="card-h"><h3 class="card-t">${icon('info')}Şartlı geçilen dersler</h3><span class="badge b-warn">${cond.length}</span></div>
        <div class="hist">${cond.map((x) => `<span class="badge b-neutral" title="${esc(x.name)}">${x.code} <span class="g g-cond">${x.grade}</span></span>`).join('')}</div>
        <p class="help" style="margin:10px 0 0">Yönetmelik md. 24: DC veya DD alınan ders, mezuniyet aşamasında GNO 2,00 olmak şartıyla başarılı sayılır. Mezuniyet için en az 2,00 GNO ve 240 AKTS gerekir (md. 31).</p>
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

/* ============ Uygulama olarak yükleme ============ */
const UI_STORE = 'dersTakip.ui';
const uiPrefs = () => { try { return JSON.parse(localStorage.getItem(UI_STORE) || '{}') || {}; } catch (e) { return {}; } };
const setUiPref = (k, v) => { try { localStorage.setItem(UI_STORE, JSON.stringify({ ...uiPrefs(), [k]: v })); } catch (e) { /* yok say */ } };
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function installBannerHtml() {
  if (isStandalone() || uiPrefs().installDismissed || !matchMedia('(max-width: 760px)').matches) return '';
  if (!window.installPrompt && !isIOS()) return '';
  return `<div class="install-banner" role="region" aria-label="Uygulama olarak yükle">
    <img src="icons/icon-192.png" alt="" width="40" height="40">
    <div class="ib-text"><b>Ana ekrana ekle</b><span>Tek dokunuşla açılır, internetsiz de çalışır.</span></div>
    ${window.installPrompt
      ? `<button type="button" class="btn btn-primary btn-sm" data-act="install">Ekle</button>`
      : `<a class="btn btn-primary btn-sm" href="#ayarlar">Nasıl?</a>`}
    <button type="button" class="icon-btn ib-close" data-act="installDismiss" aria-label="Öneriyi kapat">${icon('x')}</button>
  </div>`;
}

function installCardHtml() {
  const head = (badge) => `<div class="card-h"><h3 class="card-t">${icon('phone')}Uygulama olarak kullan</h3>${badge}</div>`;
  if (isStandalone()) {
    return `<section class="card card-pad">${head(`<span class="badge b-ok">${icon('check')}Yüklü</span>`)}
      <p class="help" style="margin:0">Uygulama olarak çalışıyor. İnternet yokken de açılır; yaptığın işaretlemeler bağlantı gelince eşitlenir.</p></section>`;
  }
  let body;
  if (window.installPrompt) {
    body = `<p class="help" style="margin:0 0 12px">Ana ekranına simge olarak eklenir, tam ekran açılır ve internetsiz de çalışır.</p>
      <button type="button" class="btn btn-primary" data-act="install">${icon('plusSquare')}Ana ekrana ekle</button>`;
  } else if (isIOS()) {
    body = `<p class="help" style="margin:0 0 10px">iPhone ve iPad'de <b>Safari</b> ile:</p>
      <ol class="steps">
        <li>Alttaki <b>Paylaş</b> düğmesine dokun ${icon('share')}</li>
        <li>Listeden <b>Ana Ekrana Ekle</b>'yi seç ${icon('plusSquare')}</li>
        <li>Sağ üstten <b>Ekle</b>'ye dokun</li>
      </ol>
      <p class="help" style="margin:10px 0 0">Ana ekrandaki simgeden açınca şifreni bir kez girip "Bu cihazda açık kalsın"ı işaretle.</p>`;
  } else {
    body = `<p class="help" style="margin:0">Android'de Chrome menüsünden (⋮) <b>Ana ekrana ekle</b> ya da <b>Uygulamayı yükle</b>'yi seç. Bilgisayarda Chrome/Edge adres çubuğundaki yükle simgesini kullanabilirsin.</p>`;
  }
  return `<section class="card card-pad">${head('')}${body}</section>`;
}

/* ============ AYARLAR ============ */
const SYNC_STATUS = {
  yok: ['b-neutral', 'Yapılandırılmamış'],
  yerel: ['b-neutral', 'Yerel modda kapalı'],
  baslatiliyor: ['b-neutral', 'Başlatılıyor…'],
  esitleniyor: ['b-info', 'Eşitleniyor…'],
  bekliyor: ['b-info', 'Gönderilecek…'],
  acik: ['b-ok', 'Eşitlendi'],
  kurulum: ['b-warn', 'Kurulum gerekli'],
  cevrimdisi: ['b-neutral', 'Çevrimdışı'],
  hata: ['b-danger', 'Hata'],
};
function agoText(t) {
  if (!t) return 'henüz yok';
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 45) return 'az önce';
  if (s < 3600) return `${Math.round(s / 60)} dk önce`;
  return fmtDate(new Date(t), { hour: '2-digit', minute: '2-digit' });
}
function syncCardHtml() {
  const i = Sync.info;
  if (!i.configured) return '';
  const [cls, label] = SYNC_STATUS[i.status] || SYNC_STATUS.yok;
  const head = `<div class="card-h"><h3 class="card-t">${icon('cloud')}Cihazlar arası eşitleme</h3><span class="badge ${cls}">${label}</span></div>`;
  if (!i.available) {
    return `<section class="card card-pad">${head}<p class="help" style="margin:0">Eşitleme yalnızca yayındaki sitede, şifreyle açıldığında çalışır.</p></section>`;
  }
  const err = i.status === 'hata' && i.lastError ? `<div class="callout danger" style="margin-bottom:12px">${icon('alert')}<div>${esc(i.lastError)}</div></div>` : '';
  if (i.hasToken) {
    return `<section class="card card-pad">${head}${err}
      <p class="help" style="margin:0 0 12px">Yoklama, not, görev, simülasyon ve ayarların şifrelenerek GitHub'daki gizli kaydına gönderilir; diğer cihazlar kilidi açınca otomatik alır. Son eşitleme: <b>${agoText(i.lastSync)}</b>.</p>
      <div class="row wrap">
        <button type="button" class="btn" data-act="syncNow" ${i.status === 'esitleniyor' ? 'disabled' : ''}>${icon('refresh')}Şimdi eşitle</button>
        <button type="button" class="btn btn-ghost" data-act="syncForget">Bu cihazda kapat</button>
        <button type="button" class="btn btn-ghost btn-danger" data-act="syncOffAll">Tüm cihazlarda kapat</button>
      </div>
    </section>`;
  }
  return `<section class="card card-pad sync-setup">${head}${err}
    <p class="help" style="margin:0 0 12px">Bir kez kurman yeterli: GitHub'da yalnızca <b>Gist</b> izni olan bir erişim anahtarı oluştur ve buraya yapıştır. Anahtar site şifrenle şifrelenip saklanır; diğer cihazlarda sadece site şifreni girmen yeter.</p>
    <ol class="steps">
      <li><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">GitHub'da yeni erişim anahtarı sayfasını aç ${icon('external')}</a></li>
      <li><b>Token name:</b> Ders Takip eşitleme · <b>Expiration:</b> istediğin süre (süre dolunca anahtarı yenilemen gerekir)</li>
      <li><b>Repository access:</b> Public repositories (anahtar yalnızca herkese açık depoları okuyabilir)</li>
      <li><b>Permissions → User permissions → Gists:</b> <i>Read and write</i> seç, başka izin verme</li>
      <li><b>Generate token</b>'a bas, çıkan <span class="mono">github_pat_…</span> anahtarını kopyala</li>
    </ol>
    <form data-form="sync" class="row wrap" style="gap:8px;margin-top:12px" autocomplete="off">
      <input class="input" style="flex:1;min-width:220px" type="password" name="token" placeholder="github_pat_…" aria-label="GitHub erişim anahtarı" autocomplete="off" spellcheck="false" required>
      <button class="btn btn-primary" type="submit">${icon('cloud')}Eşitlemeyi aç</button>
    </form>
    <p class="help" id="syncErr" role="alert" style="color:var(--danger);margin:8px 0 0" hidden></p>
  </section>`;
}

function viewSettings() {
  const s = state.settings;
  const syncCard = syncCardHtml();
  return `
  ${syncCard ? `<div style="margin-bottom:16px">${syncCard}</div>` : ''}
  <div class="set-grid">
    ${installCardHtml()}
    <section class="card card-pad">
      <div class="card-h"><h3 class="card-t">${icon('calendar')}Dönem</h3></div>
      <div class="grid" style="grid-template-columns:1fr 1fr">
        <div class="field"><label for="sStart">Derslerin başladığı gün</label><input id="sStart" class="input" type="date" value="${s.start}" data-input="setting" data-key="start"></div>
        <div class="field"><label for="sWeeks">Hafta sayısı</label><input id="sWeeks" class="input" type="number" min="1" max="20" value="${s.weeks}" data-input="setting" data-key="weeks" data-num></div>
        <div class="field"><label for="sMid">Ortak vize haftası (isteğe bağlı)</label><input id="sMid" class="input" type="number" min="2" max="20" placeholder="İlan edilmedi" value="${s.midtermWeek ?? ''}" data-input="setting" data-key="midtermWeek" data-num data-optional></div>
      </div>
      <p class="help" style="margin:10px 0 0">${TAKVIM ? `Akademik takvime göre güz eğitimi ${fmtDate(parseDate(TAKVIM.baslangic), { day: 'numeric', month: 'long' })} – ${fmtDate(parseDate(TAKVIM.bitis), { day: 'numeric', month: 'long', year: 'numeric' })} (${TAKVIM.hafta} hafta). ` : ''}${esc(TAKVIM?.araSinavNotu || '')} Derslere özel vize tarihlerini Ajanda'dan "Vize" türüyle eklemen daha doğru olur.</p>
    </section>
    <section class="card card-pad">
      <div class="card-h"><h3 class="card-t">${icon('shield')}Devamsızlık sınırları</h3></div>
      <div class="grid" style="grid-template-columns:1fr 1fr">
        <div class="field"><label for="sTh">Teorik dersler (%)</label><input id="sTh" class="input" type="number" min="0" max="100" value="${s.theoryLimit}" data-input="setting" data-key="theoryLimit" data-num></div>
        <div class="field"><label for="sLab">Laboratuvar (%)</label><input id="sLab" class="input" type="number" min="0" max="100" value="${s.labLimit}" data-input="setting" data-key="labLimit" data-num></div>
      </div>
      <p class="help" style="margin:10px 0 0">Yönetmelik md. 20: derslere en az %70, uygulamalara en az %80 devam zorunlu (resmi tatiller eğitim gününden sayılmaz, md. 7). Ders bazında çekmeceden ayrıca değiştirebilirsin.</p>
      <div class="lbl help" style="margin:14px 0 6px;font-weight:650">Alttan derslerde devam</div>
      <div class="seg" role="group" aria-label="Alttan derslerde devam kuralı">
        <button type="button" data-act="repeatRule" data-rule="bolum" aria-pressed="${repeatRule() === 'bolum'}">Zorunlu (bölüm kararı)</button>
        <button type="button" data-act="repeatRule" data-rule="yonetmelik" aria-pressed="${repeatRule() === 'yonetmelik'}">Aranmaz (yönetmelik md. 20)</button>
      </div>
      <p class="help" style="margin:8px 0 0">${KURALLAR.devamKarari ? `${esc(KURALLAR.devamKarari.ozet)} (${fmtDate(parseDate(KURALLAR.devamKarari.tarih), { day: 'numeric', month: 'long', year: 'numeric' })})` : ''}</p>
    </section>
    <section class="card card-pad">
      <div class="card-h"><h3 class="card-t">${icon('target')}Not değerlendirme</h3></div>
      <p class="help" style="margin:0 0 10px">Not, bilgi paketindeki resmi oranlarla hesaplanır. Bu ağırlık yalnızca oranı bilinmeyen derslerde kullanılır; yönetmelik md. 24'e göre final etkisi %40–%60 arasında olmalıdır.</p>
      <div class="field" style="max-width:260px"><label for="sVize">Varsayılan vize ağırlığı (%) — final ${100 - s.vizeW}%</label><input id="sVize" class="input" type="number" min="0" max="100" value="${s.vizeW}" data-input="setting" data-key="vizeW" data-num></div>
      <div class="lbl help" style="margin:14px 0 6px;font-weight:650">Harf notu alt sınırları — yönetmelik md. 24 mutlak değerlendirme tablosu</div>
      <div class="scale-grid">${LETTERS.slice(0, 8).map((L, i) => `<div class="field"><label for="sc${i}">${L} ≥</label><input id="sc${i}" class="input" type="number" min="0" max="100" value="${s.scale[i]}" data-input="scale" data-i="${i}"></div>`).join('')}</div>
    </section>
    <section class="card card-pad">
      <div class="card-h"><h3 class="card-t">${icon('monitor')}Görünüm</h3></div>
      <div class="seg" role="group" aria-label="Tema">
        ${[['system', 'Sistem', 'monitor'], ['light', 'Açık', 'sun'], ['dark', 'Koyu', 'moon']].map(([k, l, ic]) => `<button type="button" data-act="theme" data-theme="${k}" aria-pressed="${s.theme === k}"><span class="row" style="gap:6px">${icon(ic)}${l}</span></button>`).join('')}
      </div>
      <div class="card-h" style="margin:22px 0 10px"><h3 class="card-t">${icon('download')}Veriler</h3></div>
      <p class="help" style="margin:0 0 10px">Kayıtlar bu tarayıcıda saklanır${saveOk ? '' : ' — <b style="color:var(--danger)">şu an kaydedilemiyor</b>'}; eşitleme açıksa şifrelenerek GitHub'daki gizli kayda da gönderilir. Yedek dosyası şifresizdir, güvenli bir yerde tut.</p>
      <div class="row wrap">
        <button type="button" class="btn" data-act="export">${icon('download')}Yedeği indir</button>
        <label class="btn" style="cursor:pointer">${icon('upload')}Yedek yükle<input type="file" accept="application/json" hidden data-input="import"></label>
        <button type="button" class="btn btn-ghost btn-danger" data-act="reset">${icon('trash')}Sıfırla</button>
      </div>
      <div class="card-h" style="margin:22px 0 10px"><h3 class="card-t">${icon('shield')}Güvenlik</h3></div>
      <p class="help" style="margin:0 0 10px">${window.hasRememberedKey && window.hasRememberedKey() ? 'Bu cihaz şifreni hatırlıyor. Ortak bir cihazdaysan kilitle.' : 'Sayfa her açılışta şifre ister.'}</p>
      <button type="button" class="btn" data-act="lock">${icon('shield')}Kilitle ve şifreyi unut</button>
    </section>
    ${(window.KAYNAKLAR || []).length ? `<section class="card card-pad" style="grid-column:1 / -1">
      <div class="card-h"><h3 class="card-t">${icon('info')}Bilgi kaynakları</h3></div>
      <ul class="sources-list">${window.KAYNAKLAR.map((k) => `<li><div><b>${esc(k.ad)}</b>${k.url ? ` · <a href="${esc(k.url)}" target="_blank" rel="noopener noreferrer">Kaynağı aç ${icon('external')}</a>` : ''}</div><div class="help">${esc(k.detay)}${k.kontrol ? ` · Kontrol: ${fmtDate(parseDate(k.kontrol), { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}</div></li>`).join('')}</ul>
    </section>` : ''}
  </div>`;
}
