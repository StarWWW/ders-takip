'use strict';

(() => {
  const C = window.ELA;
  const $ = (s) => document.querySelector(s);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const PALETTE = ['#e04848', '#5fb85a', '#ffd34e', '#fff1d6', '#a86b42', '#f29ab0'];

  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const SAVE_KEY = 'ela-quest-v1';
  const save = { done: [false, false, false], intro: false, finished: false, muted: false };
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); } catch { /* gizli sekme vb. */ }
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* yoksay */ } };
  Sound.setMuted(save.muted);

  const cv = $('#world'), ctx = cv.getContext('2d');
  const fcv = $('#fxc'), fctx = fcv.getContext('2d');
  let S = 3, W = 0, H = 0, T = 0, portrait = false, groundY = 0;
  let skyCv, sideCv;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  function resize() {
    const vw = window.innerWidth || document.documentElement.clientWidth || 390;
    const vh = window.innerHeight || document.documentElement.clientHeight || 844;
    S = clamp(Math.round(Math.min(vw, vh) / 150), 2, 8);
    W = Math.ceil(vw / S); H = Math.ceil(vh / S);
    for (const c of [cv, fcv]) {
      c.width = W; c.height = H;
      c.style.width = W * S + 'px'; c.style.height = H * S + 'px';
    }
    ctx.imageSmoothingEnabled = false;
    fctx.imageSmoothingEnabled = false;
    portrait = vh > vw * 1.1;
    groundY = Math.round(H * (portrait ? 0.8 : 0.77));
    buildSky();
    buildSide();
    buildStars();
    scene?.resize?.();
  }

  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const SKY = ['#07060d', '#0a0815', '#0e0a1c', '#130d24', '#1a102a', '#22132e', '#2c1730', '#381b30', '#46202f'].map(hex);

  function buildSky() {
    skyCv = mk(W, H);
    const c = skyCv.getContext('2d');
    const img = c.createImageData(W, H);
    const n = SKY.length - 1;
    for (let y = 0; y < H; y++) {
      const f = clamp(y / groundY, 0, 1) * n;
      const i = Math.floor(f), frac = f - i;
      for (let x = 0; x < W; x++) {
        const k = Math.min(n, i + (BAYER[(y % 4) * 4 + (x % 4)] / 16 < frac ? 1 : 0));
        const p = (y * W + x) * 4;
        img.data[p] = SKY[k][0]; img.data[p + 1] = SKY[k][1]; img.data[p + 2] = SKY[k][2]; img.data[p + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
    // Ay
    const mx = Math.round(W * (portrait ? 0.8 : 0.86)), my = Math.round(H * 0.14), r = 6;
    c.fillStyle = 'rgba(255,241,214,0.06)';
    disc(c, mx, my, r + 4);
    c.fillStyle = 'rgba(255,241,214,0.08)';
    disc(c, mx, my, r + 2);
    c.fillStyle = '#f3e6c6';
    disc(c, mx, my, r);
    c.fillStyle = '#d9c9a3';
    c.fillRect(mx - 3, my - 2, 2, 2); c.fillRect(mx + 1, my + 1, 3, 2); c.fillRect(mx - 1, my + 3, 1, 1);
  }

  function disc(c, cx, cy, r) {
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(r * r + r * 0.6 - y * y));
      c.fillRect(cx - w, cy + y, w * 2 + 1, 1);
    }
  }

  // Orion: [x°, y°, boyut, renk] (x batıya, y güneye doğru artar; 3 parlak, 0 sönük, -1 bulutsu)
  // 0 Betelgeuse, 1 Bellatrix, 2 Meissa, 3-5 kuşak, 6 Saiph, 7 Rigel, 8-10 kılıç, 11-15 sopa, 16-21 kalkan
  const ORION_STARS = [
    [-4.8, -7.4, 3, '#ffa36b'], [2.7, -6.4, 2, '#dfe8ff'], [0.2, -9.9, 1, '#e8ecff'],
    [1.4, -0.1, 2, '#e8ecff'], [-0.05, 1.2, 2, '#e8ecff'], [-1.65, 2.2, 2, '#e8ecff'],
    [-2.9, 9.7, 2, '#dfe8ff'], [5.4, 8.2, 3, '#cfe0ff'],
    [0.15, 4.8, 1, '#e8ecff'], [0.18, 5.4, -1, '#e59ad8'], [0.15, 5.9, 1, '#e8ecff'],
    [-6.6, -9.7, 0], [-7.9, -14.8, 0], [-9.0, -14.2, 0], [-7.0, -20.1, 0], [-4.6, -20.3, 0],
    [10.3, -10.2, 0], [11.35, -8.9, 0], [11.55, -7.0, 0], [11.2, -5.6, 0], [10.45, -2.4, 0], [9.4, -1.7, 0],
  ];
  const ORION_LINES = [[0, 2], [2, 1], [0, 5], [1, 3], [5, 4], [4, 3], [5, 6], [3, 7], [6, 7]];
  const ORION_FAINT = [[0, 11], [11, 13], [13, 12], [13, 14], [14, 15], [1, 18], [16, 17], [17, 18], [18, 19], [19, 20], [20, 21]];
  function dotted(out, a, b, alpha) {
    const n = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    for (let i = 2; i <= n - 2; i += 2) out.push([Math.round(a.x + ((b.x - a.x) * i) / n), Math.round(a.y + ((b.y - a.y) * i) / n), alpha]);
  }

  let stars = [], orion = null, shooting = null, nextShoot = 4;
  function buildStars() {
    const k = Math.min((groundY * 0.44) / 20, (W * 0.42) / 21);
    const ox = W * (portrait ? 0.22 : 0.14), oy = groundY * (portrait ? 0.64 : 0.48);
    const pts = ORION_STARS.map(([x, y, size, color], i) => ({ x: Math.round(ox + x * k), y: Math.round(oy + y * k), size, color: color || '#cfc6e6', p: i * 1.7 }));
    const lines = [];
    for (const [a, b] of ORION_LINES) dotted(lines, pts[a], pts[b], 0.3);
    for (const [a, b] of ORION_FAINT) dotted(lines, pts[a], pts[b], 0.14);
    orion = { pts, lines };
    const box = (ps, pad) => [Math.min(...ps.map((p) => p.x)) - pad, Math.min(...ps.map((p) => p.y)) - pad, Math.max(...ps.map((p) => p.x)) + pad, Math.max(...ps.map((p) => p.y)) + pad];
    const inBox = (s, [x0, y0, x1, y1]) => s.x >= x0 && s.x <= x1 && s.y >= y0 && s.y <= y1;
    const bodyBox = box(pts.slice(0, 11), 3), allBox = box(pts, 6);
    const r = rng(7);
    stars = [];
    const n = Math.round((W * groundY) / 85);
    for (let i = 0; i < n; i++) {
      const s = { x: Math.floor(r() * W), y: Math.floor(r() * (groundY - 14)), p: r() * 6.28, big: r() < 0.12, sp: 0.6 + r() * 2.2 };
      if (inBox(s, bodyBox) || (s.big && inBox(s, allBox))) continue;
      if (pts.some((p) => Math.abs(p.x - s.x) < 3 && Math.abs(p.y - s.y) < 3)) continue;
      stars.push(s);
    }
  }
  function drawOrion(c) {
    c.fillStyle = '#8f9ce0';
    const breathe = 0.85 + 0.15 * Math.sin(T * 0.7);
    for (const [x, y, a] of orion.lines) { c.globalAlpha = a * breathe; c.fillRect(x, y, 1, 1); }
    for (const s of orion.pts) {
      const tw = 0.82 + 0.18 * Math.sin(T * 1.4 + s.p);
      c.fillStyle = s.color;
      if (s.size < 0) {
        c.globalAlpha = 0.16; c.fillRect(s.x - 1, s.y - 1, 3, 3);
        c.globalAlpha = 0.5 * tw; c.fillRect(s.x, s.y, 1, 1);
        continue;
      }
      if (s.size === 3) {
        c.globalAlpha = 0.14 * tw; c.fillRect(s.x - 1, s.y - 1, 3, 3);
        c.globalAlpha = 0.35 * tw; c.fillRect(s.x - 2, s.y, 5, 1); c.fillRect(s.x, s.y - 2, 1, 5);
      }
      if (s.size >= 2) { c.globalAlpha = (s.size === 3 ? 0.85 : 0.6) * tw; c.fillRect(s.x - 1, s.y, 3, 1); c.fillRect(s.x, s.y - 1, 1, 3); }
      c.globalAlpha = (s.size === 0 ? 0.5 : s.size === 1 ? 0.8 : 1) * tw;
      c.fillRect(s.x, s.y, 1, 1);
    }
    c.globalAlpha = 1;
  }
  function drawSky(c, dt) {
    c.drawImage(skyCv, 0, 0);
    for (const s of stars) {
      c.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(T * s.sp + s.p));
      if (s.big) {
        c.fillStyle = '#fff1d6';
        c.fillRect(s.x, s.y - 1, 1, 3); c.fillRect(s.x - 1, s.y, 3, 1);
      } else {
        c.fillStyle = '#cfc6e6';
        c.fillRect(s.x, s.y, 1, 1);
      }
    }
    c.globalAlpha = 1;
    drawOrion(c);
    // Kayan yıldız
    nextShoot -= dt;
    if (nextShoot <= 0 && !shooting) {
      shooting = { x: rand(W * 0.2, W), y: rand(2, groundY * 0.35), life: 0.9 };
      nextShoot = rand(6, 13);
    }
    if (shooting) {
      shooting.x -= dt * 120; shooting.y += dt * 45; shooting.life -= dt;
      for (let i = 0; i < 8; i++) {
        c.globalAlpha = (1 - i / 8) * clamp(shooting.life * 2, 0, 1);
        c.fillStyle = i < 2 ? '#fff7d0' : '#cfc6e6';
        c.fillRect(Math.round(shooting.x + i * 2.6), Math.round(shooting.y - i), 1, 1);
      }
      c.globalAlpha = 1;
      if (shooting.life <= 0) shooting = null;
    }
  }

  function buildSide() {
    sideCv = mk(W, H);
    const c = sideCv.getContext('2d');
    const r = rng(11);
    for (let x = 0; x < W; x++) {
      const h1 = groundY - 13 - Math.round((Math.sin(x * 0.045) + Math.sin(x * 0.021 + 1.3)) * 4);
      c.fillStyle = '#131f1b';
      c.fillRect(x, h1, 1, groundY - h1);
    }
    // uzak çamlar
    for (let i = 0; i < W / 9; i++) {
      const x = Math.floor(r() * W), h = 5 + Math.floor(r() * 6);
      const base = groundY - 10 - Math.round((Math.sin(x * 0.045) + Math.sin(x * 0.021 + 1.3)) * 4);
      c.fillStyle = '#0f1915';
      for (let j = 0; j < h; j++) {
        const w = Math.floor((j / h) * 3);
        c.fillRect(x - w, base - h + j, w * 2 + 1, 1);
      }
    }
    for (let x = 0; x < W; x++) {
      const h2 = groundY - 4 - Math.round((Math.sin(x * 0.07 + 2) + 1) * 2.5);
      c.fillStyle = '#1a3324';
      c.fillRect(x, h2, 1, groundY - h2);
    }
    // toprak + çimen
    c.fillStyle = '#3a281c'; c.fillRect(0, groundY, W, H - groundY);
    c.fillStyle = '#2f6b3a'; c.fillRect(0, groundY, W, 4);
    c.fillStyle = '#4f9a4a'; c.fillRect(0, groundY, W, 1);
    for (let i = 0; i < (W * (H - groundY)) / 14; i++) {
      c.fillStyle = r() < 0.5 ? '#2e1f16' : '#4a3424';
      c.fillRect(Math.floor(r() * W), groundY + 5 + Math.floor(r() * (H - groundY)), 1, 1);
    }
    for (let i = 0; i < W / 3; i++) {
      const x = Math.floor(r() * W);
      c.fillStyle = r() < 0.5 ? '#5fb85a' : '#3f8f4a';
      c.fillRect(x, groundY - 1, 1, 1);
      if (r() < 0.4) c.fillRect(x + 1, groundY - 2, 1, 2);
    }
    for (let i = 0; i < W / 22; i++) {
      const x = Math.floor(r() * (W - 6));
      c.drawImage(Px.LILY, x, groundY - 8);
    }
    for (let i = 0; i < W / 16; i++) {
      c.drawImage(Px.ROSE, Math.floor(r() * (W - 3)), groundY - 5);
    }
  }

  const flies = Array.from({ length: 16 }, () => ({ x: Math.random(), y: Math.random(), p: Math.random() * 6.28, s: rand(0.3, 1) }));
  function drawFlies(c, top, bottom) {
    for (const f of flies) {
      const x = Math.round(f.x * W + Math.sin(T * 0.4 * f.s + f.p) * 10);
      const y = Math.round(top + f.y * (bottom - top) + Math.cos(T * 0.5 * f.s + f.p * 2) * 6);
      const a = 0.5 + 0.5 * Math.sin(T * 2 * f.s + f.p);
      c.globalAlpha = a * 0.25;
      c.fillStyle = '#e8ff8a';
      c.fillRect(x - 1, y - 1, 3, 3);
      c.globalAlpha = a;
      c.fillRect(x, y, 1, 1);
    }
    c.globalAlpha = 1;
  }

  function makeActor(kind, x) {
    return { kind, x, y: 0, jump: 0, vy: 0, walking: false, blinkT: rand(1, 4), blink: 0, flip: false, cheer: 0 };
  }
  function updateActor(a, dt) {
    a.blinkT -= dt;
    if (a.blinkT <= 0) { a.blink = 0.13; a.blinkT = rand(2.2, 4.8); }
    a.blink = Math.max(0, a.blink - dt);
    a.cheer = Math.max(0, a.cheer - dt);
    if (a.jump > 0 || a.vy !== 0) {
      a.vy -= 260 * dt;
      a.jump += a.vy * dt;
      if (a.jump <= 0) { a.jump = 0; a.vy = 0; }
    }
  }
  const hop = (a, v = 70) => { if (a.jump === 0) { a.vy = v; a.jump = 0.01; } };

  function drawActor(c, a, footY) {
    const set = a.kind === 'ela' ? Px.ela : Px.gokhan;
    let spr = set.idle, bob = 0;
    if (a.walking) {
      const f = Math.floor(T * 7) % 2;
      spr = f ? set.walk : set.idle;
      bob = f;
    } else if (a.cheer > 0 || a.jump > 0) spr = set.cheer;
    else if (a.blink > 0) spr = set.blink;
    const x = Math.round(a.x - spr.width / 2), y = Math.round(footY - spr.height - a.jump - bob);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(Math.round(a.x - 5), Math.round(footY - 1), 10, 2);
    c.save();
    if (a.flip) { c.translate(x + spr.width, y); c.scale(-1, 1); c.drawImage(spr, 0, 0); }
    else c.drawImage(spr, x, y);
    c.restore();
  }

  function makeCat(color, x, y, flip = false) {
    return { color, x, y, flip, tailT: rand(0, 2), blinkT: rand(1, 5), jump: 0, vy: 0, heartT: 0 };
  }
  function drawCat(c, k, dt) {
    k.tailT += dt; k.blinkT -= dt;
    if (k.blinkT < -0.15) k.blinkT = rand(2, 6);
    if (k.jump > 0 || k.vy !== 0) {
      k.vy -= 260 * dt; k.jump += k.vy * dt;
      if (k.jump <= 0) { k.jump = 0; k.vy = 0; }
    }
    const set = Px.cats[k.color];
    const spr = k.blinkT < 0 ? set.blink : Math.floor(k.tailT * 1.6) % 2 ? set.tail : set.sit;
    const x = Math.round(k.x - 6), y = Math.round(k.y - 11 - k.jump);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(Math.round(k.x - 4), Math.round(k.y - 1), 8, 1);
    c.save();
    if (k.flip) { c.translate(x + 12, y); c.scale(-1, 1); c.drawImage(spr, 0, 0); }
    else c.drawImage(spr, x, y);
    c.restore();
  }
  const catHit = (k, x, y) => Math.abs(x - k.x) < 9 && y > k.y - 15 && y < k.y + 3;
  const CAT_LINES = [
    'Miyav! (Çeviri: iyi ki doğdun!)',
    'Mrrr... 😽',
    'Miyav miyav! (Bana da pasta var mı?)',
    '*mırlar*',
    'Miyav. (gobeemi kaşı lütfen.)',
    'Mrrrao! 🐾',
  ];
  function petCat(k) {
    Sound.sfx.meow();
    k.vy = 60; k.jump = 0.01;
    addPart('world', { x: k.x, y: k.y - 14, vx: rand(-4, 4), vy: -18, g: 0, life: 1.2, sprite: Px.HEART });
    toast(pick(CAT_LINES));
  }

  const parts = { world: [], top: [] };
  function addPart(layer, p) {
    parts[layer].push(Object.assign({ g: 60, drag: 1, size: 1, max: p.life }, p));
  }
  function burst(layer, x, y, n, opts = {}) {
    const colors = opts.colors || PALETTE;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(opts.min ?? 20, opts.max ?? 70);
      addPart(layer, {
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opts.up ?? 20),
        g: opts.g ?? 90, drag: opts.drag ?? 0.2, life: rand(0.5, opts.life ?? 1.1),
        color: pick(colors), size: Math.random() < 0.3 ? 2 : 1, flicker: opts.flicker,
      });
    }
  }
  function confetti(n = 60) {
    for (let i = 0; i < n; i++) {
      addPart('top', {
        x: rand(0, W), y: rand(-H * 0.4, -2), vx: rand(-8, 8), vy: rand(15, 35), g: 6, drag: 1,
        life: rand(3, 6), color: pick(PALETTE), w: Math.random() < 0.5 ? 2 : 1, h: Math.random() < 0.5 ? 1 : 2, sway: rand(0, 6),
      });
    }
  }
  function updateParts(layer, c, dt) {
    const arr = parts[layer];
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.life -= dt;
      if (p.life <= 0) { arr.splice(i, 1); continue; }
      p.vy += p.g * dt;
      const d = Math.pow(p.drag, dt);
      p.vx *= d; p.vy *= d;
      p.x += (p.vx + (p.sway ? Math.sin(T * 3 + p.sway) * 10 : 0)) * dt;
      p.y += p.vy * dt;
      const fade = p.life / p.max;
      if (p.flicker && fade < 0.4 && Math.random() < 0.4) continue;
      if (p.sprite) {
        c.globalAlpha = clamp(fade * 2, 0, 1);
        c.drawImage(p.sprite, Math.round(p.x - p.sprite.width / 2), Math.round(p.y));
      } else {
        c.globalAlpha = p.alpha ? p.alpha * clamp(fade * 2, 0, 1) : 1;
        c.fillStyle = p.color;
        c.fillRect(Math.round(p.x), Math.round(p.y), p.w || p.size, p.h || p.size);
      }
    }
    c.globalAlpha = 1;
  }

  const rockets = [];
  function launchFirework(x = rand(W * 0.15, W * 0.85), ty = rand(H * 0.12, groundY * 0.5)) {
    rockets.push({ x, y: groundY, ty, vx: rand(-8, 8), vy: -Math.max(70, (groundY - ty) * 1.7) });
    Sound.sfx.launch();
  }
  function explode(x, y) {
    const shape = pick(['ring', 'burst', 'burst', 'heart']);
    const c1 = pick(PALETTE), c2 = pick(PALETTE);
    const n = shape === 'heart' ? 34 : 40;
    for (let i = 0; i < n; i++) {
      let vx, vy;
      if (shape === 'heart') {
        const t = (i / n) * Math.PI * 2;
        vx = 16 * Math.pow(Math.sin(t), 3) * 2.6;
        vy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 2.6;
      } else {
        const a = (i / n) * Math.PI * 2 + rand(-0.1, 0.1);
        const sp = shape === 'ring' ? 42 : rand(10, 50);
        vx = Math.cos(a) * sp; vy = Math.sin(a) * sp;
      }
      addPart('world', { x, y, vx, vy, g: 14, drag: 0.35, life: rand(1.1, 1.7), color: shape === 'heart' ? (i % 2 ? '#e04848' : '#f29ab0') : i % 2 ? c1 : c2, flicker: true });
    }
    Sound.sfx.boom();
  }
  function updateRockets(c, dt) {
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.vy += 40 * dt;
      r.x += r.vx * dt; r.y += r.vy * dt;
      addPart('world', { x: r.x, y: r.y + 1, vx: rand(-3, 3), vy: rand(4, 12), g: 0, life: 0.35, color: '#ffd34e', alpha: 0.7 });
      c.fillStyle = '#fff7d0';
      c.fillRect(Math.round(r.x), Math.round(r.y), 1, 2);
      if (r.y <= r.ty || r.vy >= -8) { rockets.splice(i, 1); explode(r.x, r.y); }
    }
  }

  const fadeEl = $('#fade');
  const fadeOut = () => { fadeEl.classList.add('on'); return sleep(380); };
  const fadeIn = () => { fadeEl.classList.remove('on'); return sleep(380); };

  let toastTimer;
  function toast(text, ms = 2400) {
    const el = $('#toast');
    el.textContent = text;
    el.hidden = false;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, ms);
  }

  async function splash(small, big, ms = 1700) {
    const el = $('#splash');
    el.querySelector('.splash-small').textContent = small;
    el.querySelector('.splash-big').textContent = big;
    el.hidden = false;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    await sleep(ms);
    el.hidden = true;
  }

  function updateHud() {
    $('#hud-slots').innerHTML = save.done.map((d) => `<i class="slot${d ? ' on' : ''}"></i>`).join('');
    const btn = $('#btn-sound');
    btn.classList.toggle('off', save.muted);
    btn.setAttribute('aria-label', save.muted ? 'Sesi aç' : 'Sesi kapat');
  }
  const showHud = (on) => { $('#hud').hidden = !on; };

  const SPEAKERS = {
    pati: { name: () => C.rehber.toLocaleUpperCase('tr'), bg: '#5a3a26', draw: (c) => c.drawImage(Px.cats.turuncu.sit, 2, 4) },
    gokhan: { name: () => C.gonderen.toLocaleUpperCase('tr'), bg: '#2f6e3a', draw: (c) => c.drawImage(Px.gokhan.idle, 2, 1, 16, 16, 0, 0, 16, 16) },
    ela: { name: () => C.isim.toLocaleUpperCase('tr'), bg: '#a12c34', draw: (c) => c.drawImage(Px.ela.idle, 1, 3, 16, 16, 0, 0, 16, 16) },
  };

  const Dialog = {
    el: $('#dialog'), catcher: $('#dlg-catch'), textEl: $('#dlg-text'), nameEl: $('#dlg-name'),
    portrait: $('#dlg-portrait').getContext('2d'),
    resolve: null, typing: false, full: '',
    async say(lines) {
      this.el.hidden = false; this.catcher.hidden = false;
      for (const l of lines) await this.line(l);
      this.el.hidden = true; this.catcher.hidden = true;
    },
    line({ who, text }) {
      const sp = SPEAKERS[who];
      this.nameEl.textContent = sp.name();
      const p = this.portrait;
      p.clearRect(0, 0, 16, 16);
      p.fillStyle = sp.bg; p.fillRect(0, 0, 16, 16);
      sp.draw(p);
      this.el.classList.remove('pop'); void this.el.offsetWidth; this.el.classList.add('pop');
      this.full = text;
      this.textEl.textContent = '';
      this.typing = true;
      const chars = Array.from(text), id = (this.seq = (this.seq || 0) + 1);
      let i = 0;
      const step = () => {
        if (!this.typing || id !== this.seq) return;
        if (i >= chars.length) { this.typing = false; this.el.classList.add('done'); return; }
        this.textEl.textContent += chars[i];
        if (i % 2 === 0 && chars[i] !== ' ') Sound.sfx.tick();
        const ch = chars[i++];
        setTimeout(step, '.!?'.includes(ch) ? 160 : ',' === ch ? 90 : 26);
      };
      this.el.classList.remove('done');
      step();
      return new Promise((res) => { this.resolve = res; });
    },
    advance() {
      if (this.el.hidden) return;
      if (this.typing) {
        this.typing = false;
        this.textEl.textContent = this.full;
        this.el.classList.add('done');
        return;
      }
      Sound.sfx.blip();
      const r = this.resolve;
      this.resolve = null;
      r?.();
    },
  };
  Dialog.catcher.addEventListener('pointerdown', (e) => { e.preventDefault(); Dialog.advance(); });
  Dialog.el.addEventListener('pointerdown', (e) => { e.preventDefault(); Dialog.advance(); });

  const imgCache = new Map();
  function loadImg(src) {
    if (!imgCache.has(src)) {
      imgCache.set(src, new Promise((res) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = () => res(null);
        im.src = src;
      }));
    }
    return imgCache.get(src);
  }
  async function pixelReveal(canvas, src, focus = 0.4) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = Math.round((canvas.offsetWidth || 280) * dpr);
    canvas.width = size; canvas.height = size;
    const c = canvas.getContext('2d');
    const im = await loadImg(src);
    if (!im) {
      c.fillStyle = '#2a1e26'; c.fillRect(0, 0, size, size);
      c.fillStyle = '#fff1d6'; c.font = `${size / 10}px "Press Start 2P"`; c.textAlign = 'center';
      c.fillText('FOTO?', size / 2, size / 2);
      return;
    }
    const s = Math.min(im.width, im.height);
    const sx = (im.width - s) / 2, sy = (im.height - s) * focus;
    const tmp = mk(size, size), tc = tmp.getContext('2d');
    for (const k of [48, 32, 20, 12, 8, 5, 3, 2]) {
      const n = Math.max(2, Math.round(size / k));
      tmp.width = n; tmp.height = n;
      tc.drawImage(im, sx, sy, s, s, 0, 0, n, n);
      c.imageSmoothingEnabled = false;
      c.drawImage(tmp, 0, 0, n, n, 0, 0, size, size);
      await sleep(85);
    }
    c.imageSmoothingEnabled = true;
    c.drawImage(im, sx, sy, s, s, 0, 0, size, size);
  }

  function revealCard(i) {
    const card = C.anilar[i];
    const ov = $('#card');
    const box = $('#card3d');
    $('#card-no').textContent = `#${i + 1}`;
    $('#card-note').textContent = card.not;
    $('#card-title').textContent = 'YENİ ANI KARTI!';
    box.classList.remove('flip');
    ov.hidden = false;
    const btn = $('#card-ok');
    btn.hidden = true;
    return new Promise((res) => {
      setTimeout(() => {
        box.classList.add('flip');
        Sound.sfx.sparkle();
        confetti(40);
        pixelReveal($('#card-canvas'), card.foto, card.odak).then(() => { btn.hidden = false; btn.focus(); });
      }, 650);
      btn.onclick = () => { Sound.sfx.select(); ov.hidden = true; res(); };
    });
  }

  let lbList = [], lbIdx = 0;
  function openLightbox(list, idx) {
    lbList = list; lbIdx = idx;
    $('#lightbox').hidden = false;
    showLb();
  }
  function showLb() {
    const it = lbList[lbIdx];
    const img = $('#lb-img');
    img.src = it.foto;
    img.alt = it.not || '';
    $('#lb-tag').textContent = it.etiket || '';
    $('#lb-cap').textContent = it.not || '';
    $('#lb-prev').hidden = $('#lb-next').hidden = lbList.length < 2;
  }
  const lbMove = (d) => { lbIdx = (lbIdx + d + lbList.length) % lbList.length; Sound.sfx.blip(); showLb(); };
  $('#lb-prev').onclick = (e) => { e.stopPropagation(); lbMove(-1); };
  $('#lb-next').onclick = (e) => { e.stopPropagation(); lbMove(1); };
  $('#lb-close').onclick = () => { $('#lightbox').hidden = true; };
  {
    let sx = null;
    const lb = $('#lightbox');
    lb.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    lb.addEventListener('pointerup', (e) => {
      if (sx !== null && Math.abs(e.clientX - sx) > 50) lbMove(e.clientX < sx ? 1 : -1);
      sx = null;
    });
  }

  const thumb = (src) => src.replace('foto/', 'foto/k/');

  function openCards() {
    Sound.sfx.select();
    const grid = $('#cards-grid');
    grid.innerHTML = '';
    C.anilar.forEach((a, i) => {
      const b = document.createElement('button');
      b.className = 'polaroid';
      b.style.setProperty('--r', `${[-2, 1.5, -1][i % 3]}deg`);
      if (save.done[i]) {
        b.innerHTML = `<img src="${thumb(a.foto)}" alt="" loading="lazy"><span class="lv">ANI KARTI #${i + 1}</span><span class="cap"></span>`;
        b.querySelector('.cap').textContent = a.not;
        b.onclick = () => openLightbox(C.anilar.filter((_, k) => save.done[k]).map((x, k) => ({ ...x, etiket: `ANI KARTI #${k + 1}` })), C.anilar.slice(0, i).filter((_, k) => save.done[k]).length);
      } else {
        b.classList.add('locked');
        b.innerHTML = `<span class="q">?</span><span class="lv">ANI KARTI #${i + 1}</span><span class="cap">Bölüm ${i + 1}'i bitirince açılır</span>`;
        b.onclick = () => { Sound.sfx.wrong(); };
      }
      grid.appendChild(b);
    });
    $('#cards').hidden = false;
  }

  function openAlbum() {
    Sound.sfx.select();
    const grid = $('#album-grid');
    if (!grid.childElementCount) {
      C.album.forEach((a, i) => {
        const b = document.createElement('button');
        b.className = 'polaroid';
        b.style.setProperty('--r', `${((i * 37) % 7) - 3}deg`);
        b.innerHTML = `<img src="${thumb(a.foto)}" alt="" loading="lazy"><span class="lv"></span><span class="cap"></span>`;
        b.querySelector('.lv').textContent = a.etiket;
        b.querySelector('.cap').textContent = a.not;
        b.onclick = () => openLightbox(C.album, i);
        grid.appendChild(b);
      });
      const last = document.createElement('div');
      last.className = 'polaroid future';
      last.innerHTML = `<span class="q">22</span><span class="lv">KAYIT ${String(C.album.length + 1).padStart(2, '0')}</span><span class="cap">Yas ${C.yas}: yeni anılar edinnn!!!<span class="dots"></span></span>`;
      grid.appendChild(last);
    }
    $('#album').hidden = false;
  }

  let letterTyping = false;
  async function openLetter() {
    Sound.sfx.select();
    const ov = $('#letter');
    ov.hidden = false;
    const env = $('#envelope'), paper = $('#paper'), text = $('#letter-text');
    env.hidden = false; env.classList.remove('open');
    paper.hidden = true;
    $('#letter-btns').hidden = true;
    $('#letter-sign').hidden = true;
    text.textContent = '';
    await new Promise((res) => { env.onclick = res; });
    env.onclick = null;
    Sound.sfx.unlock();
    env.classList.add('open');
    await sleep(700);
    env.hidden = true;
    paper.hidden = false;
    $('#letter-btns').hidden = false;
    $('#letter-skip').hidden = false;
    const chars = Array.from(C.mektup);
    const caret = document.createElement('span');
    caret.className = 'caret';
    const node = document.createTextNode('');
    text.append(node, caret);
    letterTyping = true;
    for (let i = 0; i < chars.length && letterTyping; i++) {
      node.data += chars[i];
      if (i % 3 === 0 && chars[i].trim()) Sound.sfx.tick();
      if (i % 20 === 0) paper.scrollTop = paper.scrollHeight;
      const ch = chars[i];
      await sleep(ch === '\n' ? 140 : '.!?'.includes(ch) ? 200 : ch === ',' ? 90 : 24);
    }
    node.data = C.mektup;
    letterTyping = false;
    caret.remove();
    $('#letter-skip').hidden = true;
    const sign = $('#letter-sign');
    sign.textContent = `— ${C.gonderen}`;
    sign.hidden = false;
    Sound.sfx.save();
    paper.scrollTop = paper.scrollHeight;
  }
  $('#letter-skip').onclick = () => { letterTyping = false; };
  $('#letter-close').onclick = () => { letterTyping = false; $('#letter').hidden = true; };

  const scenes = {};
  let scene = null;
  function setScene(name, opts) {
    scene?.exit?.();
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === name));
    scene = scenes[name];
    scene.enter?.(opts);
  }

  scenes.title = {
    enter() {
      showHud(false);
      this.ela = makeActor('ela', W / 2);
      this.cats = [makeCat('turuncu', 0, 0), makeCat('siyah', 0, 0, true)];
      const menu = $('#title-menu');
      const any = save.done.some(Boolean) || save.intro;
      menu.innerHTML = any
        ? `<button class="pbtn" data-act="devam">▶ DEVAM ET</button><button class="pbtn ghost" data-act="yeni">YENİ OYUN</button>`
        : `<button class="press" data-act="basla">PRESS START</button><span class="press-sub">başlamak için dokun</span>`;
      menu.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); this.go(b.dataset.act); }));
      menu.querySelector('[data-act]').focus({ preventScroll: true });
      $('#title').classList.toggle('tap-any', !any);
      $('#title').onclick = () => { if (!any) this.go('basla'); };
      this.resize();
      document.fonts?.ready.then(() => this.resize());
    },
    resize() {
      if (!this.ela) return;
      const m = $('#title-menu');
      const cx = (m.offsetTop + m.offsetHeight) / S > groundY - 32 ? Math.round(W * 0.16) + 8 : W / 2;
      this.ela.x = cx;
      this.cats[0].x = cx - 20; this.cats[0].y = groundY + 1;
      this.cats[1].x = cx + 20; this.cats[1].y = groundY + 1;
    },
    async go(act) {
      if (this.busy) return;
      this.busy = true;
      Sound.init();
      Sound.sfx.save();
      if (act === 'yeni') {
        Object.assign(save, { done: [false, false, false], intro: false, finished: false });
        persist();
      }
      $('#title').classList.add('starting');
      hop(this.ela, 90);
      await sleep(650);
      await fadeOut();
      $('#title').classList.remove('starting');
      this.busy = false;
      if (save.finished) {
        setScene('final');
        await fadeIn();
        return;
      }
      setScene('map');
      await fadeIn();
      if (!save.intro) {
        await Dialog.say([
          { who: 'pati', text: `Miyav! Selam ${C.isim}! Ben ${C.rehber}, bu oyunun resmi rehberiyim.` },
          { who: 'pati', text: `Kulağıma bir haber geldi: ${C.yas}. yasina giriyormussunnn!` },
          { who: 'pati', text: 'Ama bir sorun var... Doğum günü pastası kilitli bir kapının ardında.' },
          { who: 'pati', text: 'Kilidi açmak için önce iki görevi tamamlaman gerek. Her görev sana bir ANI KARTI kazandıracak.' },
          { who: 'pati', text: 'Zıplayan oku görüyor musun? İlk durağımız orası. Hadi gidelim, miyav!' },
        ]);
        save.intro = true;
        persist();
      }
    },
    update(dt) {
      updateActor(this.ela, dt);
      if (Math.random() < dt * 0.25) hop(this.ela, 50);
    },
    draw(c, dt) {
      drawSky(c, dt);
      c.drawImage(sideCv, 0, 0);
      drawFlies(c, groundY * 0.55, groundY);
      for (const k of this.cats) drawCat(c, k, dt);
      drawActor(c, this.ela, groundY + 1);
    },
    tap(x, y) {
      for (const k of this.cats) if (catHit(k, x, y)) { Sound.init(); petCat(k); return true; }
      return false;
    },
  };

  const LEVELS = [
    { name: 'BİLGİ YARIŞMASI', sub: 'Konusu: Sen!', scene: 'quiz', roof: '#c0392b', roofD: '#8a2525', icon: '?' },
    { name: 'BALON FESTİVALİ', sub: 'Mesajlı balonları bul', scene: 'balloons', roof: '#3f8f4a', roofD: '#2a6233', icon: 'b' },
    { name: 'DOĞUM GÜNÜ PASTASI', sub: 'Dilek tutma vakti', scene: 'cake', roof: '#8a5a3a', roofD: '#5a3a26', icon: 'c' },
  ];
  const cakeUnlocked = () => save.done[0] && save.done[1];
  const nextLevel = () => (!save.done[0] ? 0 : !save.done[1] ? 1 : !save.done[2] ? 2 : -1);

  scenes.map = {
    enter(opts = {}) {
      showHud(true);
      updateHud();
      Sound.play('koy');
      this.at = opts.at ?? save.done.lastIndexOf(true);
      this.walkTo = null;
      this.ela = makeActor('ela', 0);
      this.resize();
      this.renderLabels();
      this.updateHint();
    },
    exit() { $('#map-labels').innerHTML = ''; },
    resize() {
      if (!this.ela) return;
      const P = portrait
        ? [[0.5, 0.97], [0.3, 0.76], [0.7, 0.52], [0.36, 0.3]]
        : [[0.06, 0.86], [0.22, 0.7], [0.52, 0.5], [0.8, 0.72]];
      const pts = P.map(([x, y]) => [Math.round(x * W), Math.round(y * H)]);
      // Catmull-Rom ile yumuşak yol
      this.path = [];
      this.nodeIdx = [0];
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
        const steps = Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 1.5);
        for (let s = 0; s < steps; s++) {
          const t = s / steps, t2 = t * t, t3 = t2 * t;
          const f = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t2 + (-a + 3 * b - 3 * c2 + d) * t3);
          this.path.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
        }
        this.nodeIdx.push(this.path.length);
      }
      this.path.push(pts[pts.length - 1]);
      this.nodes = pts.slice(1).map(([x, y]) => ({ x, y }));
      this.pos = this.at < 0 ? 0 : this.nodeIdx[this.at + 1];
      if (this.walkTo) this.pos = this.walkTo.idx;
      this.walkTo = null;
      this.buildMap();
      this.cats = [
        makeCat('gri', clamp(this.nodes[0].x + 20, 8, W - 8), this.nodes[0].y + 6, true),
        makeCat('siyah', clamp(this.nodes[1].x - 22, 8, W - 8), this.nodes[1].y + 8),
        makeCat('beyaz', clamp(this.nodes[2].x + 21, 8, W - 8), this.nodes[2].y + 7, true),
        makeCat('turuncu', clamp(pts[0][0] + (portrait ? 18 : 14), 8, W - 8), clamp(pts[0][1] - 4, 0, H - 2)),
      ];
      this.renderLabels();
    },
    buildMap() {
      const cvs = mk(W, H), c = cvs.getContext('2d');
      const r = rng(23);
      c.fillStyle = '#22492b'; c.fillRect(0, 0, W, H);
      for (let i = 0; i < (W * H) / 5; i++) {
        c.fillStyle = ['#285331', '#1d4026', '#2d5c36', '#22492b'][Math.floor(r() * 4)];
        c.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1, 1);
      }
      const nearPath = (x, y, d) => {
        for (let i = 0; i < this.path.length; i += 3) if (Math.hypot(this.path[i][0] - x, this.path[i][1] - y) < d) return true;
        return this.nodes.some((n) => Math.abs(n.x - x) < 18 + d / 2 && y > n.y - 28 - d / 2 && y < n.y + 6);
      };
      for (const [col, rad] of [['#3e2a1c', 5], ['#7a5236', 4], ['#8f6343', 2]]) {
        c.fillStyle = col;
        for (let i = 0; i < this.path.length; i += 1) disc(c, Math.round(this.path[i][0]), Math.round(this.path[i][1]), rad);
      }
      for (let i = 0; i < this.path.length; i += 4) {
        if (r() < 0.5) continue;
        c.fillStyle = r() < 0.5 ? '#a8805c' : '#5e3f2a';
        c.fillRect(Math.round(this.path[i][0] + rand(-3, 3)), Math.round(this.path[i][1] + rand(-3, 3)), 1, 1);
      }
      for (let i = 0; i < (W * H) / 70; i++) {
        const x = Math.floor(r() * W), y = Math.floor(r() * H);
        if (nearPath(x, y, 6)) continue;
        const t = r();
        if (t < 0.68) {
          c.fillStyle = '#3f8f4a';
          c.fillRect(x, y, 1, 1); c.fillRect(x + 2, y, 1, 1); c.fillRect(x + 1, y - 1, 1, 1);
        } else if (t < 0.92) {
          c.fillStyle = '#fff6ea';
          c.fillRect(x, y - 1, 1, 1); c.fillRect(x - 1, y, 3, 1); c.fillRect(x, y + 1, 1, 1);
          c.fillStyle = '#ff9a3a'; c.fillRect(x, y, 1, 1);
        } else {
          c.fillStyle = '#e04848'; c.fillRect(x, y, 2, 1);
          c.fillStyle = '#a12c34'; c.fillRect(x, y + 1, 2, 1);
        }
      }
      const trees = [];
      for (let i = 0; i < 160 && trees.length < Math.round((W * H) / 1400); i++) {
        const x = Math.floor(r() * W), y = Math.floor(r() * H);
        const rad = 5 + Math.floor(r() * 4);
        if (nearPath(x, y, rad + 7)) continue;
        if (y < 14) continue;
        trees.push([x, y, rad]);
      }
      trees.sort((a, b) => a[1] - b[1]);
      for (const [x, y, rad] of trees) {
        c.fillStyle = 'rgba(0,0,0,0.35)'; disc(c, x + 2, y + 3, rad);
        c.fillStyle = '#143220'; disc(c, x, y, rad);
        c.fillStyle = '#1d4a2c'; disc(c, x - 1, y - 1, rad - 2);
        c.fillStyle = '#2b6a3c'; disc(c, x - 2, y - 2, Math.max(1, rad - 4));
      }
      this.mapCv = cvs;
    },
    renderLabels() {
      const box = $('#map-labels');
      box.innerHTML = '';
      if (!this.nodes) return;
      LEVELS.forEach((L, i) => {
        const n = this.nodes[i];
        const b = document.createElement('button');
        const locked = i === 2 && !cakeUnlocked();
        b.className = 'map-label' + (save.done[i] ? ' done' : '') + (locked ? ' locked' : '') + (i === nextLevel() ? ' next' : '');
        b.style.left = n.x * S + 'px';
        b.style.top = (n.y - 31) * S + 'px';
        b.innerHTML = `<span class="no">${i + 1}</span><span class="nm"></span><span class="st">${save.done[i] ? '✔' : locked ? '🔒' : ''}</span>`;
        b.querySelector('.nm').textContent = L.name;
        b.onclick = (e) => { e.stopPropagation(); this.choose(i); };
        box.appendChild(b);
      });
    },
    updateHint() {
      const n = nextLevel();
      $('#map-hint').textContent = n === -1 ? 'Tüm bölümler bitti! 🎉' : `Sıradaki: ${LEVELS[n].name}`;
    },
    choose(i) {
      if (this.walkTo || !Dialog.el.hidden) return;
      Sound.init();
      if (i === 2 && !cakeUnlocked()) {
        Sound.sfx.wrong();
        toast('🔒 Kapı kilitli! Önce diğer iki bölümü bitir.');
        $('#map-labels').children[2]?.classList.add('shake');
        setTimeout(() => $('#map-labels').children[2]?.classList.remove('shake'), 400);
        return;
      }
      Sound.sfx.select();
      this.walkTo = { idx: this.nodeIdx[i + 1], level: i };
    },
    update(dt) {
      updateActor(this.ela, dt);
      if (this.walkTo) {
        const dir = Math.sign(this.walkTo.idx - this.pos);
        const before = this.pos;
        this.pos += dir * dt * 70;
        if ((dir > 0 && this.pos >= this.walkTo.idx) || (dir < 0 && this.pos <= this.walkTo.idx) || dir === 0) {
          this.pos = this.walkTo.idx;
          const lvl = this.walkTo.level;
          this.walkTo = null;
          this.ela.walking = false;
          this.at = lvl;
          enterLevel(lvl);
        } else {
          this.ela.walking = true;
          const p0 = this.path[Math.round(before)], p1 = this.path[Math.round(this.pos)];
          if (p1 && p0 && Math.abs(p1[0] - p0[0]) > 0.01) this.ela.flip = p1[0] < p0[0];
          if (Math.floor(before / 9) !== Math.floor(this.pos / 9)) Sound.sfx.step();
        }
      }
    },
    draw(c, dt) {
      c.drawImage(this.mapCv, 0, 0);
      const items = [];
      LEVELS.forEach((L, i) => items.push({ y: this.nodes[i].y - 2, draw: () => this.drawHouse(c, i) }));
      for (const k of this.cats) items.push({ y: k.y, draw: () => drawCat(c, k, dt) });
      const p = this.path[clamp(Math.round(this.pos), 0, this.path.length - 1)];
      this.ela.x = p[0];
      items.push({ y: p[1] + 1, draw: () => drawActor(c, this.ela, p[1] + 2) });
      items.sort((a, b) => a.y - b.y).forEach((it) => it.draw());
      drawFlies(c, 0, H);
      const n = nextLevel();
      if (n >= 0 && !this.walkTo && (n < 2 || cakeUnlocked())) {
        const nd = this.nodes[n];
        c.drawImage(Px.ARROW, nd.x - 3, Math.round(nd.y - 30 + Math.sin(T * 5) * 1.5));
      }
    },
    drawHouse(c, i) {
      const L = LEVELS[i], { x, y } = this.nodes[i];
      const bx = x - 12, by = y - 15;
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(bx + 2, by + 13, 26, 3);
      c.fillStyle = '#e8d6b5'; c.fillRect(bx, by, 24, 13);
      c.fillStyle = '#c9b48a'; c.fillRect(bx, by + 11, 24, 2); c.fillRect(bx + 22, by, 2, 13);
      for (let j = 0; j < 8; j++) {
        c.fillStyle = j % 3 === 2 ? L.roofD : L.roof;
        c.fillRect(bx - 2 + j, by - 8 + j, 28 - j * 2, 1);
      }
      c.fillStyle = L.roofD;
      c.fillRect(bx - 2, by - 1, 28, 1);
      c.fillStyle = '#5a3a26'; c.fillRect(x - 2, by + 5, 5, 8);
      c.fillStyle = '#ffd34e'; c.fillRect(x + 1, by + 9, 1, 1);
      const glow = 0.55 + 0.15 * Math.sin(T * 2 + i);
      for (const wx of [bx + 3, bx + 17]) {
        c.fillStyle = '#5a3a26'; c.fillRect(wx - 1, by + 3, 6, 5);
        c.fillStyle = `rgba(255,211,78,${glow})`; c.fillRect(wx, by + 4, 4, 3);
        c.fillStyle = '#5a3a26'; c.fillRect(wx + 2, by + 4, 1, 3);
      }
      c.fillStyle = 'rgba(255,211,78,0.07)'; disc(c, x, by + 6, 16);
      if (L.icon === '?') {
        c.fillStyle = '#fff1d6';
        c.fillRect(x - 1, by - 7, 3, 1); c.fillRect(x + 2, by - 6, 1, 2); c.fillRect(x, by - 4, 2, 1); c.fillRect(x, by - 2, 1, 1);
      } else if (L.icon === 'b') {
        c.drawImage(Px.balloon('#e04848', '#a12c34'), 0, 0, 14, 18, x - 9, by - 13, 7, 9);
        c.drawImage(Px.balloon('#ffd34e', '#c99a1e'), 0, 0, 14, 18, x + 2, by - 14, 7, 9);
      } else {
        c.fillStyle = '#fff1d6'; c.fillRect(x - 4, by - 4, 9, 1);
        c.fillStyle = '#8a5a3a'; c.fillRect(x - 4, by - 3, 9, 3);
        c.fillStyle = '#e04848'; c.fillRect(x, by - 6, 1, 2);
      }
      if (i === 2 && !cakeUnlocked()) {
        c.fillStyle = 'rgba(11,9,18,0.45)'; c.fillRect(bx - 2, by - 8, 28, 21);
        c.drawImage(Px.LOCK, x - 3, by + 4);
      }
      if (save.done[i]) c.drawImage(Px.STAR, x - 3, by - 15 + Math.round(Math.sin(T * 3 + i)));
    },
    tap(x, y) {
      for (const k of this.cats) if (catHit(k, x, y)) { petCat(k); return true; }
      for (let i = 0; i < 3; i++) {
        const n = this.nodes[i];
        if (Math.abs(x - n.x) < 16 && y > n.y - 26 && y < n.y + 4) { this.choose(i); return true; }
      }
      return false;
    },
  };

  async function enterLevel(i) {
    const L = LEVELS[i];
    Sound.sfx.select();
    await fadeOut();
    setScene(L.scene);
    await fadeIn();
    await splash(`BÖLÜM ${i + 1}`, L.name);
    scenes[L.scene].start?.();
  }

  async function completeLevel(i) {
    const first = !save.done[i];
    save.done[i] = true;
    persist();
    updateHud();
    Sound.sfx.victory();
    confetti(70);
    await splash('★ ★ ★', 'BÖLÜM TAMAMLANDI!', 1500);
    await revealCard(i);
    if (i === 2) {
      save.finished = true;
      persist();
      await fadeOut();
      setScene('final');
      await fadeIn();
      return;
    }
    await fadeOut();
    setScene('map', { at: i });
    await fadeIn();
    if (first && cakeUnlocked() && !save.done[2]) {
      await sleep(300);
      Sound.sfx.unlock();
      burst('world', scenes.map.nodes[2].x, scenes.map.nodes[2].y - 10, 30, { colors: ['#ffd34e', '#fff1d6'] });
      await Dialog.say([
        { who: 'pati', text: 'İki kart tamam! Duydun mu o sesi? KLİK!' },
        { who: 'pati', text: 'Pastanın kapısı açıldı. Hadi, son bölüm seni bekliyor!' },
      ]);
    } else if (first && i === 0) {
      await Dialog.say([{ who: 'pati', text: 'İlk karti aldin! Sırada Balon Festivali var.' }]);
    } else if (first && i === 1) {
      await Dialog.say([{ who: 'pati', text: 'Bir kart daha! Bilgi Yarışması seni bekliyor.' }]);
    }
  }

  scenes.quiz = {
    enter() {
      showHud(true);
      this.ela = makeActor('ela', 0);
      this.pati = makeCat('turuncu', 0, 0, true);
      this.bubble = 0;
      this.qi = 0; this.firstTry = 0; this.missed = false;
      this.resize();
      $('#quiz .quiz-panel').hidden = true;
    },
    resize() {
      if (!this.ela) return;
      this.ela.x = Math.round(W * (portrait ? 0.3 : 0.2));
      this.pati.x = Math.round(W * (portrait ? 0.68 : 0.8)); this.pati.y = groundY + 1;
    },
    async start() {
      await Dialog.say([
        { who: 'pati', text: 'Bilgi Yarışması\'na hoş geldin! Konu çok kolay: SEN!' },
        { who: 'pati', text: 'Yanlış cevap verirsen sorun yok, doğruyu bulana kadar deneyebilirsin. Ama ben gülerim, haberin olsun.' },
      ]);
      $('#quiz .quiz-panel').hidden = false;
      this.render();
    },
    render() {
      const q = C.quiz[this.qi];
      const n = C.quiz.length;
      this.missed = false;
      $('#quiz-count').textContent = `SORU ${this.qi + 1}/${n}`;
      $('#quiz-hearts').innerHTML = C.quiz.map((_, k) => `<i class="${k < this.qi ? 'on' : k === this.qi ? 'cur' : ''}"></i>`).join('');
      $('#quiz-q').textContent = q.soru;
      $('#quiz-react').textContent = '';
      const opts = $('#quiz-opts');
      opts.innerHTML = '';
      q.secenekler.forEach((s, k) => {
        const b = document.createElement('button');
        b.className = 'opt';
        b.style.animationDelay = `${k * 70}ms`;
        b.innerHTML = `<span class="k">${'ABCD'[k]}</span><span class="t"></span>`;
        b.querySelector('.t').textContent = s;
        b.onclick = () => this.answer(k, b);
        opts.appendChild(b);
      });
      const panel = $('#quiz .quiz-panel');
      panel.classList.remove('in'); void panel.offsetWidth; panel.classList.add('in');
    },
    async answer(k, btn) {
      if (this.locked || btn.disabled) return;
      const q = C.quiz[this.qi];
      const react = $('#quiz-react');
      const r = btn.getBoundingClientRect();
      if (k === q.dogru) {
        this.locked = true;
        if (!this.missed) this.firstTry++;
        btn.classList.add('ok');
        $('#quiz-opts').querySelectorAll('.opt').forEach((b) => { b.disabled = true; });
        Sound.sfx.coin();
        react.textContent = pick(C.dogruTepkiler);
        react.className = 'quiz-react good';
        burst('top', (r.left + r.width / 2) / S, (r.top + r.height / 2) / S, 26, { max: 60, g: 80 });
        hop(this.ela, 80);
        this.ela.cheer = 0.8;
        await sleep(1100);
        this.locked = false;
        this.qi++;
        if (this.qi < C.quiz.length) this.render();
        else this.finish();
      } else {
        this.missed = true;
        btn.classList.add('bad');
        btn.disabled = true;
        Sound.sfx.wrong();
        react.textContent = pick(C.yanlisTepkiler);
        react.className = 'quiz-react bad';
        this.pati.vy = 70; this.pati.jump = 0.01;
        this.bubble = 1.4;
      }
    },
    async finish() {
      $('#quiz .quiz-panel').hidden = true;
      const n = C.quiz.length, f = this.firstTry;
      const title = f === n ? 'EFSANE! Hepsini ilk denemede bildin! 🏆' : f >= n * 0.6 ? `${n} sorudan ${f} tanesini ilk denemede bildin. Ela Uzmanı unvanı senin! 🎓` : `${n} sorudan ${f} tanesini ilk denemede bildin. bilerek yaptin dimi! 😹`;
      await Dialog.say([{ who: 'pati', text: title }, { who: 'pati', text: 'İşte ilk anı kartın! ✨' }]);
      completeLevel(0);
    },
    update(dt) {
      updateActor(this.ela, dt);
      this.bubble = Math.max(0, this.bubble - dt);
    },
    draw(c, dt) {
      drawSky(c, dt);
      c.drawImage(sideCv, 0, 0);
      drawFlies(c, groundY * 0.5, groundY);
      drawActor(c, this.ela, groundY + 1);
      drawCat(c, this.pati, dt);
      if (this.bubble > 0) {
        const bx = Math.round(this.pati.x - 4), by = Math.round(this.pati.y - 26 - this.pati.jump);
        c.fillStyle = '#fff1d6'; c.fillRect(bx, by, 9, 8); c.fillRect(bx + 2, by + 8, 2, 2);
        c.fillStyle = '#e04848'; c.fillRect(bx + 2, by + 2, 1, 3); c.fillRect(bx + 2, by + 6, 1, 1);
        c.fillRect(bx + 5, by + 2, 1, 3); c.fillRect(bx + 5, by + 6, 1, 1);
      }
    },
    tap(x, y) {
      if (catHit(this.pati, x, y)) { petCat(this.pati); return true; }
      return false;
    },
  };

  const BALLOON_COLORS = [
    ['#e04848', '#a12c34'], ['#5fb85a', '#2f7a3a'], ['#a86b42', '#6b4024'], ['#fff1d6', '#d8c4a0'],
    ['#ffd34e', '#c99a1e'], ['#f29ab0', '#c46a84'],
  ];
  scenes.balloons = {
    enter() {
      showHud(true);
      this.list = [];
      this.got = 0; this.pops = 0; this.running = false;
      this.spawnT = 0; this.msgT = 1.2;
      this.ela = makeActor('ela', 0);
      this.pati = makeCat('turuncu', 0, 0);
      this.resize();
      $('#bal-msg').hidden = true;
      $('#bal-hud').hidden = true;
      this.updateCount();
    },
    resize() {
      if (!this.ela) return;
      this.ela.x = Math.round(W / 2);
      this.pati.x = Math.round(W / 2 + 18); this.pati.y = groundY + 1;
    },
    async start() {
      await Dialog.say([
        { who: 'pati', text: 'Balon Festivali\'ne hoş geldin! ' },
        { who: 'pati', text: 'Bazı balonların üstünde ✉ işareti var. İçlerinde sana yazılmış mesajlar saklı.' },
        { who: 'pati', text: 'Hepsini bul ve patlat! Ben patlatamıyorum... pençelerim çok sivri. ' },
      ]);
      $('#bal-hud').hidden = false;
      this.running = true;
    },
    updateCount() {
      $('#bal-count').textContent = `✉ ${this.got}/${C.balonlar.length}`;
      $('#bal-pops').textContent = `🎈 ${this.pops}`;
    },
    spawn(msg) {
      const isCat = !msg && Math.random() < 0.09;
      const [m, d] = msg ? pick([['#e04848', '#a12c34'], ['#ffd34e', '#c99a1e'], ['#5fb85a', '#2f7a3a']]) : pick(BALLOON_COLORS);
      this.list.push({
        x: rand(10, W - 10), y: H + 22, phase: rand(0, 6.28), sp: (H / rand(6.5, 9.5)) * (msg ? 0.85 : 1),
        spr: Px.balloon(m, d, isCat), color: m, msg, isCat,
      });
    },
    update(dt) {
      updateActor(this.ela, dt);
      if (!this.running) return;
      this.spawnT -= dt;
      if (this.spawnT <= 0) { this.spawn(false); this.spawnT = rand(0.45, 0.85); }
      const active = this.list.filter((b) => b.msg).length;
      this.msgT -= dt;
      if (this.msgT <= 0 && this.got + active < C.balonlar.length && active < 2) { this.spawn(true); this.msgT = rand(1.6, 2.6); }
      for (let i = this.list.length - 1; i >= 0; i--) {
        const b = this.list[i];
        b.y -= b.sp * dt;
        b.dx = Math.sin(T * 1.4 + b.phase) * 4;
        if (b.y < -30) this.list.splice(i, 1);
      }
    },
    draw(c, dt) {
      drawSky(c, dt);
      c.drawImage(sideCv, 0, 0);
      drawActor(c, this.ela, groundY + 1);
      drawCat(c, this.pati, dt);
      for (const b of this.list) {
        const x = Math.round(b.x + (b.dx || 0) - 7), y = Math.round(b.y);
        c.fillStyle = 'rgba(255,241,214,0.55)';
        for (let j = 0; j < 12; j++) c.fillRect(Math.round(x + 7 + Math.sin(T * 3 + b.phase + j * 0.5) * 1), y + 18 + j, 1, 1);
        c.drawImage(b.spr, x, y);
        if (b.msg) {
          c.drawImage(Px.ENVELOPE, x + 4, y + 6);
          if (Math.floor(T * 4 + b.phase) % 2) {
            c.fillStyle = '#fff7d0';
            c.fillRect(x - 2, y + 2, 1, 1); c.fillRect(x + 15, y + 9, 1, 1);
          } else {
            c.fillStyle = '#ffd34e';
            c.fillRect(x + 14, y, 1, 1); c.fillRect(x - 1, y + 12, 1, 1);
          }
        }
      }
    },
    tap(x, y) {
      if (catHit(this.pati, x, y)) { petCat(this.pati); return true; }
      if (!this.running) return false;
      for (let i = this.list.length - 1; i >= 0; i--) {
        const b = this.list[i];
        const bx = b.x + (b.dx || 0);
        if (Math.abs(x - bx) < 10 && y > b.y - 3 && y < b.y + 20) {
          this.list.splice(i, 1);
          this.pop(b, bx);
          return true;
        }
      }
      return false;
    },
    pop(b, bx) {
      Sound.sfx.pop();
      this.pops++;
      burst('world', bx, b.y + 8, 16, { colors: [b.color, '#fff8ec'], min: 25, max: 60, g: 120 });
      if (b.isCat) { setTimeout(() => Sound.sfx.meow(), 80); addPart('world', { x: bx, y: b.y + 4, vx: 0, vy: -20, g: 0, life: 1.2, sprite: Px.HEART }); }
      if (b.msg) {
        this.got++;
        setTimeout(() => Sound.sfx.sparkle(), 60);
        hop(this.ela, 60);
        this.showMsg(C.balonlar[this.got - 1]);
      }
      this.updateCount();
    },
    showMsg(text) {
      const el = $('#bal-msg');
      el.hidden = false;
      $('#bal-msg-no').textContent = `MESAJ ${this.got}/${C.balonlar.length}`;
      $('#bal-msg-text').textContent = text;
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      const done = this.got >= C.balonlar.length;
      const btn = $('#bal-done');
      btn.hidden = !done;
      if (done) {
        this.running = false;
        btn.onclick = async () => {
          btn.onclick = null;
          Sound.sfx.select();
          el.hidden = true;
          for (const bb of this.list) burst('world', bb.x, bb.y + 8, 8, { colors: [bb.color] });
          this.list = [];
          await Dialog.say([{ who: 'pati', text: 'Tüm mesajları topladın! Biri bunları yazarken baya düşünmüş, belli.' }]);
          completeLevel(1);
        };
      }
    },
  };

  scenes.cake = {
    enter() {
      showHud(true);
      this.state = 'idle';
      this.ela = makeActor('ela', 0);
      this.gok = makeActor('gokhan', 0);
      this.pati = makeCat('turuncu', 0, 0);
      this.cat2 = makeCat('beyaz', 0, 0, true);
      this.cakeOn = false;
      this.dark = 0;
      this.wind = 0;
      this.blowAcc = 0;
      this.trickDone = false;
      this.resize();
      this.gok.x = W + 12;
      $('#cake-ui').hidden = true;
      $('#wish').hidden = true;
    },
    exit() { this.stopMic(); },
    resize() {
      if (!this.ela) return;
      this.tx = Math.round(W / 2);
      this.tw = Math.min(64, Math.round(W * 0.48));
      this.ela.x = this.tx - this.tw / 2 - 9;
      this.gokTarget = this.tx + this.tw / 2 + 11;
      if (this.state !== 'arrive' && this.gok.x <= W) this.gok.x = this.gokTarget;
      this.pati.x = Math.max(7, this.ela.x - 16); this.pati.y = groundY + 1;
      this.cat2.x = Math.min(W - 7, this.gokTarget + 18); this.cat2.y = groundY + 1;
      this.buildCandles();
    },
    tableTop() { return groundY - 14; },
    buildCandles() {
      const cx = this.tx, top = this.tableTop() - 26;
      const old = this.candles;
      this.candles = [
        { x: cx - 4, y: top - 9, num: true },
        { x: cx + 4, y: top - 9, num: true },
        { x: cx - 14, y: top - 8 }, { x: cx - 10, y: top - 7 },
        { x: cx + 9, y: top - 7 }, { x: cx + 13, y: top - 8 },
        { x: cx - 23, y: top + 3 }, { x: cx + 22, y: top + 3 },
      ].map((k, i) => ({ ...k, lit: old ? old[i].lit : true, trick: i === 5, flick: rand(0, 6) }));
    },
    async start() {
      await Dialog.say([{ who: 'pati', text: 'Son bölüm! Pasta tam burada olmalıydı ama... bir dakika, biri geliyor! 👀' }]);
      this.state = 'arrive';
      this.gok.walking = true;
      this.gok.flip = true;
    },
    async arrived() {
      this.state = 'talk';
      this.gok.walking = false;
      this.gok.flip = false;
      Sound.sfx.sparkle();
      this.cakeOn = true;
      burst('world', this.tx, this.tableTop() - 14, 24, { colors: ['#fff1d6', '#ffd34e'], max: 40 });
      await sleep(500);
      await Dialog.say([
        { who: 'gokhan', text: `İyi ki doğdun ${C.lakap}! bu kez pastayi ben yaptim.` },
        { who: 'gokhan', text: `${C.yas} tane mumu pastaya sığdıramadım, o yüzden rakamla yazdım.` },
        { who: 'gokhan', text: 'Şimdi bir dilek tut ve mumları üfle! Mikrofonuna üfleyebilir ya da mumlara dokunabilirsin.' },
      ]);
      this.state = 'blow';
      $('#cake-ui').hidden = false;
      $('#btn-mic').hidden = !navigator.mediaDevices?.getUserMedia;
      $('#wind').hidden = true;
      this.updateCount();
    },
    updateCount() {
      const lit = this.candles.filter((k) => k.lit).length;
      $('#cake-count').textContent = `YANAN MUM: ${lit}/${this.candles.length}`;
    },
    async startMic() {
      Sound.init();
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      } catch {
        toast('Mikrofona izin verilmedi. Mumlara dokunarak da söndürebilirsin! 👆', 3200);
        return;
      }
      const actx = Sound.ctx;
      const src = actx.createMediaStreamSource(this.stream);
      this.analyser = actx.createAnalyser();
      this.analyser.fftSize = 1024;
      const mute = actx.createGain();
      mute.gain.value = 0;
      src.connect(this.analyser).connect(mute).connect(actx.destination);
      this.buf = new Float32Array(this.analyser.fftSize);
      this.noiseFloor = 0.02; this.calib = 0.6;
      $('#btn-mic').hidden = true;
      $('#wind').hidden = false;
      toast('Mikrofon açık! Şimdi üfle! 🌬️');
    },
    stopMic() {
      this.stream?.getTracks().forEach((t) => t.stop());
      this.stream = null; this.analyser = null;
    },
    micLevel(dt) {
      if (!this.analyser) return 0;
      this.analyser.getFloatTimeDomainData(this.buf);
      let sum = 0;
      for (let i = 0; i < this.buf.length; i++) sum += this.buf[i] * this.buf[i];
      const rms = Math.sqrt(sum / this.buf.length);
      if (this.calib > 0) { this.calib -= dt; this.noiseFloor = Math.max(this.noiseFloor, rms); return 0; }
      const thr = clamp(this.noiseFloor * 3, 0.07, 0.22);
      return rms / thr;
    },
    blowOut(k) {
      if (!k.lit) return;
      k.lit = false;
      for (let i = 0; i < 5; i++) {
        addPart('world', { x: k.x + rand(-1, 1), y: k.y - 2, vx: rand(-3, 3), vy: rand(-14, -8), g: -2, drag: 0.6, life: rand(0.8, 1.4), color: '#a9a2b8', alpha: 0.6 });
      }
      this.updateCount();
      if (k.trick && !this.trickDone) {
        this.trickDone = true;
        setTimeout(() => {
          if (this.state !== 'blow') return;
          k.lit = true;
          Sound.sfx.magic();
          burst('world', k.x, k.y - 3, 12, { colors: ['#ffd34e', '#fff7d0'], max: 30 });
          toast('Hileli mum! 😼 Bir daha üfle!');
          this.updateCount();
        }, 900);
      }
      if (this.candles.every((c) => !c.lit) && (this.trickDone || !this.candles.some((c) => c.trick))) {
        clearTimeout(this.doneT);
        this.doneT = setTimeout(() => {
          if (this.candles.every((c) => !c.lit) && this.state === 'blow') this.wish();
        }, 1200);
      }
    },
    async wish() {
      this.state = 'wish';
      this.stopMic();
      $('#cake-ui').hidden = true;
      const w = $('#wish');
      w.hidden = false;
      w.classList.remove('saved');
      $('#wish-text').textContent = 'Gözlerini kapat ve bir dilek tut...';
      const stars = w.querySelectorAll('.wish-stars i');
      stars.forEach((s) => s.classList.remove('on'));
      for (let i = 0; i < stars.length; i++) {
        await sleep(1000);
        stars[i].classList.add('on');
        Sound.sfx.blip();
      }
      await sleep(600);
      w.classList.add('saved');
      $('#wish-text').textContent = 'DİLEK KAYDEDİLDİ ✓';
      Sound.sfx.save();
      await sleep(1400);
      w.hidden = true;
      this.party();
    },
    async party() {
      this.state = 'party';
      Sound.stop();
      Sound.play('dogumGunu', () => Sound.play('koy'));
      confetti(90);
      for (let i = 0; i < 3; i++) setTimeout(() => launchFirework(), i * 450);
      this.partyT = 0;
      await sleep(2600);
      await Dialog.say([
        { who: 'gokhan', text: 'Dileğin umarim gerceklesir elos! ✨' },
        { who: 'pati', text: 'Miyav! (Çeviri: İyi ki doğdunnn!) 🐾' },
        { who: 'gokhan', text: 'Bir hediye daha var: son anı kartı ve sana küçük bir mektup. 💌' },
      ]);
      completeLevel(2);
    },
    update(dt) {
      updateActor(this.ela, dt);
      updateActor(this.gok, dt);
      if (this.state === 'arrive') {
        this.gok.x -= dt * 28;
        if (Math.floor(this.gok.x / 6) !== Math.floor((this.gok.x + dt * 28) / 6)) Sound.sfx.step();
        if (this.gok.x <= this.gokTarget) { this.gok.x = this.gokTarget; this.arrived(); }
      }
      if (this.state === 'blow') {
        const lvl = this.micLevel(dt);
        this.wind += (Math.min(lvl, 3) - this.wind) * Math.min(1, dt * 10);
        $('#wind-bar').style.width = `${clamp(this.wind / 1.5, 0, 1) * 100}%`;
        if (lvl > 1) {
          this.blowAcc += dt * lvl;
          while (this.blowAcc > 0.16) {
            this.blowAcc -= 0.16;
            const lit = this.candles.filter((k) => k.lit);
            if (lit.length) this.blowOut(pick(lit));
          }
        } else this.blowAcc = Math.max(0, this.blowAcc - dt);
      } else this.wind *= 0.9;
      if (this.state === 'party') {
        this.partyT += dt;
        if (Math.random() < dt * 1.2) launchFirework();
        if (Math.random() < dt * 2) hop(this.ela, 70);
        if (Math.random() < dt * 2) hop(this.gok, 70);
        if (Math.random() < dt * 1.5) { this.pati.vy = 60; this.pati.jump = 0.01; }
        if (Math.random() < dt * 1.5) { this.cat2.vy = 60; this.cat2.jump = 0.01; }
      }
      this.dark += ((this.state === 'wish' ? 0.55 : 0) - this.dark) * Math.min(1, dt * 3);
    },
    draw(c, dt) {
      drawSky(c, dt);
      updateRockets(c, dt);
      c.drawImage(sideCv, 0, 0);
      drawFlies(c, groundY * 0.5, groundY);
      drawCat(c, this.pati, dt);
      drawCat(c, this.cat2, dt);
      drawActor(c, this.ela, groundY + 1);
      this.drawTable(c);
      if (this.cakeOn) this.drawCake(c, dt);
      drawActor(c, this.gok, groundY + 1);
      if (this.state === 'arrive' || (!this.cakeOn && this.gok.x <= W + 10)) this.drawMiniCake(c);
      if (this.dark > 0.01) {
        c.fillStyle = `rgba(5,4,10,${this.dark})`;
        c.fillRect(0, 0, W, H);
      }
    },
    drawMiniCake(c) {
      const hands = groundY + 1 - Px.gokhan.idle.height + Px.gokhan.hand;
      const x = Math.round(this.gok.x - 7), y = Math.round(hands - 6 - this.gok.jump);
      c.fillStyle = '#e8dcc8'; c.fillRect(x - 1, y + 6, 14, 1);
      c.fillStyle = '#6b3e26'; c.fillRect(x, y + 2, 12, 4);
      c.fillStyle = '#fff1d6'; c.fillRect(x, y + 1, 12, 2);
      c.fillStyle = '#e04848'; c.fillRect(x + 3, y, 2, 1); c.fillRect(x + 7, y, 2, 1);
    },
    drawTable(c) {
      const top = this.tableTop(), x0 = this.tx - this.tw / 2;
      c.fillStyle = '#5a3a26';
      c.fillRect(x0 + 3, top + 4, 3, 10); c.fillRect(x0 + this.tw - 6, top + 4, 3, 10);
      c.fillStyle = '#8a5a3a'; c.fillRect(x0, top, this.tw, 3);
      for (let yy = 0; yy < 6; yy++) {
        for (let xx = 0; xx < this.tw; xx++) {
          const red = (Math.floor(xx / 3) + Math.floor(yy / 3)) % 2 === 0;
          c.fillStyle = red ? '#e04848' : '#fff1d6';
          c.fillRect(x0 + xx, top + yy, 1, 1);
        }
      }
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x0, top + 5, this.tw, 1);
    },
    drawCake(c, dt) {
      const cx = this.tx, by = this.tableTop();
      c.fillStyle = '#d8ccb5'; c.fillRect(cx - 30, by - 1, 60, 1);
      c.fillStyle = '#f3ead8'; c.fillRect(cx - 28, by - 2, 56, 1);
      c.fillStyle = '#6b3e26'; c.fillRect(cx - 26, by - 15, 52, 13);
      c.fillStyle = '#4f2c1a'; c.fillRect(cx + 20, by - 15, 6, 13); c.fillRect(cx - 26, by - 4, 52, 2);
      c.fillStyle = '#fff1d6'; c.fillRect(cx - 26, by - 16, 52, 3);
      for (let i = 0; i < 52; i += 3) {
        const h = 1 + ((i * 7) % 4);
        c.fillRect(cx - 26 + i, by - 13, 2, h);
      }
      for (let i = -22; i <= 22; i += 6) {
        c.fillStyle = '#5fb85a'; c.fillRect(cx + i, by - 7, 2, 1);
        c.fillStyle = '#e04848'; c.fillRect(cx + i + 2, by - 8, 1, 1);
      }
      c.fillStyle = '#d64545'; c.fillRect(cx - 18, by - 26, 36, 11);
      c.fillStyle = '#a12c34'; c.fillRect(cx + 13, by - 26, 5, 11);
      c.fillStyle = '#fff1d6'; c.fillRect(cx - 18, by - 27, 36, 3);
      for (let i = 0; i < 36; i += 3) {
        const h = 1 + ((i * 5) % 3);
        c.fillRect(cx - 18 + i, by - 24, 2, h);
      }
      for (const sx of [-17, 15]) {
        c.fillStyle = '#e04848'; c.fillRect(cx + sx, by - 29, 3, 2); c.fillRect(cx + sx + 1, by - 27, 1, 1);
        c.fillStyle = '#5fb85a'; c.fillRect(cx + sx + 1, by - 30, 1, 1);
      }
      for (const k of this.candles) {
        if (k.num) {
          c.drawImage(Px.CANDLE_NUM, k.x - 3, k.y + 1);
          c.fillStyle = '#2a1a10'; c.fillRect(k.x, k.y - 1, 1, 2);
        } else {
          const top = k.y, base = k.x < this.tx - 20 || k.x > this.tx + 20 ? by - 16 : by - 27;
          for (let yy = top + 1; yy < base; yy++) {
            c.fillStyle = (yy - top) % 3 === 0 ? '#fff1d6' : k.x < this.tx ? '#5fb85a' : '#e04848';
            c.fillRect(k.x, yy, 2, 1);
          }
          c.fillStyle = '#2a1a10'; c.fillRect(k.x, top - 1, 1, 2);
        }
        if (k.lit) this.drawFlame(c, k);
      }
    },
    drawFlame(c, k) {
      const fl = Math.floor(T * 12 + k.flick) % 3;
      const lean = clamp(Math.round(this.wind * 1.4), 0, 3);
      const h = this.wind > 1.2 ? 3 : fl === 0 ? 5 : 4;
      const x = k.x, y = k.y - 2;
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = 'rgba(255,150,60,0.07)'; disc(c, x, y - 2, 6 + (fl === 1 ? 1 : 0));
      c.fillStyle = 'rgba(255,170,80,0.08)'; disc(c, x, y - 2, 3);
      c.globalCompositeOperation = 'source-over';
      const rows = [['#ff8a2a', '#ffc93a', '#ff8a2a'], ['#ffc93a', '#fff7d0', '#ffc93a'], ['#ff8a2a', '#ffc93a', '#ff8a2a'], [null, '#ffc93a', null], [null, '#ff8a2a', null]];
      for (let i = 0; i < h; i++) {
        const off = Math.round((lean * i) / h) + (i === h - 1 && fl === 2 ? 1 : 0);
        rows[i].forEach((col, j) => {
          if (!col) return;
          c.fillStyle = col;
          c.fillRect(x - 1 + j + off, y - i, 1, 1);
        });
      }
    },
    tap(x, y) {
      if (catHit(this.pati, x, y)) { petCat(this.pati); return true; }
      if (catHit(this.cat2, x, y)) { petCat(this.cat2); return true; }
      if (this.state !== 'blow') return false;
      Sound.sfx.whoosh();
      for (let i = 0; i < 6; i++) addPart('world', { x, y, vx: rand(-25, 25), vy: rand(-25, 10), g: 0, drag: 0.1, life: 0.5, color: '#fff1d6', alpha: 0.5 });
      let hit = false;
      for (const k of this.candles) {
        if (k.lit && Math.hypot(k.x - x, k.y - 3 - y) < 8) { this.blowOut(k); hit = true; }
      }
      return hit || true;
    },
  };
  $('#btn-mic').onclick = (e) => { e.stopPropagation(); scenes.cake.startMic(); };

  scenes.final = {
    enter() {
      showHud(true);
      updateHud();
      Sound.init();
      if (!Sound.playing) Sound.play('koy');
      const cake = scenes.cake;
      cake.enter();
      cake.state = 'final';
      cake.cakeOn = true;
      cake.candles.forEach((k) => { k.lit = false; });
      cake.gok.x = cake.gokTarget;
      this.fwT = 0.5;
      const t = $('#final .hbd');
      t.querySelector('.l2').textContent = `${C.lakap.toLocaleUpperCase('tr')}!`;
      t.classList.remove('in'); void t.offsetWidth; t.classList.add('in');
      confetti(60);
    },
    resize() { scenes.cake.resize(); },
    update(dt) {
      const cake = scenes.cake;
      updateActor(cake.ela, dt);
      updateActor(cake.gok, dt);
      this.fwT -= dt;
      if (this.fwT <= 0) { launchFirework(); this.fwT = rand(1.1, 2.4); }
      if (Math.random() < dt * 0.6) hop(cake.ela, 60);
      if (Math.random() < dt * 0.5) hop(cake.gok, 60);
    },
    draw(c, dt) { scenes.cake.draw(c, dt); },
    tap(x, y) {
      const cake = scenes.cake;
      for (const k of [cake.pati, cake.cat2]) if (catHit(k, x, y)) { petCat(k); return true; }
      if (y < groundY - 10) { launchFirework(x, clamp(y, 8, groundY - 20)); return true; }
      return false;
    },
  };
  $('#btn-letter').onclick = () => openLetter();
  $('#btn-album').onclick = () => openAlbum();
  $('#btn-restart').onclick = async () => {
    Sound.sfx.select();
    await fadeOut();
    Sound.stop();
    setScene('title');
    await fadeIn();
  };
  $('#btn-song').onclick = () => {
    Sound.init();
    Sound.stop();
    Sound.play('dogumGunu', () => Sound.play('koy'));
    for (let i = 0; i < 4; i++) setTimeout(() => launchFirework(), i * 300);
  };

  cv.addEventListener('pointerdown', (e) => {
    if (!scene?.tap) return;
    scene.tap(e.clientX / S, e.clientY / S);
  });
  $('#btn-sound').onclick = () => {
    Sound.init();
    save.muted = !save.muted;
    Sound.setMuted(save.muted);
    persist();
    updateHud();
    if (!save.muted) Sound.sfx.blip();
  };
  $('#btn-cards').onclick = () => openCards();
  document.querySelectorAll('[data-close]').forEach((b) => { b.onclick = () => { Sound.sfx.blip(); $(b.dataset.close).hidden = true; }; });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (!Dialog.el.hidden) { e.preventDefault(); Dialog.advance(); }
    } else if (e.key === 'Escape') {
      for (const id of ['#lightbox', '#cards', '#album']) if (!$(id).hidden) { $(id).hidden = true; return; }
      if (!$('#letter').hidden) { letterTyping = false; $('#letter').hidden = true; }
    } else if (!$('#lightbox').hidden && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      lbMove(e.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  window.addEventListener('resize', () => { clearTimeout(resize.t); resize.t = setTimeout(resize, 120); });

  let last = performance.now();
  const DT_MAX = /[?&]test\b/.test(location.search) ? 1 : 0.05;
  const nextFrame = DT_MAX === 1 ? (fn) => setTimeout(() => fn(performance.now()), 33) : requestAnimationFrame.bind(window);
  function frame(now) {
    const dt = Math.min(DT_MAX, (now - last) / 1000);
    last = now;
    T += dt;
    if (window.innerWidth && (Math.ceil(window.innerWidth / S) !== W || Math.ceil(window.innerHeight / S) !== H)) resize();
    scene.update?.(dt);
    ctx.clearRect(0, 0, W, H);
    scene.draw(ctx, dt);
    updateParts('world', ctx, dt);
    fctx.clearRect(0, 0, W, H);
    updateParts('top', fctx, dt);
    nextFrame(frame);
  }

  if (['localhost', '127.0.0.1', ''].includes(location.hostname)) {
    const n = (JSON.stringify(C).match(/✏️/g) || []).length;
    if (n) {
      const bar = $('#devbar');
      bar.hidden = false;
      bar.textContent = `✏️ config.js içinde doldurulmamış ${n} alan var (bu uyarı yalnızca bilgisayarında görünür)`;
    }
  }

  if (DT_MAX === 1) window.__oyun = { scenes, save, setScene, get scene() { return scene; } };
  resize();
  setScene('title');
  nextFrame(frame);
  setTimeout(() => C.anilar.forEach((a) => loadImg(a.foto)), 1500);
})();
