'use strict';
// 사용법: node tools/sim.js [판수] [깊이] [캐릭터 id]
require('../js/data.js');
require('../js/game.js');

const runs = +process.argv[2] || 20, depth = +process.argv[3] || 0, only = process.argv[4];
const fmt = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');

for (const c of G.CHARS) {
  if (only && c.id !== only) continue;
  const times = [];
  let wins = 0, lvl = 0, kills = 0;
  for (let i = 0; i < runs; i++) {
    const S = G.newRun({ charId: c.id, seed: i * 7919 + 13, depth });
    while (!S.over && S.t < 1500) {
      if (S.choice) G.choose(S, Math.floor(S.rng() * S.choice.opts.length));
      G.update(S, 1 / 30, G.bot(S));
      S.ev.length = 0;
    }
    times.push(S.t); lvl += S.p.level; kills += S.kills;
    if (S.over === 'win') wins++;
  }
  times.sort((a, b) => a - b);
  console.log(c.id.padEnd(9), 'win', (wins + '/' + runs).padEnd(6), 'min', fmt(times[0]), 'med', fmt(times[runs >> 1]), 'max', fmt(times[runs - 1]),
    'lvl', (lvl / runs).toFixed(1), 'kills', Math.round(kills / runs));
}
