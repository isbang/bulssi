'use strict';
(function () {
  const TAU = Math.PI * 2;
  const glows = {};

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

  function enemies(ctx, S, cx, cy, hw, hh) {
    const p = S.p, groups = {}, vis = [];
    for (const e of S.enemies) {
      if (Math.abs(e.x - cx) > hw + e.r || Math.abs(e.y - cy) > hh + e.r) continue;
      vis.push(e);
      (groups[e.type] || (groups[e.type] = [])).push(e);
    }
    ctx.lineCap = 'round';
    for (const e of vis) {
      const wind = (e.type === 'charger' || e.boss === 'maw') && e.st === 1;
      if (!wind) continue;
      const len = e.boss ? 340 : 190;
      ctx.strokeStyle = 'rgba(255,80,60,.35)'; ctx.lineWidth = e.r * 1.6;
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + e.dx * len, e.y + e.dy * len); ctx.stroke();
    }
    for (const type in groups) {
      ctx.fillStyle = G.ENEMIES[type].color;
      ctx.beginPath();
      for (const e of groups[type]) { ctx.moveTo(e.x + e.r, e.y); ctx.arc(e.x, e.y, e.r, 0, TAU); }
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    for (const e of vis) if (e.flash > 0) { ctx.moveTo(e.x + e.r, e.y); ctx.arc(e.x, e.y, e.r, 0, TAU); }
    ctx.fill();
    ctx.fillStyle = S.freeze > 0 ? '#9fd8ff' : '#fff6d8';
    ctx.beginPath();
    for (const e of vis) {
      const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, er = Math.max(1.3, e.r * .17);
      for (const s of [-1, 1]) {
        const x = e.x + ux * e.r * .4 - uy * e.r * .36 * s, y = e.y + uy * e.r * .4 + ux * e.r * .36 * s;
        ctx.moveTo(x + er, y); ctx.arc(x, y, er, 0, TAU);
      }
    }
    ctx.fill();
    ctx.lineWidth = 2;
    for (const e of vis) {
      if (!e.elite && !e.boss) continue;
      ctx.strokeStyle = e.boss ? '#ff5a7a' : '#ffd75a';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 3, 0, TAU); ctx.stroke();
      if (e.elite) {
        ctx.fillStyle = '#000a'; ctx.fillRect(e.x - 16, e.y - e.r - 10, 32, 4);
        ctx.fillStyle = '#ffd75a'; ctx.fillRect(e.x - 16, e.y - e.r - 10, 32 * Math.max(0, e.hp / e.maxHp), 4);
      }
    }
  }

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

  function indicator(ctx, V, sx, sy, icon, color) {
    const m = 30, top = 86;
    if (sx > m && sx < V.w - m && sy > top && sy < V.h - m) return;
    const x = Math.max(m, Math.min(V.w - m, sx)), y = Math.max(top, Math.min(V.h - m, sy));
    ctx.fillStyle = 'rgba(10,12,28,.8)'; ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 17, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(icon, x, y + 1);
  }

  G.render = function (ctx, S, V) {
    const p = S.p, time = V.time, sc = V.scale;
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
      ctx.font = '24px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(d.icon, s.x, s.y);
      ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = d.color; ctx.fillText(d.name, s.x, s.y + s.r + 12);
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

    ctx.font = '20px sans-serif'; ctx.fillStyle = '#fff';
    for (const k of S.pickups) {
      const bob = Math.sin(time * 4 + k.x) * 3;
      ctx.globalCompositeOperation = 'lighter'; glow(ctx, k.k === 'chest' ? '#ffd75a' : '#ff7a9a', k.x, k.y, 26, .6);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.fillText(k.k === 'chest' ? '🎁' : k.k === 'heal' ? '❤️' : '🧲', k.x, k.y + bob);
    }

    enemies(ctx, S, cx, cy, hw, hh);

    ctx.globalCompositeOperation = 'lighter';
    for (const s of S.shots) glow(ctx, s.k === 'spark' ? '#ff9a3c' : '#5a86c8', s.x, s.y, s.k === 'spark' ? 15 : s.r * 2, .9);
    for (const w of S.weapons) for (let i = 0; i < w.orbs.length; i += 2) glow(ctx, '#ffd27a', w.orbs[i], w.orbs[i + 1], 22 * S.st.area, 1);
    glow(ctx, '#ff8a2a', p.x, p.y, 52 + Math.sin(time * 7) * 4, .6);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;

    for (const s of S.shots) {
      if (s.k === 'spark') { ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, TAU); ctx.fill(); }
      else { ctx.strokeStyle = '#eaf3ff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * .8, s.spin, s.spin + 3.4); ctx.stroke(); }
    }
    ctx.fillStyle = '#fff3c4';
    for (const w of S.weapons) for (let i = 0; i < w.orbs.length; i += 2) { ctx.beginPath(); ctx.arc(w.orbs[i], w.orbs[i + 1], 5 * S.st.area, 0, TAU); ctx.fill(); }

    if (p.iframes <= 0 || Math.floor(time * 20) % 2) {
      const fl = Math.sin(time * 13) * 2.5, sway = Math.sin(time * 5) * 3;
      ctx.fillStyle = '#ff7a1a';
      ctx.beginPath(); ctx.moveTo(p.x - 8, p.y - 2); ctx.quadraticCurveTo(p.x + sway, p.y - 27 - fl, p.x + 8, p.y - 2); ctx.fill();
      ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(p.x, p.y + 1, 5, 0, TAU); ctx.fill();
    }
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

    for (const t of S.texts) {
      ctx.globalAlpha = 1 - t.t / .6;
      ctx.font = t.crit ? 'bold 15px sans-serif' : 'bold 11px sans-serif';
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
    for (const k of S.pickups) if (k.k === 'chest') { const [x, y] = toScreen(k.x, k.y); indicator(ctx, V, x, y, '🎁', '#ffd75a'); }

    const j = V.joy;
    if (j) {
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(j.ox, j.oy, 48, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.arc(j.x, j.y, 20, 0, TAU); ctx.fill();
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
