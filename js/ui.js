'use strict';
(function () {
  const $ = id => document.getElementById(id);
  const cv = $('cv'), ctx = cv.getContext('2d');
  const V = { w: 0, h: 0, dpr: 1, scale: 1, joy: null, time: 0 };
  const qs = new URLSearchParams(location.search);
  const BOT = qs.has('bot'), SPEED = +qs.get('speed') || 1;
  const SAVE_KEY = 'bulssi-save-v1';
  const MAX_DEPTH = 5;

  let save = { runs: 0, wins: 0, bestTime: 0, kills: 0, bossKills: 0, maxDepth: 0, sound: true, char: 'ember', depth: 0 };
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) { /* 저장소를 못 쓰는 환경에서는 기록 없이 진행 */ }
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* 위와 동일 */ } };

  let S = null, mode = 'menu', paused = false, choiceOpen = false, last = 0, toastT = 0;
  const keys = {}, hudCache = {};
  const fmt = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  const unlocked = c => !c.unlock || save[c.unlock.key] >= c.unlock.val;
  const show = (id, on) => $(id).classList.toggle('hidden', !on);
  // 그림이 없는 환경(단일 파일 빌드 등)에서는 글자 도장으로 되돌아간다.
  const seal = (glyph, kind, cls, id) => id
    ? `<span class="seal art ${cls || ''}"><img src="assets/icons/${kind}-${id}.png" alt="" onerror="this.parentNode.className='seal ${kind} ${cls || ''}';this.replaceWith('${glyph}')"></span>`
    : `<span class="seal ${kind} ${cls || ''}">${glyph}</span>`;

  // ── 소리 ──
  let ac = null;
  const sfxLast = {};
  let gemPitch = 0;
  function tone(f, d, type, vol, slide, delay) {
    const t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + .02);
  }
  const SFX = {
    shoot: [.09, () => tone(520, .06, 'triangle', .025, -200)],
    beam: [.1, () => tone(880, .14, 'sawtooth', .03, -500)],
    zap: [.1, () => tone(1200, .09, 'square', .025, -900)],
    gem: [.04, () => { gemPitch = Math.min(12, gemPitch + 1); tone(660 * Math.pow(1.04, gemPitch), .07, 'sine', .05); }],
    boom: [.09, () => tone(110, .22, 'sawtooth', .07, -70)],
    hurt: [.2, () => { tone(160, .2, 'square', .09, -90); if (navigator.vibrate) navigator.vibrate(40); }],
    level: [.2, () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .16, 'triangle', .08, 0, i * .07))],
    chest: [.2, () => [784, 988, 1319].forEach((f, i) => tone(f, .14, 'sine', .08, 0, i * .06))],
    boss: [1, () => { tone(70, 1.2, 'sawtooth', .12, -20); tone(74, 1.2, 'sawtooth', .1, -20); }],
    freeze: [.5, () => tone(1500, .5, 'sine', .05, -1000)],
    win: [1, () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .4, 'triangle', .1, 0, i * .12))],
    dead: [1, () => [392, 330, 262, 196].forEach((f, i) => tone(f, .35, 'triangle', .1, 0, i * .16))],
  };
  function sfx(n) {
    if (!save.sound || !ac || !SFX[n]) return;
    if (V.time - (sfxLast[n] || -9) < SFX[n][0]) return;
    sfxLast[n] = V.time;
    SFX[n][1]();
  }
  function initAudio() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ac = new AC();
  }
  function soundLabel() { $('soundBtn').textContent = $('pauseSoundBtn').textContent = save.sound ? '소리 켜짐' : '소리 꺼짐'; }
  function toggleSound() { save.sound = !save.sound; persist(); soundLabel(); initAudio(); }

  // ── 화면 크기·입력 ──
  function resize() {
    V.dpr = Math.min(2, window.devicePixelRatio || 1); V.w = cv.clientWidth || window.innerWidth; V.h = cv.clientHeight || window.innerHeight;
    const rect = cv.getBoundingClientRect(); V.ox = rect.left; V.oy = rect.top;
    cv.width = Math.round(V.w * V.dpr); cv.height = Math.round(V.h * V.dpr);
    V.scale = Math.sqrt(V.w * V.h) / 560;
    if (S) S.viewR = Math.hypot(V.w, V.h) / 2 / V.scale + 30;
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));

  cv.addEventListener('pointerdown', e => {
    if (mode !== 'play' || V.joy) return;
    const x = e.clientX - V.ox, y = e.clientY - V.oy;
    V.joy = { id: e.pointerId, ox: x, oy: y, x, y };
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 포인터가 이미 해제된 경우 무시 */ }
  });
  cv.addEventListener('pointermove', e => {
    const j = V.joy;
    if (!j || j.id !== e.pointerId) return;
    j.x = e.clientX - V.ox; j.y = e.clientY - V.oy;
  });
  const release = e => { if (V.joy && V.joy.id === e.pointerId) V.joy = null; };
  cv.addEventListener('pointerup', release);
  cv.addEventListener('pointercancel', release);
  window.addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'Escape' && mode === 'play') paused ? resume() : pause(); });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  function readInput() {
    const j = V.joy;
    if (j) { if (Math.abs(j.x - j.ox) > 6) V.faceLeft = j.x < j.ox; return { x: (j.x - j.ox) / 48, y: (j.y - j.oy) / 48 }; }
    if (keys.KeyA || keys.ArrowLeft) V.faceLeft = true; else if (keys.KeyD || keys.ArrowRight) V.faceLeft = false;
    return {
      x: (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0),
      y: (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0),
    };
  }

  // ── 처음 화면 ──
  function renderMenu() {
    const box = $('chars');
    box.innerHTML = '';
    for (const c of G.CHARS) {
      const b = document.createElement('button'), ok = unlocked(c);
      b.className = 'char' + (c.id === save.char ? ' sel' : '') + (ok ? '' : ' locked');
      b.innerHTML = `<img src="assets/chars/${c.id}.png" alt="">${c.name}`;
      b.onclick = () => { save.char = c.id; renderMenu(); };
      box.appendChild(b);
    }
    const c = G.CHARS.find(x => x.id === save.char) || G.CHARS[0], ok = unlocked(c), w = G.WEAPONS[c.weapon];
    $('charInfo').innerHTML = ok
      ? `<img src="assets/chars/${c.id}.png" alt=""><div><h3>${c.name}</h3><p>${c.desc}</p><p class="wp">${seal(w.icon, 'w', 'sm', c.weapon)}<span><b>${w.name}</b>${w.desc}</span></p></div>`
      : `<img class="locked" src="assets/chars/${c.id}.png" alt=""><div><h3>${c.name}</h3><p>아직 잠겨 있다. ${c.unlock.text}.</p></div>`;
    $('startBtn').disabled = !ok;
    show('depthRow', save.maxDepth > 0);
    save.depth = Math.min(save.depth, save.maxDepth);
    $('depthLabel').textContent = save.depth ? `밤의 깊이 ${save.depth} · 적이 더 강하다` : '밤의 깊이 0';
    $('records').innerHTML = `<div><dt>최장 기록</dt><dd>${fmt(save.bestTime)}</dd></div><div><dt>맞은 새벽</dt><dd>${save.wins}</dd></div><div><dt>지샌 밤</dt><dd>${save.runs}</dd></div>`;
    soundLabel();
  }
  $('depthDown').onclick = () => { save.depth = Math.max(0, save.depth - 1); renderMenu(); };
  $('depthUp').onclick = () => { save.depth = Math.min(save.maxDepth, save.depth + 1); renderMenu(); };
  $('soundBtn').onclick = toggleSound;
  $('pauseSoundBtn').onclick = toggleSound;

  function toMenu() {
    mode = 'menu'; S = null; paused = false; choiceOpen = false;
    for (const id of ['hud', 'choice', 'pause', 'over']) show(id, false);
    show('menu', true);
    renderMenu();
  }

  function startRun() {
    initAudio(); persist();
    S = G.newRun({ charId: save.char, depth: save.depth, seed: (Date.now() ^ Math.random() * 1e9) >>> 0, omenId: qs.get('omen') });
    mode = 'play'; paused = false; choiceOpen = false; V.joy = null;
    for (const k in hudCache) delete hudCache[k];
    resize();
    for (const id of ['menu', 'choice', 'pause', 'over']) show(id, false);
    show('hud', true);
    toast(`<small>오늘 밤의 징조</small><b>${S.omen.name}</b>${S.omen.desc}`, 5);
  }
  $('startBtn').onclick = startRun;
  $('retryBtn').onclick = startRun;
  $('menuBtn').onclick = toMenu;

  // ── 플레이 중 표시 ──
  function toast(html, sec) { const t = $('toast'); t.innerHTML = html; t.classList.add('show'); toastT = sec || 3; }

  function set(key, val, fn) { if (hudCache[key] !== val) { hudCache[key] = val; fn(val); } }
  function hud() {
    const p = S.p;
    set('xp', Math.round(p.xp / p.xpNext * 200), v => { $('xpbar').firstElementChild.style.width = v / 2 + '%'; });
    set('lvl', p.level, v => { $('lvl').textContent = '레벨 ' + v; });
    set('kills', S.kills, v => { $('kills').textContent = '처치 ' + v; });
    const left = Math.max(0, Math.ceil(G.RUN_LEN - S.t));
    set('timer', S.finalUp ? -1 : left, v => { $('timer').innerHTML = v < 0 ? '<small>쓰러뜨리면 새벽</small>밤의 주인' : '<small>새벽까지</small>' + fmt(v); });
    const b = S.boss;
    set('boss', b ? b.id : 0, v => { show('bossbar', !!v); if (b) $('bossbar').firstElementChild.textContent = G.ENEMIES[b.type].name; });
    if (b) set('bosshp', Math.round(b.hp / b.maxHp * 200), v => { $('bossbar').querySelector('i').style.width = Math.max(0, v / 2) + '%'; });
  }

  function showChoice() {
    const ch = S.choice;
    choiceOpen = true; V.joy = null; gemPitch = 0;
    $('choiceTitle').textContent = ch.title;
    const box = $('cards');
    box.innerHTML = '';
    ch.opts.forEach((o, i) => {
      const b = document.createElement('button');
      const cls = o.tag === '각성' ? 'awk' : o.tag === '유물' ? 'relic' : o.tag.startsWith('새') ? 'new' : '';
      b.className = 'card';
      b.innerHTML = `${seal(o.icon, o.kind, '', o.id)}<div><div class="nm">${o.name}<span class="tag ${cls}">${o.tag}</span></div><div class="ds">${o.desc}</div></div>`;
      b.onclick = () => { G.choose(S, i); choiceOpen = false; show('choice', false); };
      box.appendChild(b);
    });
    // 조이스틱을 끌던 손가락이 그대로 카드를 눌러 버리지 않도록 잠깐 입력을 막는다.
    box.classList.add('locked');
    setTimeout(() => box.classList.remove('locked'), 450);
    const rr = $('rerollBtn');
    show('rerollBtn', ch.kind === 'level' && S.rerolls > 0);
    rr.textContent = `다시 뽑기 · ${S.rerolls}번 남음`;
    show('choice', true);
  }
  $('rerollBtn').onclick = () => { if (G.reroll(S)) showChoice(); };

  function buildHtml() {
    const pips = (n, max) => `<span class="pips${n >= max ? ' max' : ''}">${'<i class="on"></i>'.repeat(n)}${'<i></i>'.repeat(max - n)}</span>`;
    const row = (kind, id, d, tail) => `<div class="row">${seal(d.icon, kind, '', id)}<span class="nm">${d.name}</span>${tail}</div>`;
    const ws = S.weapons.map(w => row('w', w.id, G.WEAPONS[w.id], pips(w.lvl, 6))).join('');
    const ps = S.passives.map(x => row('p', x.id, G.PASSIVES[x.id], pips(x.lvl, G.PASSIVES[x.id].max))).join('');
    const rs = S.relics.map(id => row('r', id, G.RELICS[id], '')).join('');
    const left = S.finalUp ? '밤의 주인과 대치 중' : `새벽까지 ${fmt(Math.max(0, G.RUN_LEN - S.t))}`;
    return `<div class="sheet">
      <div class="sheet-head"><h2>잠시 멈춤</h2><span>${left}</span></div>
      <p class="stats"><span>레벨 ${S.p.level}</span><span>처치 ${S.kills}</span><span>체력 ${Math.ceil(S.p.hp)}/${S.st.maxHp}</span></p>
      <p class="omen"><b>${S.omen.name}</b>${S.omen.desc}</p>
      <hr><div class="label">무기</div><div class="rows">${ws}</div>
      ${ps ? `<hr><div class="label">능력</div><div class="rows">${ps}</div>` : ''}
      ${rs ? `<hr><div class="label">유물</div><div class="rows two">${rs}</div>` : ''}
    </div>`;
  }

  function pause() {
    if (mode !== 'play' || paused || S.over) return;
    paused = true; V.joy = null;
    $('pauseBody').innerHTML = buildHtml();
    show('pause', true);
  }
  function resume() { paused = false; show('pause', false); }
  $('pauseBtn').onclick = pause;
  $('resumeBtn').onclick = resume;
  $('quitBtn').onclick = () => { resume(); S.over = 'dead'; endRun(); };

  function endRun() {
    const before = G.CHARS.filter(unlocked).map(c => c.id), win = S.over === 'win';
    save.runs++; save.kills += S.kills; save.bossKills += S.bossKills;
    save.bestTime = Math.max(save.bestTime, Math.floor(S.t));
    let depthUp = false;
    if (win) { save.wins++; if (S.depth === save.maxDepth && save.maxDepth < MAX_DEPTH) { save.maxDepth++; depthUp = true; } }
    persist();
    const fresh = G.CHARS.filter(c => unlocked(c) && !before.includes(c.id));
    $('overTitle').textContent = win ? '새벽이 왔다' : '불이 꺼졌다';
    $('overSub').textContent = win ? `${S.omen.name}. 긴 밤이 끝났다.` : S.finalUp ? `${S.omen.name}. 밤의 주인 앞에서.` : `${S.omen.name}. 새벽까지 ${fmt(G.RUN_LEN - S.t)} 남았다.`;
    $('overStats').innerHTML = `<div><dt>버틴 시간</dt><dd>${fmt(S.t)}</dd></div><div><dt>처치</dt><dd>${S.kills}</dd></div><div><dt>레벨</dt><dd>${S.p.level}</dd></div>`;
    let u = fresh.map(c => `${c.name}이(가) 열렸다.`).join('<br>');
    if (depthUp) u += (u ? '<br>' : '') + `밤의 깊이 ${save.maxDepth}이(가) 열렸다.`;
    $('overUnlock').innerHTML = u ? `<div class="unlock">${u}</div>` : '';
    setTimeout(() => { if (S && S.over) show('over', true); }, win ? 1200 : 700);
  }

  // ── 메인 루프 ──
  function step(dt) {
    if (S.over) return;
    if (S.choice) {
      if (BOT) G.choose(S, Math.floor(Math.random() * S.choice.opts.length));
      else if (!choiceOpen) showChoice();
      return;
    }
    G.update(S, dt, BOT ? G.bot(S) : readInput());
    for (const e of S.ev) { if (e.k === 'sfx') sfx(e.d); else toast(e.d); }
    S.ev.length = 0;
    if (S.over) endRun();
  }

  function frame(ts) {
    const dt = Math.min(.05, (ts - last) / 1000 || 0);
    last = ts; V.time += dt;
    if (mode === 'play') {
      if (!paused) {
        for (let i = 0; i < SPEED; i++) step(dt);
        if (toastT > 0 && (toastT -= dt) <= 0) $('toast').classList.remove('show');
        if (gemPitch > 0 && V.time - (sfxLast.gem || 0) > .5) gemPitch = 0;
      }
      G.render(ctx, S, V);
      hud();
    } else G.renderMenu(ctx, V);
    requestAnimationFrame(frame);
  }

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !qs.has('bot')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* 서비스 워커를 막는 환경에서는 온라인 전용으로 동작 */ });
  }

  G.state = () => S;
  resize();
  toMenu();
  requestAnimationFrame(frame);
})();
