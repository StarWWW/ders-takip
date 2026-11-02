'use strict';

const Px = (() => {
  function makeSprite(rows, pal) {
    const h = rows.length, w = rows[0].length;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const col = pal[rows[j][i]];
        if (!col) continue;
        x.fillStyle = col;
        x.fillRect(i, j, 1, 1);
      }
    }
    return c;
  }
  const withRows = (base, repl) => base.map((r, i) => (i in repl ? repl[i] : r));

  const ELA_PAL = {
    h: '#5a3a2a', H: '#3b261d', l: '#7a5038', y: '#b0814f',
    s: '#f3caa6', S: '#dba481', c: '#ef9e93', B: '#2b1a14', e: '#3a3125', i: '#fff3e0',
    M: '#b8323c', m: '#7a4a36', E: '#ffd34e', n: '#e6edf3', g: '#a3826c',
    r: '#c63c3a', R: '#8f2a2c', j: '#86a3cc', J: '#6482ad', k: '#2a2430',
    p: '#5fb85a', P: '#2f7a3a', w: '#fff1d6',
  };
  const ELA = [
    '........ww........',
    '........pP........',
    '.......ppPP.......',
    '.......rrrr.......',
    '......pppPPP......',
    '.....hhhhhhhh.....',
    '...hhllhhhhhhhh...',
    '..hlhhhhhhhhhhhh..',
    '.hhhhhhhhhhhhhhhh.',
    '.hhhhhhhhhhhhhhhh.',
    '.hhhhsBBssBBshhhh.',
    '.hhyhsiessieshyhh.',
    '.hhyhseesseeshyhh.',
    '.hhyhcmssssmchyhh.',
    '.hhyEsssMMsssEyhh.',
    '.hyhhhsssssshhhyh.',
    '.hhyhhhSssShhhyhh.',
    '.yyyhRrnssnrRhyyy.',
    '..y.RrrrnnrrrR.y..',
    '....RrrrrrrrrR....',
    '....RrrrrrrrrR....',
    '....RrrrrrrrrR....',
    '....sjjjjjjjjs....',
    '.....jjjjjjjj.....',
    '.....jjjJJjjj.....',
    '.....jjj..jjj.....',
    '.....jjj..jjj.....',
    '....kkkk..kkkk....',
  ];
  const ELA_BLINK = withRows(ELA, {
    11: '.hhyhsssssssshyhh.',
    12: '.hhyhseesseeshyhh.',
  });
  const ELA_WALK = withRows(ELA, {
    25: '....jjj....jjj....',
    26: '....jjj....jjj....',
    27: '...kkkk....kkkk...',
  });
  const ELA_CHEER = withRows(ELA, {
    13: 'shhyhcmssssmchyhhs',
    14: 'RhhyEsssMMsssEyhhR',
    15: '.RyhhhsssssshhhyR.',
    16: '.hRyhhhSssShhhyRh.',
    17: '.yyRhRrnssnrRhRyy.',
    19: '.....rrrrrrrr.....',
    20: '.....rrrrrrrr.....',
    21: '.....rrrrrrrr.....',
    22: '.....jjjjjjjj.....',
  });
  const GLASSES = [[11, 5], [11, 8], [11, 9], [11, 12], [12, 5], [12, 8], [12, 9], [12, 12]];
  const glasses = (rows) => (window.ELA && window.ELA.gozluk
    ? rows.map((r, j) => [...r].map((ch, i) => (GLASSES.some(([y, x]) => y === j && x === i) ? 'g' : ch)).join(''))
    : rows);

  const GOK_PAL = {
    h: '#5b3b29', H: '#38241a', y: '#86603f',
    s: '#f0c6a0', S: '#d9a37f', b: '#cc9f86', e: '#231a1e', B: '#38241a', M: '#a8504c',
    g: '#4a9a52', G: '#2f6e3a', w: '#fff1d6', j: '#3d4f78', J: '#2b3858', W: '#f0ece4', O: '#b9b2a6',
  };
  const GOK = [
    '.......hh..hh.h.....',
    '....hh.hhyyhhhhyh...',
    '...hhyyhhHhhyyhhHh..',
    '..hyhhHhyyhhHhhyyhh.',
    '.hhHhyyhhHhyyhhHhhh.',
    'hhyyhhHhyyhhHhyyhhHh',
    '.hHhhyyhHhhhyyhHhyh.',
    '.hhyhsHhhssHhsHhyhh.',
    '..hhssBBssssBBsshhh.',
    '..hSsssessssesssSh..',
    '..hSsssessssesssSh..',
    '...sssssssSsssssss..',
    '....sssssMMsssss....',
    '.....ssssssssss.....',
    '.......SssssS.......',
    '..gggggGGGGGGggggg..',
    '.gGgggggwggwgggggGg.',
    '.gGgggggwggwgggggGg.',
    '.gGggggggggggggggGg.',
    '.gGgggGGGGGGGGgggGg.',
    '.ssgggGggggggGgggss.',
    '...GGGGGGGGGGGGGG...',
    '....jjjjjjjjjjjj....',
    '....jjjjjJJjjjjj....',
    '....jjjjj..jjjjj....',
    '....jjjjj..jjjjj....',
    '....jjjjj..jjjjj....',
    '...WWWWWW..WWWWWW...',
    '...OOOOOO..OOOOOO...',
  ];
  const GOK_BLINK = withRows(GOK, {
    9: '..hSssssssssssssSh..',
  });
  const GOK_WALK = withRows(GOK, {
    24: '...jjjjj....jjjjj...',
    25: '...jjjjj....jjjjj...',
    26: '...jjjjj....jjjjj...',
    27: '..WWWWWW....WWWWWW..',
    28: '..OOOOOO....OOOOOO..',
  });
  const GOK_CHEER = withRows(GOK, {
    12: 'ss..ssbbbMMbbbss..ss',
    13: 'gg...sbbbbbbbbs...gg',
    14: '.gG....SssssS....Gg.',
    16: '...gggggwggwggggg...',
    17: '...gggggwggwggggg...',
    18: '...gggggggggggggg...',
    19: '...gggGGGGGGGGggg...',
    20: '...gggGggggggGggg...',
  });

  const CAT = [
    '.f....f.....',
    '.fn..nf.....',
    '.ffffff.....',
    '.feffef.....',
    '.fwnnwf.....',
    '..ffff......',
    '.ffffff.....',
    '.fFffFf...f.',
    '.ffffff..f..',
    '.ffffffff...',
    '.fwffwf.....',
  ];
  const CAT_TAIL = withRows(CAT, {
    5: '..ffff....f.',
    6: '.ffffff...f.',
    7: '.fFffFf...f.',
    8: '.ffffff..ff.',
  });
  const CAT_BLINK = withRows(CAT, { 3: '.fFffFf.....' });
  const CAT_PALS = {
    turuncu: { f: '#e8913a', F: '#b8661f', w: '#fff1d6', n: '#f29ab0', e: '#2b1d1d' },
    gri: { f: '#a19fb0', F: '#6f6d7d', w: '#f4efe6', n: '#f29ab0', e: '#2b1d1d' },
    siyah: { f: '#3a3440', F: '#57505f', w: '#fff1d6', n: '#f29ab0', e: '#b6e35a' },
    beyaz: { f: '#f4efe6', F: '#cfc6b8', w: '#ffffff', n: '#f29ab0', e: '#4a8fd6' },
  };
  const cats = {};
  for (const [name, pal] of Object.entries(CAT_PALS)) {
    cats[name] = { sit: makeSprite(CAT, pal), tail: makeSprite(CAT_TAIL, pal), blink: makeSprite(CAT_BLINK, pal) };
  }

  const FLOWER_PAL = { w: '#fff6ea', p: '#f29ab0', a: '#ff9a3a', g: '#5fb85a', G: '#2f7a3a', r: '#e04848' };
  const LILY = makeSprite([
    '.w.w.',
    'wwpww',
    '.wap.',
    'wwpww',
    '.w.w.',
    '..g..',
    'G.g..',
    '.Gg.G',
    '..gG.',
  ], FLOWER_PAL);
  const ROSE = makeSprite([
    '.r.',
    'rpr',
    '.r.',
    '.g.',
    'Gg.',
    '.g.',
  ], { ...FLOWER_PAL, p: '#ff8a8a' });

  const HEART = makeSprite([
    '.hh.hh.',
    'hwhhhhh',
    'hhhhhhh',
    '.hhhhH.',
    '..hhH..',
    '...H...',
  ], { h: '#e04848', H: '#a12c34', w: '#ffd0d0' });

  const STAR = makeSprite([
    '...g...',
    '...g...',
    '.ggggg.',
    '..gGg..',
    '.gg.gg.',
  ], { g: '#ffd34e', G: '#fff7d0' });

  const ARROW = makeSprite([
    'kkkkkkk',
    'kgggggk',
    '.kgggk.',
    '..kgk..',
    '...k...',
  ], { g: '#ffd34e', k: '#2a1a10' });

  const LOCK = makeSprite([
    '..ddd..',
    '.d...d.',
    '.d...d.',
    'ggggggg',
    'gggkggg',
    'gggkggg',
    'GGGGGGG',
  ], { d: '#cdbf9c', g: '#ffd34e', G: '#c99a1e', k: '#2a1a10' });

  const ENVELOPE = makeSprite([
    'wwwwwww',
    'wHwwwHw',
    'wwHwHww',
    'wwwHwww',
    'wwwwwww',
  ], { w: '#fff6ea', H: '#e04848' });

  const DIGIT2 = [
    '.gggg.',
    'gGwwGg',
    'gg..gg',
    '....gg',
    '...gg.',
    '..gg..',
    '.gg...',
    'gggggg',
    'GGGGGG',
  ];
  const CANDLE_NUM = makeSprite(DIGIT2, { g: '#ffd34e', G: '#c99a1e', w: '#fff7d0' });

  const BALLOON = [
    '.....bbbb.....',
    '...bbbbbbbb...',
    '..bbwwbbbbbb..',
    '.bbwwbbbbbbbB.',
    '.bwwbbbbbbbbB.',
    'bbwbbbbbbbbbBB',
    'bbbbbbbbbbbbBB',
    'bbbbbbbbbbbbBB',
    'bbbbbbbbbbbBBB',
    '.bbbbbbbbbbBB.',
    '.bbbbbbbbbBBB.',
    '..bbbbbbbBBB..',
    '...bbbbbBBB...',
    '....bbbBBB....',
    '.....bBBB.....',
    '......bB......',
    '.....BBBB.....',
    '......BB......',
  ];
  const CAT_BALLOON = withRows(BALLOON, {
    0: '..B..bbbb..B..',
    1: '..bBbbbbbbbB..',
    6: 'bbbkbbbbkbbbBB',
    8: 'bbbbbbnnbbbBBB',
    9: '.bbbbbkkbbbBB.',
  });
  const balloonCache = new Map();
  function balloon(main, shade, isCat) {
    const key = main + shade + (isCat ? 'c' : '');
    if (!balloonCache.has(key)) {
      balloonCache.set(key, makeSprite(isCat ? CAT_BALLOON : BALLOON, { b: main, B: shade, w: '#fff8ec', k: '#2a1a10', n: '#f29ab0' }));
    }
    return balloonCache.get(key);
  }

  return {
    makeSprite,
    ela: {
      idle: makeSprite(glasses(ELA), ELA_PAL),
      blink: makeSprite(glasses(ELA_BLINK), ELA_PAL),
      walk: makeSprite(glasses(ELA_WALK), ELA_PAL),
      cheer: makeSprite(glasses(ELA_CHEER), ELA_PAL),
    },
    gokhan: {
      idle: makeSprite(GOK, GOK_PAL),
      blink: makeSprite(GOK_BLINK, GOK_PAL),
      walk: makeSprite(GOK_WALK, GOK_PAL),
      cheer: makeSprite(GOK_CHEER, GOK_PAL),
      hand: 20,
    },
    cats, LILY, ROSE, HEART, STAR, ARROW, LOCK, ENVELOPE, CANDLE_NUM, balloon,
  };
})();
