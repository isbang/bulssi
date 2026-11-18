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
    const p = S.p, groups = {}, vis = [];
    for (const e of S.enemies) {
      const m = e.r * 2.4;
      if (Math.abs(e.x - cx) > hw + m || Math.abs(e.y - cy) > hh + m) continue;
      const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
      e.lx = dx / d; e.ly = dy / d;
      if (e.type === 'swarm') { const v = Math.hypot(e.vx, e.vy) || 1; e.ux = e.vx / v; e.uy = e.vy / v; }
      else if ((e.type === 'charger' || e.boss === 'maw') && e.st > 0) { e.ux = e.dx; e.uy = e.dy; }
      else { e.ux = e.lx; e.uy = e.ly; }
      vis.push(e);
      (groups[e.type] || (groups[e.type] = [])).push(e);
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const e of vis) {
      if (!((e.type === 'charger' || e.boss === 'maw') && e.st === 1)) continue;
      const len = e.boss ? 340 : 190;
      ctx.strokeStyle = 'rgba(226,96,122,.35)'; ctx.lineWidth = e.r * 1.6;
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + e.dx * len, e.y + e.dy * len); ctx.stroke();
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

  function zones(ctx, S, time) {
    for (const z of S.zones) {
      if (z.k === 'mine') {
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, '#ff7a2a', z.x, z.y, 14 + Math.sin(time * 10) * 3, .9);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffd9a0'; ctx.beginPath(); ctx.arc(z.x, z.y, 3, 0, TAU); ctx.fill();
      } else if (z.k === 'fire') {
        ctx.globalAlpha = .22 + Math.sin(time * 14 + z.x) * .06;
        ctx.fillStyle = '#ff7a2a'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      } else if (z.T) {
        const k = 1 - Math.max(0, z.delay) / z.T, col = z.pd ? '255,80,70' : '255,200,120';
        ctx.fillStyle = `rgba(${col},${z.pd ? .2 : .12})`; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * k, 0, TAU); ctx.fill();
        ctx.strokeStyle = `rgba(${col},.7)`; ctx.lineWidth = z.pd ? 2 : 1;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.stroke();
        const h = (1 - k) * 260;
        ctx.strokeStyle = `rgba(${col},.9)`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(z.x + h * .3, z.y - h); ctx.lineTo(z.x + h * .3 + 6, z.y - h - 20); ctx.stroke();
      }
    }
  }

  function effects(ctx, S) {
    ctx.globalCompositeOperation = 'lighter';
    for (const f of S.fx) {
      const k = f.t / f.d;
      ctx.globalAlpha = 1 - k;
      if (f.k === 'p') { ctx.fillStyle = f.color; ctx.fillRect(f.x - 1.5, f.y - 1.5, 3, 3); }
      else if (f.k === 'ring') {
        const r = f.r * (.35 + .65 * Math.sqrt(k));
        if (f.fill) { ctx.globalAlpha = (1 - k) * .35; ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1 - k; }
        ctx.strokeStyle = f.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, TAU); ctx.stroke();
      } else if (f.k === 'beam') {
        ctx.strokeStyle = '#fff0b0'; ctx.lineWidth = f.w * (1 - k * .6); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke();
      } else {
        ctx.strokeStyle = '#b8e4ff'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(f.pts[0], f.pts[1]);
        for (let i = 2; i < f.pts.length; i += 2) {
          const mx = (f.pts[i - 2] + f.pts[i]) / 2 + ((hash(i, f.pts[i] | 0) & 31) - 16), my = (f.pts[i - 1] + f.pts[i + 1]) / 2 + ((hash(f.pts[i + 1] | 0, i) & 31) - 16);
          ctx.lineTo(mx, my); ctx.lineTo(f.pts[i], f.pts[i + 1]);
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  function indicator(ctx, V, sx, sy, glyph, color) {
    const m = 26, top = 92;
    if (sx > m && sx < V.w - m && sy > top && sy < V.h - m) return;
    const x = Math.max(m, Math.min(V.w - m, sx)), y = Math.max(top, Math.min(V.h - m, sy));
    ctx.fillStyle = '#0d1020'; ctx.fillRect(x - 15, y - 15, 30, 30);
    if (glyph) seal(ctx, x, y, 24, glyph, color); else pickup(ctx, 'chest', x, y);
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

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const s of S.shrines) {
      const d = G.SHRINES[s.k];
      ctx.globalAlpha = Math.min(1, s.life / 3);
      ctx.fillStyle = d.color + '22'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = d.color; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      if (s.charge > 0) { ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, -TAU / 4, -TAU / 4 + TAU * s.charge / 2.2); ctx.stroke(); }
      seal(ctx, s.x, s.y, 26, d.icon, d.color);
      ctx.font = '11px ' + BODY; ctx.fillStyle = d.color; ctx.fillText(d.name, s.x, s.y + s.r + 12);
      ctx.globalAlpha = 1;
    }

    zones(ctx, S, time);

    for (const tier of [[0, 3, '#5ad0ff', 3.2], [3, 10, '#7dffa0', 4.4], [10, 1e9, '#ffd75a', 6]]) {
      ctx.fillStyle = tier[2]; ctx.beginPath();
      const r = tier[3];
      for (const g of S.gems) {
        if (g.v < tier[0] || g.v >= tier[1] || Math.abs(g.x - cx) > hw + 8 || Math.abs(g.y - cy) > hh + 8) continue;
        ctx.moveTo(g.x, g.y - r); ctx.lineTo(g.x + r * .75, g.y); ctx.lineTo(g.x, g.y + r); ctx.lineTo(g.x - r * .75, g.y);
      }
      ctx.fill();
    }

    for (const k of S.pickups) {
      const bob = Math.sin(time * 4 + k.x) * 3;
      ctx.globalCompositeOperation = 'lighter'; glow(ctx, k.k === 'chest' ? '#e3ba52' : k.k === 'heal' ? '#e2607a' : '#6cb6e6', k.x, k.y, 24, .5);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      pickup(ctx, k.k, k.x, k.y + bob);
    }

    enemies(ctx, S, cx, cy, hw, hh, time);

    ctx.globalCompositeOperation = 'lighter';
    for (const s of S.shots) glow(ctx, s.k === 'spark' ? '#ff9a3c' : '#5a86c8', s.x, s.y, s.k === 'spark' ? 15 : s.r * 2, .9);
    for (const w of S.weapons) for (let i = 0; i < w.orbs.length; i += 2) glow(ctx, '#ffd27a', w.orbs[i], w.orbs[i + 1], 22 * S.st.area, 1);
    glow(ctx, look.glow, p.x, p.y, 52 + Math.sin(time * 7) * 4, .6);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;

    for (const s of S.shots) {
      if (s.k === 'spark') { ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, TAU); ctx.fill(); }
      else { ctx.strokeStyle = '#eaf3ff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * .8, s.spin, s.spin + 3.4); ctx.stroke(); }
    }
    ctx.fillStyle = '#fff3c4';
    for (const w of S.weapons) for (let i = 0; i < w.orbs.length; i += 2) { ctx.beginPath(); ctx.arc(w.orbs[i], w.orbs[i + 1], 5 * S.st.area, 0, TAU); ctx.fill(); }

    if (p.iframes <= 0 || Math.floor(time * 20) % 2) look.draw(ctx, p.x, p.y, time);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(p.x - 18, p.y + 16, 36, 5);
    ctx.fillStyle = p.hp / S.st.maxHp < .3 ? '#ff4a4a' : '#6fe07a'; ctx.fillRect(p.x - 17, p.y + 17, 34 * Math.max(0, p.hp / S.st.maxHp), 3);

    for (const b of S.bullets) {
      ctx.globalCompositeOperation = 'lighter'; glow(ctx, '#ff3a6a', b.x, b.y, 16, .9);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#ffd0dc'; ctx.beginPath();
    for (const b of S.bullets) { ctx.moveTo(b.x + 4.5, b.y); ctx.arc(b.x, b.y, 4.5, 0, TAU); }
    ctx.fill();

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
    for (const s of S.shrines) { const [x, y] = toScreen(s.x, s.y); indicator(ctx, V, x, y, G.SHRINES[s.k].icon, G.SHRINES[s.k].color); }
    for (const k of S.pickups) if (k.k === 'chest') { const [x, y] = toScreen(k.x, k.y); indicator(ctx, V, x, y, null, '#e3ba52'); }

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
