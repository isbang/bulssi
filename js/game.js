'use strict';
(function () {
  const TAU = Math.PI * 2, CELL = 56, GN = 40;
  const BOSS_T = [240, 480, 720], BOSS_HP = [1500, 6500, 22000];
  const ORDER = ['shade', 'runner', 'brute', 'spitter', 'splitter', 'charger', 'wisp'];
  const BOSSES = ['warden', 'weaver', 'maw'];
  const SHRINE_W = [{ k: 'heal', w: 3 }, { k: 'wisdom', w: 3 }, { k: 'gamble', w: 2 }, { k: 'pact', w: 2 }];
  G.RUN_LEN = BOSS_T[2];

  function mulberry(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function shuffle(r, a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function wpick(r, arr) {
    let s = 0; for (const o of arr) s += o.w;
    let x = r() * s;
    for (const o of arr) { x -= o.w; if (x <= 0) return o; }
    return arr[arr.length - 1];
  }
  const ev = (S, k, d) => S.ev.push({ k, d });
  const xpNext = l => Math.floor(4 + l * 4 + l * l * .35);

  G.newRun = function (o) {
    const rng = mulberry(o.seed >>> 0);
    const omen = G.OMENS.find(x => x.id === o.omenId) || G.OMENS[Math.floor(rng() * G.OMENS.length)];
    const d = o.depth || 0;
    const S = {
      t: 0, rng, omen, depth: d, char: G.CHARS.find(c => c.id === o.charId) || G.CHARS[0],
      mod: Object.assign({
        eHp: 1, eCount: 1, eSpeed: 1, eSize: 1, gem: 1, xp: 1, fog: 1, meteors: 0, choices: 0, rerolls: 2,
        pSpeed: 1, dmgDeal: 1, dmgTake: 1, startRelic: 0, eliteRate: 1, noRegen: false, healDrop: 1, twinBoss: false,
      }, omen.mod),
      depthHp: 1 + .25 * d, depthSpd: 1 + .05 * d, depthDmg: 1 + .15 * d,
      p: { x: 0, y: 0, r: 10, hp: 100, level: 1, xp: 0, xpNext: xpNext(1), iframes: 0, still: 0, moving: false },
      st: null, dyn: 1, has: {}, weapons: [], passives: [], relics: [],
      enemies: [], shots: [], bullets: [], gems: [], pickups: [], zones: [], shrines: [], fx: [], texts: [],
      grid: Array.from({ length: GN * GN }, () => []), gx0: 0, gy0: 0,
      kills: 0, dmg: {}, bossKills: 0, curse: 0, rerolls: 0, queue: [], choice: null, over: null, ev: [],
      spawnAcc: 0, nextId: 1, viewR: 480, shake: 0, hurtFlash: 0, freeze: 0,
      tFreeze: 30, tCollect: 20, tMeteor: 4, revived: false, boss: null, finalUp: false,
    };
    S.rerolls = S.mod.rerolls;
    addWeapon(S, o.weapon || S.char.weapon);
    recalc(S);
    S.p.hp = S.st.maxHp;
    plan(S);
    for (let i = 0; i < 6; i++) { const [x, y] = around(S, 260 + rng() * 120); spawn(S, 'shade', x, y); }
    if (S.mod.startRelic) S.queue.push('relic');
    return S;
  };

  function plan(S) {
    const r = S.rng;
    S.waves = [];
    for (let m = 0; m < 30; m++) {
      const avail = shuffle(r, ORDER.filter((_, i) => i <= m));
      const k = m === 0 ? 1 : m < 3 ? 2 : 3;
      S.waves.push(avail.slice(0, k).map((type, i) => ({ type, w: 3 - i })));
    }
    const sc = [];
    for (let t = 70 + r() * 20; t < 700; t += (85 + r() * 30) / S.mod.eliteRate) sc.push({ t, k: 'elite' });
    for (let i = 0; i < 3; i++) sc.push({ t: 120 + r() * 540, k: 'ring' });
    for (let i = 0; i < 5; i++) sc.push({ t: 50 + r() * 620, k: 'rush' });
    for (let t = 40 + r() * 20; t < 700; t += 55 + r() * 30) sc.push({ t, k: 'shrine' });
    const bosses = shuffle(r, BOSSES.slice());
    BOSS_T.forEach((t, i) => sc.push({ t, k: 'boss', i, kind: bosses[i] }));
    S.sched = sc.sort((a, b) => a.t - b.t);
  }

  function around(S, dist) {
    const a = S.rng() * TAU;
    return [S.p.x + Math.cos(a) * dist, S.p.y + Math.sin(a) * dist];
  }

  function recalc(S) {
    const st = { might: 1, cd: 1, area: 1, speed: 1, pickup: 1, maxHp: 100, hpMul: 1, armor: 0, regen: .2, crit: .05, xp: 1, amount: 0, projSpeed: 1, taken: 1 };
    const cm = S.char.mods;
    for (const k in cm) st[k] += cm[k];
    for (const ps of S.passives) G.PASSIVES[ps.id].apply(st, ps.lvl);
    for (const id of S.relics) if (G.RELICS[id].apply) G.RELICS[id].apply(st);
    const m = S.mod;
    st.speed *= m.pSpeed; st.might *= m.dmgDeal; st.taken *= m.dmgTake; st.xp *= m.xp;
    if (m.noRegen) st.regen = 0;
    st.cd = Math.max(.4, st.cd);
    st.maxHp = Math.max(20, Math.round(st.maxHp * st.hpMul));
    const old = S.st ? S.st.maxHp : st.maxHp;
    S.st = st;
    if (st.maxHp > old) S.p.hp += st.maxHp - old;
    S.p.hp = Math.min(S.p.hp, st.maxHp);
  }

  function addWeapon(S, id) { S.weapons.push({ id, lvl: 1, cd: .4, a: 0, orbs: [] }); }

  function addRelic(S, id) {
    S.relics.push(id); S.has[id] = true;
    if (id === 'greed') S.mod.eSpeed *= 1.1;
  }

  function spawn(S, type, x, y) {
    const d = G.ENEMIES[type], m = S.mod, min = S.t / 60;
    const hpS = (1 + .18 * min + .065 * min * min) * m.eHp * S.depthHp * (1 + .12 * S.curse);
    const e = {
      id: S.nextId++, type, x, y, r: d.r * m.eSize, hp: d.hp * hpS, maxHp: 0,
      speed: d.speed * m.eSpeed * S.depthSpd * (1 + .04 * S.curse) * (.9 + S.rng() * .2),
      dmg: d.dmg * (1 + .06 * min) * S.depthDmg, xp: d.xp,
      kx: 0, ky: 0, vx: 0, vy: 0, flash: 0, slow: 0, stun: 0, burn: 0, burnDps: 0,
      t: S.rng() * 10, st: 0, stT: 0, dx: 0, dy: 0, oh: 0, life: 0, bt: 0, bt2: 0,
      elite: false, boss: null, final: false, dead: false,
    };
    e.maxHp = e.hp;
    S.enemies.push(e);
    return e;
  }

  function spawnElite(S, x, y) {
    const type = wpick(S.rng, S.waves[Math.floor(S.t / 60)]).type;
    const e = spawn(S, type, x, y);
    e.elite = true; e.hp = e.maxHp = e.hp * 12; e.r *= 1.7; e.dmg *= 1.5; e.xp *= 10;
    return e;
  }

  function spawnBoss(S, i, kind) {
    const n = S.mod.twinBoss && i < 2 ? 2 : 1;
    for (let j = 0; j < n; j++) {
      const k = j ? BOSSES.find(x => x !== kind) : kind, d = G.ENEMIES[k];
      const [x, y] = around(S, S.viewR + 40);
      const e = spawn(S, k, x, y);
      e.hp = e.maxHp = BOSS_HP[i] * S.mod.eHp * S.depthHp * (n > 1 ? .6 : 1);
      e.dmg = d.dmg * (1 + .3 * i) * S.depthDmg;
      e.speed = d.speed * (1 + .08 * i) * S.depthSpd;
      e.r = d.r * (1 + .12 * i);
      e.boss = k; e.final = i === 2; e.xp = 40 * (i + 1); e.bt = 2; e.bt2 = 5; e.stT = 1.5;
      if (!j) S.boss = e;
    }
    if (i === 2) S.finalUp = true;
    ev(S, 'toast', i === 2 ? '밤의 주인이 나타났다. 쓰러뜨리면 새벽이 온다.' : '우두머리가 나타났다.');
    ev(S, 'sfx', 'boss');
  }

  function doEvent(S, s) {
    const p = S.p, r = S.rng, min = S.t / 60;
    if (s.k === 'elite') {
      const [x, y] = around(S, S.viewR + 30);
      spawnElite(S, x, y);
    } else if (s.k === 'ring') {
      const n = Math.floor(16 + 2 * min), R = Math.min(S.viewR, 380), a0 = r() * TAU;
      for (let i = 0; i < n; i++) {
        const a = a0 + i / n * TAU, e = spawn(S, 'shade', p.x + Math.cos(a) * R, p.y + Math.sin(a) * R);
        e.speed *= .8;
      }
      ev(S, 'toast', '그림자가 사방을 에워싼다.');
    } else if (s.k === 'rush') {
      const a = r() * TAU, cx = Math.cos(a), cy = Math.sin(a), R = S.viewR + 60, n = Math.floor(12 + min);
      for (let i = 0; i < n; i++) {
        const off = (r() - .5) * 160, back = r() * 120;
        const e = spawn(S, 'swarm', p.x + cx * (R + back) - cy * off, p.y + cy * (R + back) + cx * off);
        e.vx = -cx * e.speed; e.vy = -cy * e.speed; e.life = 9;
      }
    } else if (s.k === 'shrine') {
      const [x, y] = around(S, 380 + r() * 200);
      S.shrines.push({ x, y, k: wpick(r, SHRINE_W).k, charge: 0, life: 50, r: 46 });
    } else if (s.k === 'boss') spawnBoss(S, s.i, s.kind);
  }

  function buildGrid(S) {
    const g = S.grid;
    for (let i = 0; i < g.length; i++) g[i].length = 0;
    S.gx0 = S.p.x - GN / 2 * CELL; S.gy0 = S.p.y - GN / 2 * CELL;
    for (const e of S.enemies) {
      if (e.dead) continue;
      const cx = Math.floor((e.x - S.gx0) / CELL), cy = Math.floor((e.y - S.gy0) / CELL);
      if (cx < 0 || cy < 0 || cx >= GN || cy >= GN) continue;
      g[cy * GN + cx].push(e);
    }
    for (let i = 0; i < g.length; i++) {
      const c = g[i];
      for (let a = 0; a < c.length; a++) for (let b = a + 1; b < c.length; b++) {
        const A = c[a], B = c[b], dx = B.x - A.x, dy = B.y - A.y, rr = A.r + B.r, d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 < .01) continue;
        const d = Math.sqrt(d2), push = (rr - d) * .25, nx = dx / d * push, ny = dy / d * push;
        if (!A.boss) { A.x -= nx; A.y -= ny; }
        if (!B.boss) { B.x += nx; B.y += ny; }
      }
    }
  }

  function near(S, x, y, r, cb) {
    const R = r + 50;
    const x0 = Math.max(0, Math.floor((x - R - S.gx0) / CELL)), x1 = Math.min(GN - 1, Math.floor((x + R - S.gx0) / CELL));
    const y0 = Math.max(0, Math.floor((y - R - S.gy0) / CELL)), y1 = Math.min(GN - 1, Math.floor((y + R - S.gy0) / CELL));
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const c = S.grid[cy * GN + cx];
      for (let i = 0; i < c.length; i++) {
        const e = c[i];
        if (e.dead) continue;
        const dx = e.x - x, dy = e.y - y, rr = r + e.r;
        if (dx * dx + dy * dy < rr * rr) cb(e);
      }
    }
  }

  function nearest(S, x, y, maxR, skip) {
    let best = null, bd = maxR * maxR;
    for (const e of S.enemies) {
      if (e.dead || (skip && skip.includes(e))) continue;
      const dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function hurt(S, e, dmg, kb, ax, ay, src) {
    if (e.dead) return;
    let d = dmg * S.dyn;
    const crit = S.rng() < S.st.crit;
    if (crit) d *= 2;
    S.dmg[src] = (S.dmg[src] || 0) + Math.min(d, e.hp);
    e.hp -= d; e.flash = .1;
    if (S.has.frost && S.rng() < .25) e.slow = 2;
    if (kb && !e.boss) {
      const dx = e.x - ax, dy = e.y - ay, l = Math.hypot(dx, dy) || 1, f = kb * (e.elite ? .3 : 1);
      e.kx += dx / l * f; e.ky += dy / l * f;
    }
    if (S.texts.length < 40) S.texts.push({ x: e.x + (S.rng() - .5) * 10, y: e.y - e.r, v: Math.round(d), crit, t: 0 });
    if (e.hp <= 0) kill(S, e);
  }

  function dropGem(S, x, y, v) {
    if (S.gems.length >= 320) S.gems[Math.floor(S.rng() * S.gems.length)].v += v;
    else S.gems.push({ x, y, v, pull: false });
  }

  function burst(S, x, y, color, n) {
    if (S.fx.length > 260) return;
    for (let i = 0; i < n; i++) {
      const a = S.rng() * TAU, sp = 40 + S.rng() * 120;
      S.fx.push({ k: 'p', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, d: .3 + S.rng() * .3, color });
    }
  }

  function kill(S, e) {
    e.dead = true; S.kills++;
    const p = S.p, r = S.rng;
    dropGem(S, e.x, e.y, e.xp * S.mod.gem);
    burst(S, e.x, e.y, G.ENEMIES[e.type].color, e.elite || e.boss ? 14 : 3);
    if (e.type === 'splitter' && !e.elite) for (let i = 0; i < 2; i++) spawn(S, 'mite', e.x + (r() - .5) * 16, e.y + (r() - .5) * 16);
    if (e.elite) S.pickups.push({ k: 'chest', x: e.x, y: e.y });
    if (e.boss) {
      S.bossKills++;
      S.pickups.push({ k: 'chest', x: e.x, y: e.y }, { k: 'heal', x: e.x + 24, y: e.y }, { k: 'magnet', x: e.x - 24, y: e.y });
      S.boss = S.enemies.find(x => x.boss && !x.dead) || null;
      S.shake = .5; ev(S, 'sfx', 'boom');
      if (e.final) { S.over = 'win'; ev(S, 'sfx', 'win'); }
    } else if (r() < .008 * S.mod.healDrop) S.pickups.push({ k: 'heal', x: e.x, y: e.y });
    else if (r() < .002) S.pickups.push({ k: 'magnet', x: e.x, y: e.y });
    if (S.has.hungry) p.hp = Math.min(S.st.maxHp, p.hp + .4);
    if (S.has.blast && r() < .12) S.zones.push({ k: 'blast', x: e.x, y: e.y, r: 62 * S.st.area, dmg: 18 + S.t / 30, delay: .08, src: 'relic' });
  }

  function hitPlayer(S, dmg) {
    const p = S.p;
    if (p.iframes > 0 || S.over) return;
    p.hp -= Math.max(1, dmg * S.st.taken - S.st.armor);
    p.iframes = .45; S.shake = .25; S.hurtFlash = .35;
    ev(S, 'sfx', 'hurt');
    if (S.has.thorns) S.zones.push({ k: 'blast', x: p.x, y: p.y, r: 95, dmg: 25 + S.t / 20, delay: 0, kb: 260, src: 'relic' });
    if (p.hp > 0) return;
    if (S.has.second && !S.revived) {
      S.revived = true; p.hp = S.st.maxHp * .5; p.iframes = 2.5;
      S.zones.push({ k: 'blast', x: p.x, y: p.y, r: 220, dmg: 80 + S.t / 6, delay: 0, kb: 420, src: 'relic' });
      ev(S, 'toast', '두 번째 숨. 다시 타오른다.'); ev(S, 'sfx', 'level');
    } else { p.hp = 0; S.over = 'dead'; ev(S, 'sfx', 'dead'); }
  }

  function bullet(S, x, y, dx, dy, spd, dmg) {
    if (S.bullets.length < 260) S.bullets.push({ x, y, vx: dx * spd, vy: dy * spd, r: 6, dmg, life: 6 });
  }

  function ringShot(S, e, n, spd, off) {
    for (let i = 0; i < n; i++) { const a = off + i / n * TAU; bullet(S, e.x, e.y, Math.cos(a), Math.sin(a), spd, e.dmg * .7); }
    ev(S, 'sfx', 'zap');
  }

  function bossAI(S, e, dt, dx, dy, d, sp) {
    const rage = e.hp < e.maxHp * .5;
    e.bt -= dt;
    if (e.boss === 'warden') {
      e.x += dx * sp * dt; e.y += dy * sp * dt;
      if (e.bt <= 0) { e.bt = rage ? 2.3 : 3.2; ringShot(S, e, rage ? 18 : 13, 125, e.t); }
    } else if (e.boss === 'weaver') {
      if (d > 240) { e.x += dx * sp * dt; e.y += dy * sp * dt; }
      else if (d < 150) { e.x -= dx * sp * .8 * dt; e.y -= dy * sp * .8 * dt; }
      else { e.x -= dy * sp * .8 * dt; e.y += dx * sp * .8 * dt; }
      if (e.bt <= 0) {
        e.bt = rage ? 1.6 : 2.3;
        const n = rage ? 5 : 3, a0 = Math.atan2(dy, dx);
        for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * .22; bullet(S, e.x, e.y, Math.cos(a), Math.sin(a), 175, e.dmg * .7); }
        ev(S, 'sfx', 'zap');
      }
      e.bt2 -= dt;
      if (e.bt2 <= 0) {
        e.bt2 = 7;
        for (let i = 0; i < (rage ? 7 : 5); i++) spawn(S, 'runner', e.x + (S.rng() - .5) * 80, e.y + (S.rng() - .5) * 80);
      }
    } else {
      e.stT -= dt;
      if (e.st === 0) {
        e.x += dx * sp * dt; e.y += dy * sp * dt;
        if (e.stT <= 0) { e.st = 1; e.stT = rage ? .65 : .85; e.dx = dx; e.dy = dy; }
      } else if (e.st === 1) {
        if (e.stT > .3) { e.dx = dx; e.dy = dy; }
        if (e.stT <= 0) { e.st = 2; e.stT = .65; }
      } else {
        e.x += e.dx * 520 * dt; e.y += e.dy * 520 * dt;
        if (e.stT <= 0) { e.st = 0; e.stT = rage ? 1.1 : 1.6; ringShot(S, e, rage ? 16 : 10, 140, e.t); }
      }
    }
  }

  function updEnemies(S, dt) {
    const p = S.p, frozen = S.freeze > 0, far = S.viewR + 520;
    for (const e of S.enemies) {
      if (e.dead) continue;
      e.flash -= dt; e.t += dt;
      if (e.burn > 0) { e.burn -= dt; S.dmg.nova = (S.dmg.nova || 0) + Math.min(e.burnDps * dt, e.hp); e.hp -= e.burnDps * dt; if (e.hp <= 0) { kill(S, e); continue; } }
      let dx = p.x - e.x, dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d; dy /= d;
      if (e.kx || e.ky) {
        e.x += e.kx * dt; e.y += e.ky * dt;
        const f = Math.pow(.01, dt); e.kx *= f; e.ky *= f;
        if (Math.abs(e.kx) + Math.abs(e.ky) < 3) e.kx = e.ky = 0;
      }
      if (e.stun > 0 || frozen) e.stun -= dt;
      else {
        const sp = e.speed * (e.slow > 0 ? .6 : 1);
        e.slow -= dt;
        if (e.boss) bossAI(S, e, dt, dx, dy, d, sp);
        else if (e.type === 'spitter') {
          if (d > 190) { e.x += dx * sp * dt; e.y += dy * sp * dt; }
          else if (d < 140) { e.x -= dx * sp * .6 * dt; e.y -= dy * sp * .6 * dt; }
          e.stT -= dt;
          if (e.stT <= 0 && d < 340) { e.stT = 2.8; bullet(S, e.x, e.y, dx, dy, 120, e.dmg); }
        } else if (e.type === 'swarm') {
          e.x += e.vx * dt; e.y += e.vy * dt; e.life -= dt;
          if (e.life <= 0) e.dead = true;
        } else if (e.type === 'charger') {
          e.stT -= dt;
          if (e.st === 0) {
            e.x += dx * sp * dt; e.y += dy * sp * dt;
            if (d < 210 && e.stT <= 0) { e.st = 1; e.stT = .7; e.dx = dx; e.dy = dy; }
          } else if (e.st === 1) { if (e.stT <= 0) { e.st = 2; e.stT = .45; } }
          else { e.x += e.dx * sp * 4.5 * dt; e.y += e.dy * sp * 4.5 * dt; if (e.stT <= 0) { e.st = 0; e.stT = 1.3; } }
        } else if (e.type === 'wisp') {
          const s = Math.sin(e.t * 3) * .9;
          e.x += (dx - dy * s) * sp * dt; e.y += (dy + dx * s) * sp * dt;
        } else { e.x += dx * sp * dt; e.y += dy * sp * dt; }
      }
      if (d < p.r + e.r - 2) hitPlayer(S, e.dmg);
      if (d > far && !e.boss && e.type !== 'swarm') { const [x, y] = around(S, S.viewR + 60); e.x = x; e.y = y; }
    }
  }

  const FIRE = {
    spark(S, w, L) {
      const p = S.p, t = nearest(S, p.x, p.y, 420);
      if (!t) return false;
      const n = L.n + S.st.amount, a0 = Math.atan2(t.y - p.y, t.x - p.x), sp = 440 * S.st.projSpeed;
      for (let i = 0; i < n; i++) {
        const a = a0 + (i - (n - 1) / 2) * .16;
        S.shots.push({ k: 'spark', x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 5, dmg: L.dmg, pierce: L.pierce, life: 1.1, ex: L.ex, hit: [] });
      }
      ev(S, 'sfx', 'shoot');
    },
    nova(S, w, L) {
      const p = S.p, r = L.rad * S.st.area;
      near(S, p.x, p.y, r, e => {
        hurt(S, e, L.dmg, L.kb, p.x, p.y, 'nova');
        if (L.burn && !e.dead) { e.burn = 3; e.burnDps = L.dmg * .4 * S.dyn; }
      });
      S.fx.push({ k: 'ring', x: p.x, y: p.y, r: r, t: 0, d: .35, color: '#ff9a3c' });
    },
    lance(S, w, L) {
      const p = S.p, len = L.len * S.st.area, t = nearest(S, p.x, p.y, len + 40);
      if (!t) return false;
      const n = L.n + S.st.amount, a0 = Math.atan2(t.y - p.y, t.x - p.x), half = L.wid * S.st.area / 2;
      for (let i = 0; i < n; i++) {
        const a = a0 + i / n * TAU, ux = Math.cos(a), uy = Math.sin(a);
        for (const e of S.enemies) {
          if (e.dead) continue;
          const rx = e.x - p.x, ry = e.y - p.y, along = rx * ux + ry * uy;
          if (along < -e.r || along > len + e.r) continue;
          if (Math.abs(rx * uy - ry * ux) < half + e.r) hurt(S, e, L.dmg, 60, p.x, p.y, 'lance');
        }
        S.fx.push({ k: 'beam', x: p.x, y: p.y, x2: p.x + ux * len, y2: p.y + uy * len, w: half * 2, t: 0, d: .22 });
      }
      ev(S, 'sfx', 'beam');
    },
    mine(S, w, L) {
      const p = S.p, n = L.n + S.st.amount;
      for (let i = 0; i < n; i++) {
        const a = S.rng() * TAU, o = i ? 50 : 0;
        S.zones.push({ k: 'mine', x: p.x + Math.cos(a) * o, y: p.y + Math.sin(a) * o, r: L.rad * S.st.area, dmg: L.dmg, arm: .35, life: 4.5, fire: L.fire, src: 'mine' });
      }
    },
    chain(S, w, L) {
      const p = S.p, used = [];
      for (let b = 0; b < L.bolts + S.st.amount; b++) {
        let cur = nearest(S, p.x, p.y, 280, used);
        if (!cur) break;
        const pts = [p.x, p.y];
        for (let j = 0; j <= L.jumps && cur; j++) {
          used.push(cur); pts.push(cur.x, cur.y);
          if (L.stun) cur.stun = L.stun;
          const from = cur;
          hurt(S, cur, L.dmg, 0, 0, 0, 'chain');
          cur = nearest(S, from.x, from.y, L.range * S.st.area, used);
        }
        S.fx.push({ k: 'bolt', pts, t: 0, d: .18 });
      }
      if (!used.length) return false;
      ev(S, 'sfx', 'zap');
    },
    boomerang(S, w, L) {
      const p = S.p, t = nearest(S, p.x, p.y, 420);
      if (!t) return false;
      const n = L.n + S.st.amount, a0 = Math.atan2(t.y - p.y, t.x - p.x);
      for (let i = 0; i < n; i++) {
        const a = a0 + (i - (n - 1) / 2) * .5;
        S.shots.push({ k: 'boom', x: p.x, y: p.y, dx: Math.cos(a), dy: Math.sin(a), dist: 0, range: L.range * S.st.area, spd: L.spd * S.st.projSpeed, r: L.r * S.st.area, dmg: L.dmg, back: false, hit: [], life: 5, ret2: L.ret2, spin: 0 });
      }
      ev(S, 'sfx', 'shoot');
    },
    rain(S, w, L) {
      const p = S.p, c = S.enemies.filter(e => !e.dead && Math.abs(e.x - p.x) < 380 && Math.abs(e.y - p.y) < 380);
      if (!c.length) return false;
      for (let i = 0; i < L.n + S.st.amount; i++) {
        const t = c[Math.floor(S.rng() * c.length)];
        S.zones.push({ k: 'meteor', x: t.x, y: t.y, r: L.rad * S.st.area, dmg: L.dmg, delay: .5, T: .5, stun: L.stun, src: 'rain' });
      }
    },
  };

  function updWeapons(S, dt) {
    const p = S.p, cdRate = S.has.dash && p.moving ? 1.18 : 1;
    for (const w of S.weapons) {
      const L = G.WEAPONS[w.id].lv[w.lvl - 1];
      if (w.id === 'orbit') {
        w.a += L.spd * dt;
        const n = L.n + S.st.amount, or = 12 * S.st.area;
        w.orbs.length = 0;
        for (let ring = 0; ring < (L.ring2 ? 2 : 1); ring++) {
          const rad = L.rad * S.st.area * (ring ? 1.75 : 1), a0 = ring ? -w.a * .8 : w.a;
          for (let i = 0; i < n; i++) {
            const a = a0 + i / n * TAU, ox = p.x + Math.cos(a) * rad, oy = p.y + Math.sin(a) * rad;
            w.orbs.push(ox, oy);
            near(S, ox, oy, or, e => { if (S.t >= e.oh) { e.oh = S.t + L.tick; hurt(S, e, L.dmg, 70, p.x, p.y, 'orbit'); } });
          }
        }
        continue;
      }
      w.cd -= dt * cdRate;
      if (w.cd <= 0) w.cd = FIRE[w.id](S, w, L) === false ? .15 : L.cd * S.st.cd;
    }
  }

  function updShots(S, dt) {
    const p = S.p;
    for (const s of S.shots) {
      s.life -= dt;
      if (s.life <= 0) { s.dead = true; continue; }
      if (s.k === 'spark') {
        s.x += s.vx * dt; s.y += s.vy * dt;
        near(S, s.x, s.y, s.r, e => {
          if (s.dead || s.hit.includes(e.id)) return;
          s.hit.push(e.id);
          hurt(S, e, s.dmg, 40, s.x - s.vx, s.y - s.vy, 'spark');
          if (s.ex) S.zones.push({ k: 'blast', x: s.x, y: s.y, r: 48 * S.st.area, dmg: s.dmg * .6, delay: 0, src: 'spark' });
          if (s.pierce-- <= 0) s.dead = true;
        });
      } else {
        s.spin += dt * 14;
        if (!s.back) {
          const v = s.spd * (1 - s.dist / s.range * .75) + 50;
          s.x += s.dx * v * dt; s.y += s.dy * v * dt; s.dist += v * dt;
          if (s.dist >= s.range) { s.back = true; s.hit.length = 0; }
        } else {
          const dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy) || 1;
          if (d < 16) { s.dead = true; continue; }
          s.x += dx / d * s.spd * 1.15 * dt; s.y += dy / d * s.spd * 1.15 * dt;
        }
        near(S, s.x, s.y, s.r, e => {
          if (s.hit.includes(e.id)) return;
          s.hit.push(e.id);
          hurt(S, e, s.dmg * (s.back && s.ret2 ? 2 : 1), 50, s.x, s.y, 'boomerang');
        });
      }
    }
  }

  function explode(S, z) {
    near(S, z.x, z.y, z.r, e => {
      if (z.stun) e.stun = z.stun;
      hurt(S, e, z.dmg, z.kb || 110, z.x, z.y, z.src);
    });
    if (z.pd && Math.hypot(S.p.x - z.x, S.p.y - z.y) < z.r + S.p.r) hitPlayer(S, z.pd);
    S.fx.push({ k: 'ring', x: z.x, y: z.y, r: z.r, t: 0, d: .3, color: z.pd ? '#ff5a4a' : '#ffb347', fill: true });
    burst(S, z.x, z.y, '#ffb347', 4);
    if (z.k !== 'blast') ev(S, 'sfx', 'boom');
    if (z.fire) { z.k = 'fire'; z.dur = 2.6; z.tick = 0; z.fire = false; } else z.dead = true;
  }

  function updZones(S, dt) {
    for (let i = 0; i < S.zones.length; i++) {
      const z = S.zones[i];
      if (z.k === 'mine') {
        z.arm -= dt; z.life -= dt;
        if (z.arm > 0) continue;
        let trig = z.life <= 0;
        if (!trig) near(S, z.x, z.y, z.r * .5, () => { trig = true; });
        if (trig) explode(S, z);
      } else if (z.k === 'fire') {
        z.dur -= dt; z.tick -= dt;
        if (z.tick <= 0) { z.tick = .4; near(S, z.x, z.y, z.r, e => hurt(S, e, z.dmg * .2, 0, 0, 0, z.src)); }
        if (z.dur <= 0) z.dead = true;
      } else { z.delay -= dt; if (z.delay <= 0) explode(S, z); }
    }
  }

  function updBullets(S, dt) {
    const p = S.p;
    for (const b of S.bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0) b.dead = true;
      else if (Math.hypot(b.x - p.x, b.y - p.y) < b.r + p.r - 2 && p.iframes <= 0) { b.dead = true; hitPlayer(S, b.dmg); }
    }
  }

  function gainXp(S, v) {
    const p = S.p;
    p.xp += v * S.st.xp;
    while (p.xp >= p.xpNext) { p.xp -= p.xpNext; p.level++; p.xpNext = xpNext(p.level); S.queue.push('level'); }
  }

  function activateShrine(S, s) {
    const p = S.p;
    s.dead = true;
    S.fx.push({ k: 'ring', x: s.x, y: s.y, r: 120, t: 0, d: .5, color: G.SHRINES[s.k].color });
    ev(S, 'sfx', 'chest');
    if (s.k === 'heal') { p.hp = Math.min(S.st.maxHp, p.hp + S.st.maxHp * .5); ev(S, 'toast', '치유의 샘. 체력을 되찾았다.'); }
    else if (s.k === 'wisdom') { gainXp(S, (p.xpNext - p.xp) / S.st.xp + .01); ev(S, 'toast', '지식의 돌. 한 단계 자랐다.'); }
    else if (s.k === 'pact') { S.curse++; S.queue.push('relic'); ev(S, 'toast', '계약이 맺어졌다. 유물을 얻고, 적은 강해진다.'); }
    else if (S.rng() < .6) { S.queue.push('relic'); ev(S, 'toast', '운이 좋았다. 유물을 얻었다.'); }
    else {
      for (let i = 0; i < 2; i++) { const [x, y] = around(S, 240); spawnElite(S, x, y); }
      ev(S, 'toast', '함정이었다. 정예가 나타났다.');
    }
  }

  function updPickups(S, dt) {
    const p = S.p, pr = 55 * S.st.pickup, pr2 = pr * pr;
    for (const g of S.gems) {
      const dx = p.x - g.x, dy = p.y - g.y, d2 = dx * dx + dy * dy;
      if (!g.pull && d2 < pr2) g.pull = true;
      if (!g.pull) continue;
      const d = Math.sqrt(d2) || 1;
      if (d < 16) { g.dead = true; gainXp(S, g.v); ev(S, 'sfx', 'gem'); continue; }
      g.x += dx / d * 560 * dt; g.y += dy / d * 560 * dt;
    }
    for (const k of S.pickups) {
      if (Math.hypot(p.x - k.x, p.y - k.y) > p.r + 18) continue;
      k.dead = true; ev(S, 'sfx', 'chest');
      if (k.k === 'heal') p.hp = Math.min(S.st.maxHp, p.hp + S.st.maxHp * .25);
      else if (k.k === 'magnet') for (const g of S.gems) g.pull = true;
      else S.queue.push('relic');
    }
    for (const s of S.shrines) {
      s.life -= dt;
      if (Math.hypot(p.x - s.x, p.y - s.y) < s.r) s.charge += dt; else s.charge = Math.max(0, s.charge - dt * .5);
      if (s.charge >= 2.2) activateShrine(S, s);
      else if (s.life <= 0) s.dead = true;
    }
  }

  function levelOpts(S) {
    const pool = [];
    for (const id in G.WEAPONS) {
      const d = G.WEAPONS[id], w = S.weapons.find(x => x.id === id);
      if (w) {
        if (w.lvl < 6) pool.push({ w: w.lvl === 5 ? 2.2 : 1.7, kind: 'w', id, icon: d.icon, name: d.name, tag: w.lvl === 5 ? '각성' : 'Lv ' + (w.lvl + 1), desc: d.up[w.lvl], fn: () => { w.lvl++; } });
      } else if (S.weapons.length < 4) pool.push({ w: 1, kind: 'w', id, icon: d.icon, name: d.name, tag: '새 무기', desc: d.desc, fn: () => addWeapon(S, id) });
    }
    for (const id in G.PASSIVES) {
      const d = G.PASSIVES[id], ps = S.passives.find(x => x.id === id);
      if (ps) {
        if (ps.lvl < d.max) pool.push({ w: 1.4, kind: 'p', id, icon: d.icon, name: d.name, tag: 'Lv ' + (ps.lvl + 1), desc: d.desc, fn: () => { ps.lvl++; } });
      } else if (S.passives.length < 5) pool.push({ w: 1, kind: 'p', id, icon: d.icon, name: d.name, tag: '새 능력', desc: d.desc, fn: () => S.passives.push({ id, lvl: 1 }) });
    }
    const out = [], n = 3 + S.mod.choices + (S.has.clover ? 1 : 0);
    while (out.length < n && pool.length) { const o = wpick(S.rng, pool); pool.splice(pool.indexOf(o), 1); out.push(o); }
    if (!out.length) out.push(healOpt(S));
    return out;
  }

  const healOpt = S => ({ kind: 'h', id: 'rest', icon: '쉼', name: '숨 고르기', tag: '회복', desc: '체력을 30% 회복한다', fn: () => { S.p.hp = Math.min(S.st.maxHp, S.p.hp + S.st.maxHp * .3); } });

  function openChoice(S, kind) {
    if (kind === 'level') S.choice = { kind, title: '레벨 ' + S.p.level, opts: levelOpts(S) };
    else {
      const ids = shuffle(S.rng, Object.keys(G.RELICS).filter(id => !S.has[id])).slice(0, 3);
      const opts = ids.map(id => { const d = G.RELICS[id]; return { kind: 'r', id, icon: d.icon, name: d.name, tag: '유물', desc: d.desc, fn: () => addRelic(S, id) }; });
      if (!opts.length) opts.push(healOpt(S));
      S.choice = { kind, title: '유물을 주웠다', opts };
    }
    ev(S, 'sfx', kind === 'level' ? 'level' : 'chest');
  }

  G.choose = function (S, i) {
    if (!S.choice) return;
    S.choice.opts[i].fn();
    S.choice = null;
    recalc(S);
  };

  G.reroll = function (S) {
    if (!S.choice || S.choice.kind !== 'level' || S.rerolls <= 0) return false;
    S.rerolls--; S.choice.opts = levelOpts(S);
    return true;
  };

  G.update = function (S, dt, inp) {
    if (S.over || S.choice) return;
    if (S.queue.length) { openChoice(S, S.queue.shift()); return; }
    S.t += dt;
    const p = S.p, st = S.st, min = S.t / 60;

    let mx = inp.x, my = inp.y;
    const ml = Math.hypot(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; }
    p.x += mx * 150 * st.speed * dt; p.y += my * 150 * st.speed * dt;
    p.moving = ml > .15;
    p.still = p.moving ? 0 : p.still + dt;
    p.iframes -= dt; S.shake -= dt; S.hurtFlash -= dt; S.freeze -= dt;
    p.hp = Math.min(st.maxHp, p.hp + st.regen * dt);
    S.dyn = st.might * (S.has.still && p.still > .8 ? 1.3 : 1) * (S.has.rage ? 1 + .6 * (1 - p.hp / st.maxHp) : 1);

    if (S.has.time && (S.tFreeze -= dt) <= 0) { S.tFreeze = 30; S.freeze = 3; ev(S, 'sfx', 'freeze'); }
    if (S.has.collector && (S.tCollect -= dt) <= 0) { S.tCollect = 20; for (const g of S.gems) g.pull = true; }
    if (S.mod.meteors && (S.tMeteor -= dt) <= 0) {
      S.tMeteor = Math.max(.7, 2.4 - min * .12);
      const a = S.rng() * TAU, r = S.rng() * 300;
      S.zones.push({ k: 'omen', x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, r: 70, dmg: 40 + min * 12, pd: 14 + min, delay: 1.3, T: 1.3, src: 'omen' });
    }

    while (S.sched.length && S.sched[0].t <= S.t) doEvent(S, S.sched.shift());

    const alive = S.enemies.length;
    let rate = Math.min(15, (1.1 + .95 * min) * S.mod.eCount) * (S.finalUp ? .6 : 1);
    if (alive < 8 + 5 * min) rate *= 2;
    if (alive < 230) {
      S.spawnAcc += rate * dt;
      const wave = S.waves[Math.min(S.waves.length - 1, Math.floor(min))];
      while (S.spawnAcc > 0) {
        const type = wpick(S.rng, wave).type, [x, y] = around(S, S.viewR + 20 + S.rng() * 60);
        S.spawnAcc -= G.ENEMIES[type].cost;
        spawn(S, type, x, y);
      }
    }

    updEnemies(S, dt);
    buildGrid(S);
    updWeapons(S, dt);
    updShots(S, dt);
    updZones(S, dt);
    updBullets(S, dt);
    updPickups(S, dt);

    for (const f of S.fx) { f.t += dt; if (f.k === 'p') { f.x += f.vx * dt; f.y += f.vy * dt; } if (f.t >= f.d) f.dead = true; }
    for (const t of S.texts) { t.t += dt; t.y -= 30 * dt; if (t.t > .6) t.dead = true; }

    const alv = o => !o.dead;
    S.enemies = S.enemies.filter(alv); S.shots = S.shots.filter(alv); S.bullets = S.bullets.filter(alv);
    S.gems = S.gems.filter(alv); S.pickups = S.pickups.filter(alv); S.zones = S.zones.filter(alv);
    S.shrines = S.shrines.filter(alv); S.fx = S.fx.filter(alv); S.texts = S.texts.filter(alv);
  };

  G.bot = function (S) {
    const p = S.p;
    let fx = 0, fy = 0;
    for (const e of S.enemies) {
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1, R = (S.botR || 150) + (e.boss ? 110 : 0);
      if (d >= R) continue;
      const w = Math.pow((R - d) / R, 2) * (e.boss ? 4 : 1);
      fx -= dx / d * w; fy -= dy / d * w;
    }
    for (const b of S.bullets) {
      const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (d < 90) { const w = Math.pow((90 - d) / 90, 2) * 3; fx -= dx / d * w; fy -= dy / d * w; }
    }
    let best = null, bd = 320;
    for (const g of S.gems) { const d = Math.hypot(g.x - p.x, g.y - p.y); if (d < bd) { bd = d; best = g; } }
    if (best) { fx += (best.x - p.x) / bd * .35; fy += (best.y - p.y) / bd * .35; }
    for (const k of S.pickups.concat(S.shrines)) {
      const dx = k.x - p.x, dy = k.y - p.y, d = Math.hypot(dx, dy) || 1;
      fx += dx / d * .5; fy += dy / d * .5;
    }
    fx += Math.cos(S.t * .25) * .05; fy += Math.sin(S.t * .25) * .05;
    const l = Math.hypot(fx, fy);
    return l > .01 ? { x: fx / l, y: fy / l } : { x: 0, y: 0 };
  };
})();
