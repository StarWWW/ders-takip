/* 8-bit ses motoru: tüm müzik ve efektler WebAudio ile anında üretilir, ses dosyası yok. */
'use strict';

const Sound = (() => {
  let ctx = null, master, musicBus, sfxBus, noiseBuf;
  let muted = false;
  let song = null;

  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.13;
    musicBus.connect(master);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.32;
    sfxBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function setMuted(m) {
    muted = m;
    if (master) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.05);
  }

  const NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(n) {
    const m = /^([A-G])(#|b)?(\d)$/.exec(n);
    const semi = NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 440 * Math.pow(2, ((+m[3] + 1) * 12 + semi - 69) / 12);
  }

  // Tek bir osilatör notası. at: mutlak zaman (ctx.currentTime cinsinden)
  function tone({ type = 'square', f, f2, at, dur, vol = 1, out = sfxBus, attack = 0.004, slide = 'exp' }) {
    if (!ctx) return;
    at = at ?? ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, at);
    if (f2) {
      if (slide === 'exp') o.frequency.exponentialRampToValueAtTime(f2, at + dur);
      else o.frequency.linearRampToValueAtTime(f2, at + dur);
    }
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + dur + 0.02);
  }

  function noise({ at, dur, vol = 1, type = 'highpass', f = 1000, f2, q = 1, out = sfxBus }) {
    if (!ctx) return;
    at = at ?? ctx.currentTime;
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const flt = ctx.createBiquadFilter();
    flt.type = type;
    flt.frequency.setValueAtTime(f, at);
    if (f2) flt.frequency.exponentialRampToValueAtTime(f2, at + dur);
    flt.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(flt).connect(g).connect(out);
    s.start(at, Math.random() * 0.5);
    s.stop(at + dur + 0.02);
  }

  const now = () => (ctx ? ctx.currentTime : 0);

  const sfx = {
    blip() { tone({ f: 880, dur: 0.06, vol: 0.5 }); },
    select() { tone({ f: 520, f2: 1040, dur: 0.1, vol: 0.5 }); },
    coin() {
      const t = now();
      tone({ f: 988, at: t, dur: 0.08, vol: 0.55 });
      tone({ f: 1319, at: t + 0.08, dur: 0.32, vol: 0.55 });
    },
    wrong() {
      const t = now();
      tone({ f: 233, f2: 160, at: t, dur: 0.16, vol: 0.5 });
      tone({ f: 175, f2: 110, at: t + 0.15, dur: 0.28, vol: 0.5 });
    },
    pop() {
      noise({ dur: 0.09, vol: 0.9, f: 1200 });
      tone({ type: 'triangle', f: 900, f2: 120, dur: 0.09, vol: 0.6 });
    },
    meow() {
      if (!ctx) return;
      const t = now();
      const o = ctx.createOscillator();
      const flt = ctx.createBiquadFilter();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      const base = 520 + Math.random() * 160;
      o.frequency.setValueAtTime(base, t);
      o.frequency.linearRampToValueAtTime(base * 1.55, t + 0.12);
      o.frequency.linearRampToValueAtTime(base * 0.8, t + 0.42);
      flt.type = 'bandpass';
      flt.frequency.setValueAtTime(900, t);
      flt.frequency.linearRampToValueAtTime(2200, t + 0.14);
      flt.frequency.linearRampToValueAtTime(800, t + 0.42);
      flt.Q.value = 2.5;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.7, t + 0.05);
      g.gain.setValueAtTime(0.7, t + 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      o.connect(flt).connect(g).connect(sfxBus);
      o.start(t);
      o.stop(t + 0.5);
    },
    whoosh() { noise({ dur: 0.45, vol: 0.5, type: 'bandpass', f: 400, f2: 1600, q: 0.8 }); },
    launch() { tone({ type: 'triangle', f: 300, f2: 1400, dur: 0.6, vol: 0.12 }); },
    boom() {
      noise({ dur: 0.7, vol: 0.9, type: 'lowpass', f: 900, f2: 120 });
      tone({ type: 'sine', f: 90, f2: 40, dur: 0.4, vol: 0.6 });
    },
    tick() { tone({ f: 1600 + Math.random() * 300, dur: 0.015, vol: 0.12 }); },
    step() { noise({ dur: 0.03, vol: 0.18, type: 'lowpass', f: 700 }); },
    sparkle() {
      const t = now();
      ['E6', 'G6', 'B6', 'E7'].forEach((n, i) => tone({ type: 'triangle', f: freq(n), at: t + i * 0.06, dur: 0.18, vol: 0.4 }));
    },
    magic() { tone({ type: 'triangle', f: 300, f2: 1500, dur: 0.45, vol: 0.4 }); },
    unlock() {
      const t = now();
      noise({ at: t, dur: 0.05, vol: 0.6, f: 2500 });
      ['C5', 'G5', 'C6'].forEach((n, i) => tone({ f: freq(n), at: t + 0.08 + i * 0.09, dur: 0.2, vol: 0.45 }));
    },
    victory() {
      const t = now();
      ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => tone({ f: freq(n), at: t + i * 0.09, dur: 0.12, vol: 0.5 }));
      ['C6', 'E6', 'G6'].forEach((n) => tone({ f: freq(n), at: t + 0.38, dur: 0.6, vol: 0.28 }));
      tone({ type: 'triangle', f: freq('C4'), at: t + 0.38, dur: 0.6, vol: 0.6 });
    },
    save() {
      const t = now();
      ['G5', 'C6', 'E6', 'G6', 'C7'].forEach((n, i) => tone({ type: 'square', f: freq(n), at: t + i * 0.07, dur: 0.1, vol: 0.35 }));
    },
  };

  /* ---------------- Müzik ---------------- */
  const bar = (chord) => chord.flatMap((n) => [[n, 0.5]]);
  const C = ['C3', 'G3', 'C4', 'G3', 'C3', 'G3', 'C4', 'G3'];
  const Am = ['A2', 'E3', 'A3', 'E3', 'A2', 'E3', 'A3', 'E3'];
  const F = ['F2', 'C3', 'F3', 'C3', 'F2', 'C3', 'F3', 'C3'];
  const G = ['G2', 'D3', 'G3', 'D3', 'G2', 'D3', 'G3', 'D3'];
  const drumBar = [['K', 0.5], ['H', 0.5], ['S', 0.5], ['H', 0.5], ['K', 0.5], ['K', 0.5], ['S', 0.5], ['H', 0.5]];

  const SONGS = {
    // Haritada çalan sakin döngü
    koy: {
      bpm: 108, loop: true,
      tracks: [
        {
          wave: 'square', vol: 0.42, notes: [
            ['E5', 0.5], ['G5', 0.5], ['C6', 0.5], ['G5', 0.5], ['E5', 1], ['D5', 1],
            ['C5', 0.5], ['E5', 0.5], ['A5', 1], ['G5', 0.5], ['E5', 0.5], ['C5', 1],
            ['A4', 0.5], ['C5', 0.5], ['F5', 1], ['E5', 0.5], ['F5', 0.5], ['A5', 1],
            ['G5', 1.5], ['F5', 0.5], ['E5', 1], ['D5', 1],
            ['E5', 0.5], ['G5', 0.5], ['C6', 1], ['B5', 0.5], ['A5', 0.5], ['G5', 1],
            ['A5', 0.5], ['G5', 0.5], ['E5', 1], ['C5', 0.5], ['D5', 0.5], ['E5', 1],
            ['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['A4', 1], ['C5', 1],
            ['D5', 1], ['B4', 1], ['C5', 2],
          ],
        },
        { wave: 'triangle', vol: 0.9, notes: [C, Am, F, G, C, Am, F, G].flatMap(bar) },
        { wave: 'drum', vol: 0.5, notes: Array(8).fill(drumBar).flat() },
      ],
    },
    // İyi ki doğdun (3/4)
    dogumGunu: {
      bpm: 104, loop: false,
      tracks: [
        {
          wave: 'square', vol: 0.5, notes: [
            ['G4', 0.75], ['G4', 0.25],
            ['A4', 1], ['G4', 1], ['C5', 1],
            ['B4', 2], ['G4', 0.75], ['G4', 0.25],
            ['A4', 1], ['G4', 1], ['D5', 1],
            ['C5', 2], ['G4', 0.75], ['G4', 0.25],
            ['G5', 1], ['E5', 1], ['C5', 1],
            ['B4', 1], ['A4', 1], ['F5', 0.75], ['F5', 0.25],
            ['E5', 1], ['C5', 1], ['D5', 1],
            ['C5', 3],
          ],
        },
        {
          wave: 'square', vol: 0.18, notes: [
            [null, 1],
            ['E4', 3], ['D4', 3], ['F4', 3], ['E4', 3],
            ['E4', 3], ['F4', 3], ['E4', 2], ['D4', 1], ['E4', 3],
          ],
        },
        {
          wave: 'triangle', vol: 0.95, notes: [
            [null, 1],
            ['C3', 1], ['E3', 1], ['G3', 1],
            ['G2', 1], ['B2', 1], ['D3', 1],
            ['G2', 1], ['B2', 1], ['D3', 1],
            ['C3', 1], ['E3', 1], ['G3', 1],
            ['C3', 1], ['E3', 1], ['G3', 1],
            ['F2', 1], ['A2', 1], ['C3', 1],
            ['C3', 1], ['E3', 1], ['G2', 1],
            ['C3', 3],
          ],
        },
      ],
    },
  };

  function drum(kind, at, vol) {
    if (kind === 'K') {
      tone({ type: 'sine', f: 140, f2: 45, at, dur: 0.14, vol: vol * 1.6, out: musicBus });
    } else if (kind === 'S') {
      noise({ at, dur: 0.1, vol: vol * 0.9, f: 1800, out: musicBus });
    } else if (kind === 'H') {
      noise({ at, dur: 0.035, vol: vol * 0.5, f: 7000, out: musicBus });
    }
  }

  function schedule() {
    if (!song) return;
    const ahead = ctx.currentTime + 0.2;
    let allDone = true;
    for (const st of song.tracks) {
      if (st.done) continue;
      allDone = false;
      while (true) {
        const [n, beats] = st.tr.notes[st.i];
        const at = song.start + st.t * song.spb;
        if (at > ahead) break;
        if (n) {
          if (st.tr.wave === 'drum') drum(n, at, st.tr.vol);
          else tone({ type: st.tr.wave, f: freq(n), at, dur: Math.max(0.06, beats * song.spb * 0.92), vol: st.tr.vol, out: musicBus, attack: 0.01 });
        }
        st.t += beats;
        st.i++;
        if (st.i >= st.tr.notes.length) {
          if (song.def.loop) st.i = 0;
          else { st.done = true; break; }
        }
      }
    }
    if (allDone) {
      const end = song.start + Math.max(...song.tracks.map((s) => s.t)) * song.spb;
      if (ctx.currentTime > end) {
        const cb = song.onEnd;
        stop();
        cb?.();
      }
    }
  }

  function play(name, onEnd) {
    if (!ctx) return;
    if (song && song.name === name) return;
    stop();
    const def = SONGS[name];
    song = {
      name, def, onEnd,
      spb: 60 / def.bpm,
      start: ctx.currentTime + 0.12,
      tracks: def.tracks.map((tr) => ({ tr, i: 0, t: 0, done: false })),
      timer: setInterval(schedule, 40),
    };
    schedule();
  }

  function stop() {
    if (song) clearInterval(song.timer);
    song = null;
  }

  // Sekme arka plana geçince sesi durdur
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });

  return {
    init, sfx, play, stop, setMuted,
    get muted() { return muted; },
    get playing() { return song ? song.name : null; },
    get ctx() { return ctx; },
  };
})();
