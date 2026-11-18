'use strict';
(function () {
  const TAU = Math.PI * 2;
  const glows = {};
  const BODY = '"Gowun Dodum", sans-serif', DISP = '"Song Myung", serif';

  function seal(ctx, x, y, size, glyph, color) {
    ctx.fillStyle = color; ctx.fillRect(x - size / 2, y - size / 2, size, size);
    ctx.fillStyle = '#0d1020'; ctx.font = Math.round(size * .68) + 'px ' + DISP;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(glyph, x, y + size * .04);
  }

  function pickup(ctx, k, x, y) {
    if (k === 'chest') {
      ctx.fillStyle = '#e3ba52'; ctx.fillRect(x - 9, y - 6, 18, 13);
      ctx.fillStyle = '#8a6a1c'; ctx.fillRect(x - 9, y - 2, 18, 2); ctx.fillRect(x - 2, y - 3, 4, 5);
    } else if (k === 'heal') {
      ctx.fillStyle = '#e2607a';
      ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.bezierCurveTo(x - 14, y - 2, x - 6, y - 11, x, y - 4); ctx.bezierCurveTo(x + 6, y - 11, x + 14, y - 2, x, y + 8); ctx.fill();
    } else {
      ctx.strokeStyle = '#6cb6e6'; ctx.lineWidth = 5; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.arc(x, y - 1, 6, Math.PI, 0); ctx.moveTo(x - 6, y - 1); ctx.lineTo(x - 6, y + 7); ctx.moveTo(x + 6, y - 1); ctx.lineTo(x + 6, y + 7); ctx.stroke();
      ctx.fillStyle = '#ece3cf'; ctx.fillRect(x - 8.5, y + 4, 5, 3); ctx.fillRect(x + 3.5, y + 4, 5, 3);
    }
  }

  function glow(ctx, color, x, y, r, a) {
    let g = glows[color];
    if (!g) {
      g = glows[color] = document.createElement('canvas');
      g.width = g.height = 64;
      const c = g.getContext('2d'), gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
    }
    ctx.globalAlpha = a;
    ctx.drawImage(g, x - r, y - r, r * 2, r * 2);
  }

  function hash(x, y) {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  }

  // ── 종이 오리기 스프라이트 ──
  const SPR = {};
  function tinted(img, color) {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    return c;
  }
  function spr(name) {
    let s = SPR[name];
    if (!s) {
      s = SPR[name] = { ok: false, tints: {} };
      const img = new Image();
      img.onload = () => { s.img = img; s.ok = true; };
      img.src = 'assets/' + name + '.png';
    }
    return s.ok ? s : null;
  }
  const tintOf = (s, color) => s.tints[color] || (s.tints[color] = tinted(s.img, color));

  // 그림자를 종이 한 겹 아래에 어긋나게 깔아 오려 붙인 느낌을 낸다.
  function paper(ctx, s, x, y, size, rot, flip, opt) {
    const h = size / 2;
    ctx.save(); ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    if (flip) ctx.scale(-1, 1);
    ctx.globalAlpha = .45; ctx.drawImage(tintOf(s, '#04050c'), -h + (flip ? -2 : 2), -h + 3, size, size);
    ctx.globalAlpha = 1;
    if (opt && opt.rim) { const k = size * 1.16; ctx.drawImage(tintOf(s, opt.rim), -k / 2, -k / 2, k, k); }
    ctx.drawImage(opt && opt.flash ? tintOf(s, '#ffffff') : s.img, -h, -h, size, size);
    if (opt && opt.ice) { ctx.globalAlpha = .45; ctx.drawImage(tintOf(s, '#9fd8ff'), -h, -h, size, size); ctx.globalAlpha = 1; }
    ctx.restore();
  }

  let grain = null;
  function grainPattern(ctx) {
    if (grain) return grain;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    for (let i = 0; i < 1400; i++) {
      const h = hash(i, 31);
      x.fillStyle = h & 1 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.09)';
      x.fillRect(h >> 3 & 127, h >> 11 & 127, 1 + (h >> 20 & 1), 1);
    }
    return (grain = ctx.createPattern(c, 'repeat'));
  }

  function ground(ctx, cx, cy, hw, hh) {
    const T = 90, x0 = Math.floor((cx - hw) / T), x1 = Math.floor((cx + hw) / T), y0 = Math.floor((cy - hh) / T), y1 = Math.floor((cy + hh) / T);
    ctx.fillStyle = '#161c40';
    ctx.beginPath();
    for (let iy = y0; iy <= y1; iy++) for (let ix = x0; ix <= x1; ix++) {
      const h = hash(ix, iy);
      if (h % 5) continue;
      const x = (ix + (h & 255) / 255) * T, y = (iy + (h >> 8 & 255) / 255) * T, r = 14 + (h >> 16 & 15);
      ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU);
    }
    ctx.fill();
    ctx.fillStyle = '#2a3160';
    ctx.beginPath();
    for (let iy = y0; iy <= y1; iy++) for (let ix = x0; ix <= x1; ix++) {
      const h = hash(ix + 999, iy - 999);
      const x = (ix + (h & 255) / 255) * T, y = (iy + (h >> 8 & 255) / 255) * T, r = 1 + (h >> 16 & 1);
      ctx.rect(x, y, r, r);
    }
    ctx.fill();
  }

  const circle = (ctx, x, y, r) => { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); };

  // pts 는 반지름 단위의 (앞, 옆) 좌표쌍. 겹치는 조각끼리 감는 방향이 다르면 nonzero 채우기에서
  // 겹친 자리가 구멍으로 뚫리므로, 방향을 원(arc)과 같은 쪽으로 맞춰서 그린다.
  function poly(ctx, e, ux, uy, pts) {
    let area = 0;
    const n = pts.length;
    for (let i = 0; i < n; i += 2) area += pts[i] * pts[(i + 3) % n] - pts[(i + 2) % n] * pts[i + 1];
    for (let k = 0; k < n; k += 2) {
      const i = area >= 0 ? k : n - 2 - k;
      const x = e.x + (ux * pts[i] - uy * pts[i + 1]) * e.r, y = e.y + (uy * pts[i] + ux * pts[i + 1]) * e.r;
      if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
  }

  const SHAPES = {
    shade(ctx, e, ux, uy, t) {
      const r = e.r, w = Math.sin(t * 6 + e.id) * r * .14, x = e.x, y = e.y;
      ctx.moveTo(x - r, y); ctx.arc(x, y, r, Math.PI, 0);
      ctx.lineTo(x + r, y + r * 1.05 + w); ctx.lineTo(x + r * .5, y + r * .6 - w); ctx.lineTo(x, y + r * 1.05 + w);
      ctx.lineTo(x - r * .5, y + r * .6 - w); ctx.lineTo(x - r, y + r * 1.05 + w); ctx.closePath();
    },
    runner(ctx, e, ux, uy) { poly(ctx, e, ux, uy, [1.4, 0, -1, .85, -.45, 0, -1, -.85]); },
    brute(ctx, e) {
      poly(ctx, e, 1, 0, [-1, -.55, -.55, -1, .55, -1, 1, -.55, 1, 1, -1, 1]);
      poly(ctx, e, 1, 0, [-.95, -.7, -1.3, -1.55, -.4, -.95]);
      poly(ctx, e, 1, 0, [.95, -.7, 1.3, -1.55, .4, -.95]);
    },
    spitter(ctx, e, ux, uy) {
      circle(ctx, e.x, e.y, e.r);
      for (const s of [-.75, 0, .75]) poly(ctx, e, ux, uy, [-.75, s - .28, -1.6, s * 1.5, -.75, s + .28]);
    },
    splitter(ctx, e) { circle(ctx, e.x - e.r * .42, e.y, e.r * .74); circle(ctx, e.x + e.r * .42, e.y, e.r * .74); },
    mite(ctx, e, ux, uy) { poly(ctx, e, ux, uy, [1.3, 0, -.8, .9, -.8, -.9]); },
    charger(ctx, e, ux, uy) { poly(ctx, e, ux, uy, [1.5, 0, .2, .95, -1, .75, -.6, 0, -1, -.75, .2, -.95]); },
    wisp(ctx, e, ux, uy, t) {
      circle(ctx, e.x, e.y, e.r);
      poly(ctx, e, ux, uy, [-.2, .9, -2.3, Math.sin(t * 9 + e.id) * .6, -.2, -.9]);
    },
    swarm(ctx, e, ux, uy, t) {
      const f = .5 + .5 * Math.sin(t * 22 + e.id);
      poly(ctx, e, ux, uy, [1, 0, -.1, .5, -.5, 1 + f, -.5, .4, -1, 0, -.5, -.4, -.5, -1 - f, -.1, -.5]);
    },
    warden(ctx, e, ux, uy, t) {
      const k = .414;
      poly(ctx, e, 1, 0, [-k, -1, k, -1, 1, -k, 1, k, k, 1, -k, 1, -1, k, -1, -k]);
      for (let i = 0; i < 6; i++) { const a = t * .9 + i / 6 * TAU; poly(ctx, e, Math.cos(a), Math.sin(a), [1.25, 0, 1.45, .2, 1.65, 0, 1.45, -.2]); }
    },
    weaver(ctx, e, ux, uy, t) {
      poly(ctx, e, 1, 0, [0, -1.2, 1, 0, 0, 1.2, -1, 0]);
      for (let i = 0; i < 6; i++) { const a = (i + .5) / 6 * TAU + Math.sin(t * 5 + i) * .12; poly(ctx, e, Math.cos(a), Math.sin(a), [.5, .14, 1.9, 0, .5, -.14]); }
    },
    maw(ctx, e, ux, uy) {
      const a = Math.atan2(uy, ux), m = e.st === 1 ? 1 : e.st === 2 ? .2 : .45;
      ctx.moveTo(e.x, e.y); ctx.arc(e.x, e.y, e.r, a + m, a - m + TAU); ctx.closePath();
    },
  };

  function eyes(ctx, e, ux, uy) {
    const r = e.r, t = e.type, lx = e.x + ux * r * .18, ly = e.y + uy * r * .18;
    if (t === 'shade' || t === 'brute') {
      const er = r * (t === 'brute' ? .13 : .17);
      circle(ctx, lx - r * .38, ly - r * .15, er); circle(ctx, lx + r * .38, ly - r * .15, er);
    } else if (t === 'splitter') { circle(ctx, lx - r * .42, ly, r * .15); circle(ctx, lx + r * .42, ly, r * .15); }
    else if (t === 'charger') for (const s of [-.4, .4]) circle(ctx, e.x + (ux * .35 - uy * s) * r, e.y + (uy * .35 + ux * s) * r, r * .15);
    else if (t === 'runner' || t === 'mite') circle(ctx, e.x + ux * r * .25, e.y + uy * r * .25, r * .22);
    else if (t === 'wisp') circle(ctx, e.x, e.y, r * .45);
    else if (t === 'warden') circle(ctx, e.x, e.y, r * .44);
    else if (t === 'weaver') for (const [x, y] of [[-.2, -.25], [.2, -.25], [-.42, .08], [.42, .08]]) circle(ctx, lx + x * r, ly + y * r, r * .1);
    else if (t === 'maw') { const a = Math.atan2(uy, ux) - 1.5; circle(ctx, e.x + Math.cos(a) * r * .55, e.y + Math.sin(a) * r * .55, r * .13); }
  }

  function enemies(ctx, S, cx, cy, hw, hh, time) {
    const p = S.p, groups = {}, vis = [], cut = [];
    for (const e of S.enemies) {
      const m = e.r * 2.4;
      if (Math.abs(e.x - cx) > hw + m || Math.abs(e.y - cy) > hh + m) continue;
      const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
      e.lx = dx / d; e.ly = dy / d;
      if (e.type === 'swarm') { const v = Math.hypot(e.vx, e.vy) || 1; e.ux = e.vx / v; e.uy = e.vy / v; }
      else if ((e.type === 'charger' || e.boss === 'maw') && e.st > 0) { e.ux = e.dx; e.uy = e.dy; }
      else { e.ux = e.lx; e.uy = e.ly; }
      e.spr = spr('enemies/' + e.type);
      if (e.spr) { cut.push(e); continue; }
      vis.push(e);
      (groups[e.type] || (groups[e.type] = [])).push(e);
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const e of S.enemies) {
      if (!((e.type === 'charger' || e.boss === 'maw') && e.st === 1)) continue;
      const len = e.boss ? 340 : 190;
      ctx.strokeStyle = 'rgba(226,96,122,.35)'; ctx.lineWidth = e.r * 1.6;
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + e.dx * len, e.y + e.dy * len); ctx.stroke();
    }
    const ice = S.freeze > 0;
    for (const e of cut) {
      const dash = (e.type === 'charger' || e.boss === 'maw') && e.st === 2;
      const rot = e.type === 'swarm' ? Math.sin(time * 18 + e.id) * .25 : dash ? e.ux * .35 : Math.sin(time * 4 + e.id) * .09;
      paper(ctx, e.spr, e.x, e.y, e.r * (e.boss ? 2.9 : 3.5), rot, (e.type === 'swarm' ? e.ux : e.lx) < 0, { rim: e.boss ? '#e2607a' : e.elite ? '#e3ba52' : null, flash: e.flash > 0, ice });
      if (e.elite) {
        ctx.fillStyle = '#0d1020'; ctx.fillRect(e.x - 16, e.y - e.r * 1.7 - 9, 32, 4);
        ctx.fillStyle = '#e3ba52'; ctx.fillRect(e.x - 16, e.y - e.r * 1.7 - 9, 32 * Math.max(0, e.hp / e.maxHp), 4);
      }
    }
    if (groups.wisp) {
      ctx.globalCompositeOperation = 'lighter';
      for (const e of groups.wisp) glow(ctx, '#3f78b4', e.x, e.y, e.r * 2.6, .7);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    // 채우기보다 먼저 그려야 조각이 겹친 안쪽 선이 가려지고 바깥 테두리만 남는다.
    ctx.lineWidth = 4;
    for (const e of vis) {
      if (!e.elite && !e.boss) continue;
      ctx.strokeStyle = e.boss ? '#e2607a' : '#e3ba52';
      ctx.beginPath(); SHAPES[e.type](ctx, e, e.ux, e.uy, time); ctx.stroke();
      if (e.elite) {
        ctx.fillStyle = '#0d1020'; ctx.fillRect(e.x - 16, e.y - e.r * 1.6 - 9, 32, 4);
        ctx.fillStyle = '#e3ba52'; ctx.fillRect(e.x - 16, e.y - e.r * 1.6 - 9, 32 * Math.max(0, e.hp / e.maxHp), 4);
      }
    }
    for (const type in groups) {
      ctx.fillStyle = G.ENEMIES[type].color;
      ctx.beginPath();
      for (const e of groups[type]) SHAPES[type](ctx, e, e.ux, e.uy, time);
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    for (const e of vis) if (e.flash > 0) SHAPES[e.type](ctx, e, e.ux, e.uy, time);
    ctx.fill();
    ctx.fillStyle = S.freeze > 0 ? '#9fd8ff' : '#ece3cf';
    ctx.beginPath();
    for (const e of vis) eyes(ctx, e, e.lx, e.ly);
    ctx.fill();
    ctx.fillStyle = '#0d1020';
    ctx.beginPath();
    if (groups.spitter) for (const e of groups.spitter) circle(ctx, e.x + e.ux * e.r * .45, e.y + e.uy * e.r * .45, e.r * .4);
    if (groups.warden) for (const e of groups.warden) circle(ctx, e.x + e.lx * e.r * .18, e.y + e.ly * e.r * .18, e.r * .2);
    ctx.fill();
  }

  function flame(ctx, x, y, s, time, outer, mid, core) {
    const fl = Math.sin(time * 13) * 2.5 * s, sway = Math.sin(time * 5) * 3 * s;
    ctx.fillStyle = outer;
    ctx.beginPath(); ctx.moveTo(x - 8 * s, y - 2 * s); ctx.quadraticCurveTo(x + sway, y - 27 * s - fl, x + 8 * s, y - 2 * s); ctx.fill();
    ctx.fillStyle = mid; ctx.beginPath(); ctx.arc(x, y, 9 * s, 0, TAU); ctx.fill();
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(x, y + s, 5 * s, 0, TAU); ctx.fill();
  }
  const path = (ctx, x, y, pts) => {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 2) ctx.lineTo(x + pts[i], y + pts[i + 1]);
    ctx.closePath(); ctx.fill();
  };

  const PLAYER = {
    ember: { glow: '#ff8a2a', draw(ctx, x, y, t) { flame(ctx, x, y, 1, t, '#ff7a1a', '#ffb347', '#fff3c4'); } },
    firefly: {
      glow: '#b9d94a',
      draw(ctx, x, y, t) {
        const f = Math.sin(t * 30) * 3;
        ctx.fillStyle = 'rgba(236,227,207,.55)';
        path(ctx, x, y, [-2, -5, -15, -11 + f, -11, -1]); path(ctx, x, y, [2, -5, 15, -11 + f, 11, -1]);
        ctx.fillStyle = '#3a3324'; ctx.beginPath(); ctx.ellipse(x, y - 4, 4.5, 6, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#d9f26a'; ctx.beginPath(); ctx.arc(x, y + 5, 6.5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fbffd9'; ctx.beginPath(); ctx.arc(x, y + 5, 3.2, 0, TAU); ctx.fill();
      },
    },
    coal: {
      glow: '#ff5a2a',
      draw(ctx, x, y, t) {
        flame(ctx, x, y - 8, .55, t, '#ff7a1a', '#ffb347', '#fff3c4');
        ctx.fillStyle = '#322b33'; path(ctx, x, y, [-11, -3, -6, -10, 5, -11, 12, -4, 10, 7, 2, 11, -8, 9]);
        ctx.strokeStyle = '#ff7a1a'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - 6, y - 2); ctx.lineTo(x - 1, y + 2); ctx.lineTo(x + 2, y - 3); ctx.lineTo(x + 7, y + 3); ctx.moveTo(x - 1, y + 2); ctx.lineTo(x - 2, y + 7); ctx.stroke();
      },
    },
    candle: {
      glow: '#ffb347',
      draw(ctx, x, y, t) {
        flame(ctx, x, y - 9, .6, t, '#ff7a1a', '#ffb347', '#fff3c4');
        ctx.fillStyle = '#ece3cf'; ctx.fillRect(x - 5.5, y - 5, 11, 17);
        ctx.fillStyle = '#c9bea4'; ctx.fillRect(x + 2, y - 5, 3.5, 17);
        ctx.fillStyle = '#ece3cf'; ctx.fillRect(x - 7.5, y - 1, 3, 5);
      },
    },
    bolt: {
      glow: '#6aa8ff',
      draw(ctx, x, y, t) {
        const j = Math.sin(t * 40) > .3 ? 1 : 0;
        ctx.fillStyle = '#9fd0ff'; ctx.beginPath(); ctx.arc(x, y, 10, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff6b0'; path(ctx, x, y, [3, -16 - j, -7, 1, -1, 1, -4, 15 + j, 8, -3, 1, -3]);
      },
    },
    kiln: {
      glow: '#ff7a2a',
      draw(ctx, x, y, t) {
        flame(ctx, x, y - 7, .7, t, '#ff7a1a', '#ffb347', '#fff3c4');
        ctx.fillStyle = '#8a5a3c'; path(ctx, x, y, [-11, -5, 11, -5, 8, 11, -8, 11]);
        ctx.fillStyle = '#6b432b'; ctx.fillRect(x - 12.5, y - 7, 25, 4);
        ctx.fillStyle = '#ff9a3c'; ctx.fillRect(x - 4, y + 2, 8, 5);
      },
    },
    crescent: {
      glow: '#9db4f0',
      draw(ctx, x, y, t) {
        const a = Math.sin(t * 1.5) * .15 - .5;
        ctx.fillStyle = '#f3ecd2';
        ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU);
        ctx.moveTo(x + Math.cos(a) * 5 + 9.5, y + Math.sin(a) * 5); ctx.arc(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 9.5, 0, TAU);
        ctx.fill('evenodd');
      },
    },
    meteor: {
      glow: '#ffb347',
      draw(ctx, x, y, t) {
        ctx.fillStyle = '#ff8a2a'; path(ctx, x, y, [-7, -3, -20, -24 + Math.sin(t * 12) * 2, -1, -8]);
        ctx.fillStyle = '#ffb347'; path(ctx, x, y, [-5, -3, -13, -16, -1, -6]);
        ctx.fillStyle = '#ffe9a8';
        const pts = [], rot = t * 1.2;
        for (let i = 0; i < 8; i++) { const a = rot + i / 8 * TAU, r = i % 2 ? 4.5 : 12; pts.push(Math.cos(a) * r, Math.sin(a) * r); }
        path(ctx, x, y, pts);
      },
    },
  };

  // ── 종이 오리기 이펙트 ──
  const INK = '#04050c', CREAM = '#f3ecd2', EMBER = '#f08a2e', GOLD = '#e3ba52', ROSE = '#e2607a', SKY = '#6cb6e6';

  function starPath(ctx, x, y, ro, ri, n, rot) {
    for (let i = 0; i < n * 2; i++) {
      const a = rot + i * Math.PI / n, r = i % 2 ? ri : ro, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
  }
  // pts 는 (앞, 옆) 픽셀 좌표쌍
  function orient(ctx, x, y, ux, uy, pts) {
    for (let i = 0; i < pts.length; i += 2) {
      const px = x + ux * pts[i] - uy * pts[i + 1], py = y + uy * pts[i] + ux * pts[i + 1];
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
  }
  // 종이 조각 하나: 어긋난 그림자를 먼저 깔고 그 위에 색 조각을 올린다.
  function piece(ctx, color, draw, alpha) {
    const a = alpha == null ? 1 : alpha;
    ctx.globalAlpha = a * .45; ctx.fillStyle = INK;
    ctx.translate(2, 3); ctx.beginPath(); draw(); ctx.fill('evenodd'); ctx.translate(-2, -3);
    ctx.globalAlpha = a; ctx.fillStyle = color;
    ctx.beginPath(); draw(); ctx.fill('evenodd');
  }
  const flat = (ctx, color, draw) => { ctx.fillStyle = color; ctx.beginPath(); draw(); ctx.fill(); };

  function img(ctx, s, x, y, w, h, rot, ax, ay) {
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
    ctx.drawImage(s.img, -w * (ax == null ? .5 : ax), -h * (ay == null ? .5 : ay), w, h); ctx.restore();
  }
  function small(s, px) {
    let c = s.sm && s.sm[px];
    if (!c) { c = document.createElement('canvas'); c.width = c.height = px * 3; c.getContext('2d').drawImage(s.img, 0, 0, px * 3, px * 3); (s.sm || (s.sm = {}))[px] = c; }
    return c;
  }

  function shots(ctx, S) {
    for (const s of S.shots) {
      const sp = spr(s.k === 'spark' ? 'fx/spark' : 'fx/crescent');
      if (sp) {
        ctx.globalAlpha = 1;
        if (s.k === 'spark') img(ctx, sp, s.x, s.y, 36, 36, Math.atan2(s.vy, s.vx), .66);
        else img(ctx, sp, s.x, s.y, s.r * 2.7, s.r * 2.7, s.spin);
        continue;
      }
      if (s.k === 'spark') {
        const v = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / v, uy = s.vy / v;
        ctx.globalAlpha = 1;
        flat(ctx, GOLD, () => { orient(ctx, s.x - ux * 14, s.y - uy * 14, ux, uy, [4, 0, 0, 2.6, -5, 0, 0, -2.6]); orient(ctx, s.x - ux * 23, s.y - uy * 23, ux, uy, [2.6, 0, 0, 1.7, -3.4, 0, 0, -1.7]); });
        piece(ctx, EMBER, () => orient(ctx, s.x, s.y, ux, uy, [11, 0, 1, 5.5, -9, 0, 1, -5.5]));
        flat(ctx, CREAM, () => orient(ctx, s.x, s.y, ux, uy, [7, 0, 1, 2.6, -3, 0, 1, -2.6]));
      } else {
        const r = s.r, ox = Math.cos(s.spin) * r * .25, oy = Math.sin(s.spin) * r * .25;
        piece(ctx, CREAM, () => { ctx.moveTo(s.x + r, s.y); ctx.arc(s.x, s.y, r, 0, TAU); ctx.moveTo(s.x + ox + r * .75, s.y + oy); ctx.arc(s.x + ox, s.y + oy, r * .75, 0, TAU); });
        flat(ctx, '#74c7a4', () => { const a = s.spin + Math.PI; ctx.arc(s.x + Math.cos(a) * r * .78, s.y + Math.sin(a) * r * .78, r * .13, 0, TAU); });
      }
    }
    ctx.globalAlpha = 1;
  }

  const DANGER = '#ff4058';
  function bullets(ctx, S, time) {
    const each = fn => { ctx.beginPath(); for (const b of S.bullets) fn(b); ctx.fill('evenodd'); };
    ctx.globalAlpha = .5; ctx.fillStyle = DANGER;
    each(b => { const v = Math.hypot(b.vx, b.vy) || 1; orient(ctx, b.x, b.y, b.vx / v, b.vy / v, [-4, 6, -24, 0, -4, -6]); });
    ctx.globalAlpha = .6; ctx.fillStyle = INK;
    each(b => { ctx.moveTo(b.x + 15, b.y + 2); ctx.arc(b.x + 1, b.y + 2, 14, 0, TAU); });
    ctx.globalAlpha = 1; ctx.fillStyle = CREAM;
    each(b => starPath(ctx, b.x, b.y, 12 + Math.sin(time * 12 + b.x * .1) * 1.5, 6.5, 4, time * 5 + b.x * .05));
    ctx.fillStyle = DANGER;
    each(b => { ctx.moveTo(b.x + 5.5, b.y); ctx.arc(b.x, b.y, 5.5, 0, TAU); });
  }

  function petal(ctx, x, y, a, rb, rt, w, skew) {
    const ca = Math.cos(a), sa = Math.sin(a), bx = x + ca * rb, by = y + sa * rb, tx = x + Math.cos(a + skew) * rt, ty = y + Math.sin(a + skew) * rt;
    const mx = x + ca * (rb + (rt - rb) * .45), my = y + sa * (rb + (rt - rb) * .45);
    ctx.moveTo(bx + sa * w * .5, by - ca * w * .5);
    ctx.quadraticCurveTo(mx + sa * w, my - ca * w, tx, ty);
    ctx.quadraticCurveTo(mx - sa * w, my + ca * w, bx - sa * w * .5, by + ca * w * .5);
    ctx.quadraticCurveTo(bx - ca * w * .5, by - sa * w * .5, bx + sa * w * .5, by - ca * w * .5);
  }
  const SHRINE_FX = {
    heal: [SKY, [8, 0, 2, 2.4, -2, 3.8, -5, 2.6, -6, 0, -5, -2.6, -2, -3.8, 2, -2.4]],
    wisdom: ['#74c7a4', [7, 0, 0, 4, -7, 0, 0, -4]],
    gamble: [GOLD, null],
    pact: [ROSE, [8, 0, 1.5, 1.5, 0, 5, -1.5, 1.5, -8, 0, -1.5, -1.5, 0, -5, 1.5, -1.5]],
  };

  function zones(ctx, S, time) {
    for (const z of S.zones) {
      ctx.globalAlpha = 1;
      if (z.k === 'mine') {
        const ms = spr('fx/mine');
        if (ms) { img(ctx, ms, z.x, z.y - 3, 28, 28, Math.sin(time * 5 + z.x) * .12); continue; }
        const fl = Math.sin(time * 14 + z.x) * 1.5;
        flat(ctx, GOLD, () => { ctx.moveTo(z.x - 3.5, z.y - 4); ctx.lineTo(z.x + Math.sin(time * 6 + z.y) * 2, z.y - 14 - fl); ctx.lineTo(z.x + 3.5, z.y - 4); });
        piece(ctx, EMBER, () => starPath(ctx, z.x, z.y, 7.5, 6.2, 7, z.x));
        flat(ctx, CREAM, () => ctx.arc(z.x, z.y, 2.6, 0, TAU));
      } else if (z.k === 'fire') {
        const fs = spr('fx/fire');
        if (fs) { ctx.globalAlpha = Math.min(1, z.dur / .5) * .82; const d = z.r * 2.12 * (1 + Math.sin(time * 6 + z.x) * .025); img(ctx, fs, z.x, z.y, d, d, z.x + time * .25); continue; }
        ctx.globalAlpha = .22; flat(ctx, EMBER, () => ctx.arc(z.x, z.y, z.r, 0, TAU));
        ctx.globalAlpha = Math.min(1, z.dur / .5) * .9;
        const n = Math.max(6, Math.round(z.r / 7));
        flat(ctx, EMBER, () => {
          for (let i = 0; i < n; i++) {
            const a = i / n * TAU + z.x, rr = z.r * (i % 2 ? .78 : .42), fx = z.x + Math.cos(a) * rr, fy = z.y + Math.sin(a) * rr * .9;
            const h = 9 + Math.sin(time * 11 + i * 2.1) * 4;
            ctx.moveTo(fx - 4, fy + 3); ctx.lineTo(fx + Math.sin(time * 7 + i) * 2, fy - h); ctx.lineTo(fx + 4, fy + 3);
          }
        });
        flat(ctx, GOLD, () => {
          for (let i = 0; i < n; i += 2) {
            const a = i / n * TAU + z.x, rr = z.r * .42, fx = z.x + Math.cos(a) * rr, fy = z.y + Math.sin(a) * rr * .9;
            ctx.moveTo(fx - 2, fy + 3); ctx.lineTo(fx, fy - 4 - Math.sin(time * 11 + i * 2.1) * 2); ctx.lineTo(fx + 2, fy + 3);
          }
        });
      } else if (z.T) {
        const k = 1 - Math.max(0, z.delay) / z.T, col = z.pd ? ROSE : CREAM;
        ctx.globalAlpha = z.pd ? .2 : .1; flat(ctx, col, () => ctx.arc(z.x, z.y, z.r * k, 0, TAU));
        ctx.globalAlpha = .85; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([7, 6]); ctx.lineDashOffset = -time * 24;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        const ss = spr(z.pd ? 'fx/starr' : 'fx/star');
        if (ss) { const h2 = (1 - k) * 300; ctx.globalAlpha = 1; img(ctx, ss, z.x + h2 * .8, z.y - h2, 58, 58, 0, .25, .7); continue; }
        const h = (1 - k) * 300, sx = z.x + h * .35, sy = z.y - h, ux = -.33, uy = .944;
        ctx.globalAlpha = 1;
        flat(ctx, EMBER, () => orient(ctx, sx, sy, ux, uy, [0, 7, -34, 0, 0, -7]));
        flat(ctx, GOLD, () => orient(ctx, sx, sy, ux, uy, [0, 4, -20, 0, 0, -4]));
        piece(ctx, z.pd ? ROSE : CREAM, () => starPath(ctx, sx, sy, 11, 4.8, 5, time * 4));
      }
    }
    ctx.globalAlpha = 1;
  }

  ['breath-1', 'breath-2', 'breath-3', 'burst-1', 'burst-2', 'burst-3', 'burstr-1', 'burstr-2', 'burstr-3', 'spark', 'crescent', 'mine', 'star', 'starr', 'impact', 'gem-1', 'gem-2', 'gem-3', 'drop', 'beam', 'bolt', 'fire'].forEach(n => spr('fx/' + n));
  function effects(ctx, S) {
    ctx.lineJoin = 'miter'; ctx.lineCap = 'butt'; ctx.miterLimit = 6;
    for (const f of S.fx) {
      const k = f.t / f.d, fade = k < .6 ? 1 : (1 - k) / .4;
      if (f.k === 'p') {
        const a = f.vx * .05 + f.t * 12, x = f.x, y = f.y + 90 * f.t * f.t;
        ctx.globalAlpha = fade; ctx.fillStyle = f.color;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4); ctx.lineTo(x + Math.cos(a + 2.2) * 3.4, y + Math.sin(a + 2.2) * 3.4); ctx.lineTo(x + Math.cos(a + 4.1) * 3.4, y + Math.sin(a + 4.1) * 3.4); ctx.fill();
      } else if (f.k === 'breath') {
        const fr = spr(k < .18 ? 'fx/breath-1' : k < .6 ? 'fx/breath-2' : 'fx/breath-3');
        if (fr) {
          const R = f.r * (k < .6 ? .35 + .65 * (1 - Math.pow(1 - k / .6, 2.2)) : 1 + (k - .6) * .25), sz = R * 2.06;
          ctx.globalAlpha = .14 * (1 - k); flat(ctx, EMBER, () => ctx.arc(f.x, f.y, f.r, 0, TAU));
          ctx.globalAlpha = k < .6 ? 1 : Math.min(1, (1 - k) / .3);
          ctx.save(); ctx.translate(f.x, f.y); ctx.rotate((hash(f.x | 0, f.y | 0) & 63) / 10 + k * .5);
          ctx.drawImage(fr.img, -sz / 2, -sz / 2, sz, sz); ctx.restore();
          continue;
        }
        // 숨결: 불꽃 잎이 바깥으로 피어났다가 가늘어지며 사라진다.
        const e = 1 - Math.pow(1 - Math.min(1, k / .55), 3), rt = f.r * (.3 + .7 * e), n = Math.max(9, Math.round(f.r / 11));
        const thin = 1 - k * .65, w = rt * 2.4 / n * thin, rot = (hash(f.x | 0, f.y | 0) & 63) / 10, step = TAU / n;
        ctx.globalAlpha = .16 * (1 - k); flat(ctx, EMBER, () => ctx.arc(f.x, f.y, f.r, 0, TAU));
        piece(ctx, EMBER, () => { for (let i = 0; i < n; i++) petal(ctx, f.x, f.y, rot + i * step, rt * .5, rt, w, .28); }, fade);
        flat(ctx, GOLD, () => { for (let i = 0; i < n; i++) petal(ctx, f.x, f.y, rot + (i + .5) * step, rt * .42, rt * .8, w * .7, .28); });
        flat(ctx, CREAM, () => { for (let i = 0; i < n; i++) petal(ctx, f.x, f.y, rot + i * step, rt * .56, rt * .82, w * .32, .28); });
      } else if (f.k === 'shrine') {
        // 제단: 물결 고리 세 겹이 번지고, 종이 조각이 솟았다가 떨어진다.
        const def = SHRINE_FX[f.s] || SHRINE_FX.heal, col = def[0];
        for (let j = 0; j < 3; j++) {
          const kk = (k - j * .16) / (1 - j * .16); if (kk <= 0 || kk >= 1) continue;
          const R = f.r * (1 - Math.pow(1 - kk, 2.4)), wd = 5 * (1 - kk) + 1;
          piece(ctx, j === 1 ? CREAM : col, () => { ctx.moveTo(f.x + R, f.y); ctx.arc(f.x, f.y, R, 0, TAU); ctx.moveTo(f.x + R - wd, f.y); ctx.arc(f.x, f.y, Math.max(0, R - wd), 0, TAU); }, 1 - kk * kk);
        }
        const t = f.t, sz = k < .7 ? 1 : (1 - k) / .3;
        for (let i = 0; i < 11; i++) {
          const h = hash(i * 7 + 3, f.x | 0), a = -Math.PI / 2 + (i - 5) * .24, v = 150 + (h & 63) * 1.6, vx = Math.cos(a) * v, vy = Math.sin(a) * v + 300 * t;
          const x = f.x + vx * t, y = f.y - 10 + Math.sin(a) * v * t + 150 * t * t, s = Math.hypot(vx, vy) || 1, m = (1.7 + (h >> 6 & 3) * .3) * sz;
          const dsp = f.s === 'heal' && spr('fx/drop');
          if (dsp) { ctx.globalAlpha = 1; img(ctx, dsp, x, y, 15 * m, 15 * m); continue; }
          const c = i % 3 === 1 ? CREAM : col;
          if (def[1]) piece(ctx, c, () => orient(ctx, x, y, vx / s * m, vy / s * m, def[1]));
          else piece(ctx, c, () => starPath(ctx, x, y, 7 * m, 3 * m, 5, t * 6 + i));
        }
      } else if (f.k === 'ring' && f.fill) {
        const pre = f.color === '#ff5a4a' ? 'fx/burstr-' : 'fx/burst-', bsp = spr(pre + (k < .2 ? 1 : k < .6 ? 2 : 3));
        if (bsp) {
          const R = f.r * (k < .6 ? .45 + .55 * (1 - Math.pow(1 - k / .6, 2.2)) : 1 + (k - .6) * .3), d = R * 2.3;
          ctx.globalAlpha = k < .6 ? 1 : Math.min(1, (1 - k) / .3);
          img(ctx, bsp, f.x, f.y, d, d, (hash(f.x | 0, f.y | 0) & 63) / 10);
          continue;
        }
        // 폭발: 톱니 별 세 겹이 튀어나왔다가 사라진다.
        const e = 1 - Math.pow(1 - Math.min(1, k / .4), 3), R = f.r * (.3 + .7 * e), rot = (hash(f.x | 0, f.y | 0) & 63) / 10, n = R > 55 ? 12 : 9;
        piece(ctx, f.color === '#ffb347' ? EMBER : f.color, () => starPath(ctx, f.x, f.y, R, R * .7, n, rot), fade);
        flat(ctx, GOLD, () => starPath(ctx, f.x, f.y, R * .68, R * .44, n, rot + .35));
        flat(ctx, CREAM, () => starPath(ctx, f.x, f.y, R * .38, R * .2, n, rot));
      } else if (f.k === 'ring') {
        // 퍼지는 고리: 바깥이 톱니인 띠
        const R = f.r * (.3 + .7 * Math.sqrt(k)), n = Math.max(14, Math.round(R / 5));
        piece(ctx, f.color === '#ff9a3c' ? EMBER : f.color, () => { starPath(ctx, f.x, f.y, R, R * .9, n, k * 2); ctx.moveTo(f.x + R * .8, f.y); ctx.arc(f.x, f.y, R * .8, 0, TAU); }, fade);
        ctx.strokeStyle = CREAM; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, R * .74, 0, TAU); ctx.stroke();
      } else if (f.k === 'beam') {
        const dx = f.x2 - f.x, dy = f.y2 - f.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, w = f.w * (1 - k * .7);
        const bm = spr('fx/beam');
        if (bm) { ctx.globalAlpha = fade; img(ctx, bm, f.x, f.y, len + 14, Math.max(14, w * 2.6), Math.atan2(dy, dx), 0, .5); continue; }
        piece(ctx, EMBER, () => orient(ctx, f.x, f.y, ux, uy, [6, w * .85, len, w * .28, len + 10, 0, len, -w * .28, 6, -w * .85, 0, 0]), fade);
        flat(ctx, CREAM, () => orient(ctx, f.x, f.y, ux, uy, [10, w * .5, len - 4, w * .12, len - 4, -w * .12, 10, -w * .5]));
      } else {
        const bo = spr('fx/bolt'), im = spr('fx/impact');
        if (bo && im) {
          ctx.globalAlpha = fade;
          for (let i = 2; i < f.pts.length; i += 2) {
            const x0 = f.pts[i - 2], y0 = f.pts[i - 1], x1 = f.pts[i], y1 = f.pts[i + 1];
            img(ctx, bo, x0, y0, Math.hypot(x1 - x0, y1 - y0), 20, Math.atan2(y1 - y0, x1 - x0), 0, .5);
          }
          for (let i = 2; i < f.pts.length; i += 2) img(ctx, im, f.pts[i], f.pts[i + 1], 30, 30, i);
          continue;
        }
        const zig = () => {
          ctx.moveTo(f.pts[0], f.pts[1]);
          for (let i = 2; i < f.pts.length; i += 2) {
            const mx = (f.pts[i - 2] + f.pts[i]) / 2 + ((hash(i, f.pts[i] | 0) & 31) - 16), my = (f.pts[i - 1] + f.pts[i + 1]) / 2 + ((hash(f.pts[i + 1] | 0, i) & 31) - 16);
            ctx.lineTo(mx, my); ctx.lineTo(f.pts[i], f.pts[i + 1]);
          }
        };
        ctx.globalAlpha = fade * .45; ctx.strokeStyle = INK; ctx.lineWidth = 8;
        ctx.translate(2, 3); ctx.beginPath(); zig(); ctx.stroke(); ctx.translate(-2, -3);
        ctx.globalAlpha = fade; ctx.strokeStyle = SKY; ctx.beginPath(); zig(); ctx.stroke();
        ctx.strokeStyle = CREAM; ctx.lineWidth = 3.2; ctx.beginPath(); zig(); ctx.stroke();
        flat(ctx, CREAM, () => { for (let i = 2; i < f.pts.length; i += 2) starPath(ctx, f.pts[i], f.pts[i + 1], 8, 2.6, 4, i); });
      }
    }
    ctx.globalAlpha = 1;
  }

  function indicator(ctx, V, sx, sy, glyph, color, name) {
    const m = 26, top = 92;
    if (sx > m && sx < V.w - m && sy > top && sy < V.h - m) return;
    const x = Math.max(m, Math.min(V.w - m, sx)), y = Math.max(top, Math.min(V.h - m, sy));
    ctx.fillStyle = '#0d1020'; ctx.fillRect(x - 15, y - 15, 30, 30);
    const is = spr(name);
    if (is) ctx.drawImage(is.img, x - 12, y - 12, 24, 24); else if (glyph) seal(ctx, x, y, 24, glyph, color); else pickup(ctx, 'chest', x, y);
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.strokeRect(x - 14.5, y - 14.5, 29, 29);
  }

  G.render = function (ctx, S, V) {
    const p = S.p, time = V.time, sc = V.scale;
    const look = PLAYER[S.char.id] || PLAYER.ember;
    let cx = p.x, cy = p.y;
    if (S.shake > 0) { cx += Math.sin(time * 90) * S.shake * 14; cy += Math.cos(time * 77) * S.shake * 14; }
    const hw = V.w / 2 / sc, hh = V.h / 2 / sc;
    ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#10142c'; ctx.fillRect(0, 0, V.w, V.h);

    ctx.save();
    ctx.translate(V.w / 2, V.h / 2); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    ground(ctx, cx, cy, hw, hh);
    ctx.fillStyle = grainPattern(ctx); ctx.fillRect(cx - hw - 2, cy - hh - 2, hw * 2 + 4, hh * 2 + 4);

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const s of S.shrines) {
      const d = G.SHRINES[s.k];
      ctx.globalAlpha = Math.min(1, s.life / 3);
      ctx.fillStyle = d.color + '22'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = d.color; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      if (s.charge > 0) { ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, -TAU / 4, -TAU / 4 + TAU * s.charge / 2.2); ctx.stroke(); }
      const ss = spr('items/shrine-' + s.k);
      if (ss) paper(ctx, ss, s.x, s.y + Math.sin(time * 2 + s.x) * 2, 46, 0, false); else seal(ctx, s.x, s.y, 26, d.icon, d.color);
      ctx.font = '11px ' + BODY; ctx.fillStyle = d.color; ctx.fillText(d.name, s.x, s.y + s.r + 12);
      ctx.globalAlpha = 1;
    }

    zones(ctx, S, time);

    const gs = [spr('fx/gem-1'), spr('fx/gem-2'), spr('fx/gem-3')];
    if (gs[0] && gs[1] && gs[2]) {
      const cv = [small(gs[0], 12), small(gs[1], 15), small(gs[2], 19)], sz = [12, 15, 19];
      for (const g of S.gems) {
        if (Math.abs(g.x - cx) > hw + 8 || Math.abs(g.y - cy) > hh + 8) continue;
        const t = g.v < 3 ? 0 : g.v < 10 ? 1 : 2, d = sz[t];
        ctx.drawImage(cv[t], g.x - d / 2, g.y - d / 2, d, d);
      }
    } else for (const tier of [[0, 3, SKY, 3.4], [3, 10, '#74c7a4', 4.6], [10, 1e9, GOLD, 6.2]]) {
      const r = tier[3], on = g => g.v >= tier[0] && g.v < tier[1] && Math.abs(g.x - cx) < hw + 8 && Math.abs(g.y - cy) < hh + 8;
      ctx.fillStyle = tier[2]; ctx.beginPath();
      for (const g of S.gems) if (on(g)) { ctx.moveTo(g.x, g.y - r); ctx.lineTo(g.x + r * .75, g.y); ctx.lineTo(g.x, g.y + r); ctx.lineTo(g.x - r * .75, g.y); }
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.38)'; ctx.beginPath();
      for (const g of S.gems) if (on(g)) { ctx.moveTo(g.x, g.y - r); ctx.lineTo(g.x - r * .75, g.y); ctx.lineTo(g.x, g.y + r); }
      ctx.fill();
    }

    for (const k of S.pickups) {
      const bob = Math.sin(time * 4 + k.x) * 3;
      ctx.globalCompositeOperation = 'lighter'; glow(ctx, k.k === 'chest' ? '#e3ba52' : k.k === 'heal' ? '#e2607a' : '#6cb6e6', k.x, k.y, 24, .5);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      const ks = spr('items/' + k.k);
      if (ks) paper(ctx, ks, k.x, k.y + bob, 30, Math.sin(time * 3 + k.x) * .12, false); else pickup(ctx, k.k, k.x, k.y + bob);
    }

    enemies(ctx, S, cx, cy, hw, hh, time);

    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, look.glow, p.x, p.y, 58 + Math.sin(time * 7) * 4, .45);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;

    shots(ctx, S);
    const lantern = spr('items/lantern');
    ctx.fillStyle = '#fff3c4';
    for (const w of S.weapons) for (let i = 0; i < w.orbs.length; i += 2) {
      if (lantern) paper(ctx, lantern, w.orbs[i], w.orbs[i + 1], 24 * S.st.area, Math.sin(time * 6 + i) * .2, false);
      else { ctx.beginPath(); ctx.arc(w.orbs[i], w.orbs[i + 1], 5 * S.st.area, 0, TAU); ctx.fill(); }
    }

    if (p.iframes <= 0 || Math.floor(time * 20) % 2) {
      const ps = spr('chars/' + S.char.id);
      if (ps) paper(ctx, ps, p.x, p.y - 4 + (p.moving ? Math.abs(Math.sin(time * 11)) * -3 : 0), 38, p.moving ? Math.sin(time * 11) * .1 : Math.sin(time * 3) * .04, V.faceLeft);
      else look.draw(ctx, p.x, p.y, time);
    }
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(p.x - 18, p.y + 20, 36, 5);
    ctx.fillStyle = p.hp / S.st.maxHp < .3 ? '#ff4a4a' : '#6fe07a'; ctx.fillRect(p.x - 17, p.y + 21, 34 * Math.max(0, p.hp / S.st.maxHp), 3);

    bullets(ctx, S, time);

    effects(ctx, S);

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of S.texts) {
      ctx.globalAlpha = 1 - t.t / .6;
      ctx.font = (t.crit ? 'bold 15px ' : 'bold 11px ') + BODY;
      ctx.fillStyle = t.crit ? '#ffd75a' : '#fff';
      ctx.fillText(t.v, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    const lightR = 560 * S.mod.fog * sc, gx = V.w / 2 + (p.x - cx) * sc, gy = V.h / 2 + (p.y - cy) * sc;
    const dark = ctx.createRadialGradient(gx, gy, lightR * .5, gx, gy, lightR);
    dark.addColorStop(0, 'rgba(4,5,14,0)'); dark.addColorStop(1, `rgba(4,5,14,${S.mod.fog < 1 ? .92 : .7})`);
    ctx.fillStyle = dark; ctx.fillRect(0, 0, V.w, V.h);
    if (S.freeze > 0) { ctx.fillStyle = 'rgba(120,190,255,.1)'; ctx.fillRect(0, 0, V.w, V.h); }
    if (S.hurtFlash > 0) { ctx.fillStyle = `rgba(255,40,40,${S.hurtFlash * .5})`; ctx.fillRect(0, 0, V.w, V.h); }

    const toScreen = (x, y) => [V.w / 2 + (x - cx) * sc, V.h / 2 + (y - cy) * sc];
    for (const s of S.shrines) { const [x, y] = toScreen(s.x, s.y); indicator(ctx, V, x, y, G.SHRINES[s.k].icon, G.SHRINES[s.k].color, 'items/shrine-' + s.k); }
    for (const k of S.pickups) if (k.k === 'chest') { const [x, y] = toScreen(k.x, k.y); indicator(ctx, V, x, y, null, '#e3ba52', 'items/chest'); }

    const j = V.joy;
    if (j) {
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(j.ox, j.oy, 48, 0, TAU); ctx.stroke();
      const jx = j.x - j.ox, jy = j.y - j.oy, jk = Math.min(1, 48 / (Math.hypot(jx, jy) || 1));
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.arc(j.ox + jx * jk, j.oy + jy * jk, 20, 0, TAU); ctx.fill();
    }
  };

  G.renderMenu = function (ctx, V) {
    ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#0b0e22'; ctx.fillRect(0, 0, V.w, V.h);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, '#ff7a1a', V.w / 2, V.h * 1.05, Math.max(V.w, V.h) * .7, .35);
    for (let i = 0; i < 46; i++) {
      const h = hash(i, 7), sp = 14 + (h & 31), x = ((h >> 8) % 1000) / 1000 * V.w + Math.sin(V.time * .8 + i) * 14;
      const y = V.h - ((V.time * sp + (h >> 18) % 2000) % (V.h + 40));
      glow(ctx, '#ffb347', x, y, 4 + (h >> 5 & 7), .25 + y / V.h * .6);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
})();
