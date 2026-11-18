'use strict';
// 무기 하나만 키우는 조건으로 무기별 성능을 잰다. 사용법: node tools/balance.js [판수] [무기 id]
require('../js/data.js');
require('../js/game.js');

const runs = +process.argv[2] || 10, only = process.argv[3];
const fmt = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
const MARKS = [120, 240, 360, 480];

console.log('weapon'.padEnd(10), 'win'.padEnd(6), 'med'.padEnd(6), MARKS.map(m => ('dmg@' + m / 60 + 'm').padStart(8)).join(''), '  maxLv@');
for (const id in G.WEAPONS) {
  if (only && id !== only) continue;
  const times = [], maxAt = [], at = MARKS.map(() => []);
  let wins = 0;
  for (let i = 0; i < runs; i++) {
    const S = G.newRun({ charId: 'ember', weapon: id, seed: i * 7919 + 13, depth: 0 });
    // 근접 무기는 적이 닿아야 피해가 들어가므로 봇도 그만큼 가까이 붙어 싸우게 한다.
    if (id === 'orbit' || id === 'nova') S.botR = 105;
    let mi = 0, maxed = 0;
    while (!S.over && S.t < 1500) {
      if (S.choice) {
        const o = S.choice.opts;
        // 주력 무기 강화가 나오면 고르고, 아니면 다른 무기를 피해서 고른다.
        let pick = o.findIndex(x => x.kind === 'w' && x.id === id);
        if (pick < 0) { const rest = o.map((x, j) => j).filter(j => o[j].kind !== 'w'); pick = rest.length ? rest[Math.floor(S.rng() * rest.length)] : -1; }
        if (pick < 0 && S.choice.kind === 'level' && G.reroll(S)) continue;
        G.choose(S, pick < 0 ? 0 : pick);
        if (!maxed && S.weapons[0].lvl === 6) maxed = S.t;
      }
      G.update(S, 1 / 30, G.bot(S));
      S.ev.length = 0;
      if (mi < MARKS.length && S.t >= MARKS[mi]) at[mi++].push(S.dmg[id] || 0);
    }
    times.push(S.t); if (maxed) maxAt.push(maxed);
    if (S.over === 'win') wins++;
  }
  console.log(id.padEnd(10), (wins + '/' + runs).padEnd(6), fmt(med(times)).padEnd(6),
    at.map(a => (a.length ? Math.round(med(a) / 100) / 10 + 'k' : '-').padStart(8)).join(''), '  ' + (maxAt.length ? fmt(med(maxAt)) : '-'));
}
