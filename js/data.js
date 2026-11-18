'use strict';
const G = globalThis.G = {};

G.CHARS = [
  { id: 'ember', name: '불씨', icon: '🔥', weapon: 'spark', desc: '균형 잡힌 기본 불씨.', mods: {} },
  { id: 'firefly', name: '반딧불', icon: '✨', weapon: 'orbit', desc: '빠르지만 여리다. 이동 속도 +15%, 체력 -20', mods: { speed: .15, maxHp: -20 } },
  { id: 'coal', name: '숯덩이', icon: '🪨', weapon: 'nova', desc: '느리지만 단단하다. 체력 +40, 방어 +1, 이동 속도 -10%', mods: { maxHp: 40, armor: 1, speed: -.1 } },
  { id: 'candle', name: '촛불', icon: '🕯️', weapon: 'lance', desc: '빨리 배운다. 경험치 +15%', mods: { xp: .15 }, unlock: { key: 'runs', val: 3, text: '3판 플레이하기' } },
  { id: 'bolt', name: '번갯불', icon: '⚡', weapon: 'chain', desc: '손이 빠르다. 쿨다운 -10%', mods: { cd: -.1 }, unlock: { key: 'bestTime', val: 300, text: '5분 이상 버티기' } },
  { id: 'kiln', name: '화로', icon: '🏺', weapon: 'mine', desc: '묵직한 한 방. 피해 +15%, 이동 속도 -5%', mods: { might: .15, speed: -.05 }, unlock: { key: 'kills', val: 2000, text: '누적 2,000마리 처치' } },
  { id: 'crescent', name: '초승달', icon: '🌙', weapon: 'boomerang', desc: '급소를 노린다. 치명타 확률 +10%', mods: { crit: .1 }, unlock: { key: 'bossKills', val: 1, text: '우두머리 1회 처치' } },
  { id: 'meteor', name: '별똥별', icon: '☄️', weapon: 'rain', desc: '넓게 태운다. 공격 범위 +20%', mods: { area: .2 }, unlock: { key: 'wins', val: 1, text: '새벽 맞이하기 (첫 승리)' } },
];

G.WEAPONS = {
  spark: {
    name: '불티', icon: '🔥', desc: '가장 가까운 적에게 불티를 쏜다.',
    lv: [
      { dmg: 10, cd: .85, n: 1, pierce: 0 }, { dmg: 14, cd: .85, n: 1, pierce: 0 }, { dmg: 14, cd: .85, n: 2, pierce: 0 },
      { dmg: 17, cd: .8, n: 2, pierce: 1 }, { dmg: 20, cd: .7, n: 3, pierce: 1 }, { dmg: 24, cd: .65, n: 3, pierce: 2, ex: true },
    ],
    up: ['', '피해 +40%', '불티 +1', '관통 +1, 피해 증가', '불티 +1, 더 빠르게', '각성: 불티가 적중하면 폭발한다'],
  },
  orbit: {
    name: '맴도는 등불', icon: '🏮', desc: '등불이 주위를 돌며 닿는 적을 태운다.',
    lv: [
      { dmg: 7, n: 2, rad: 58, spd: 3.2, tick: .45 }, { dmg: 7, n: 3, rad: 58, spd: 3.2, tick: .45 }, { dmg: 10, n: 3, rad: 66, spd: 3.4, tick: .45 },
      { dmg: 10, n: 4, rad: 66, spd: 3.4, tick: .42 }, { dmg: 14, n: 4, rad: 72, spd: 4, tick: .4 }, { dmg: 16, n: 4, rad: 72, spd: 4, tick: .4, ring2: true },
    ],
    up: ['', '등불 +1', '피해 증가, 궤도 확장', '등불 +1', '피해 증가, 더 빠르게', '각성: 바깥 궤도에 등불이 한 겹 더 돈다'],
  },
  nova: {
    name: '숨결', icon: '💥', desc: '주기적으로 주위를 밀어내는 열기를 내뿜는다.',
    lv: [
      { dmg: 9, cd: 2.6, rad: 75, kb: 150 }, { dmg: 9, cd: 2.6, rad: 92, kb: 150 }, { dmg: 14, cd: 2.5, rad: 92, kb: 160 },
      { dmg: 14, cd: 2.1, rad: 98, kb: 160 }, { dmg: 19, cd: 2.1, rad: 115, kb: 170 }, { dmg: 24, cd: 1.9, rad: 120, kb: 180, burn: true },
    ],
    up: ['', '범위 +20%', '피해 +50%', '쿨다운 감소', '범위·피해 증가', '각성: 맞은 적이 3초간 불탄다'],
  },
  lance: {
    name: '빛줄기', icon: '🔦', desc: '가까운 적 방향으로 모든 것을 꿰뚫는 빛을 쏜다.',
    lv: [
      { dmg: 16, cd: 1.9, len: 260, wid: 14, n: 1 }, { dmg: 22, cd: 1.9, len: 260, wid: 14, n: 1 }, { dmg: 22, cd: 1.8, len: 300, wid: 20, n: 1 },
      { dmg: 24, cd: 1.8, len: 300, wid: 20, n: 2 }, { dmg: 31, cd: 1.6, len: 320, wid: 22, n: 2 }, { dmg: 36, cd: 1.5, len: 340, wid: 24, n: 4 },
    ],
    up: ['', '피해 +35%', '더 길고 굵게', '반대 방향으로도 발사', '피해 증가, 더 빠르게', '각성: 네 방향으로 뻗는다'],
  },
  mine: {
    name: '잉걸불', icon: '🧨', desc: '지나간 자리에 잉걸불을 남긴다. 적이 닿으면 폭발한다.',
    lv: [
      { dmg: 22, cd: 2.2, rad: 55, n: 1 }, { dmg: 30, cd: 2.2, rad: 55, n: 1 }, { dmg: 30, cd: 2.1, rad: 68, n: 1 },
      { dmg: 32, cd: 2.1, rad: 68, n: 2 }, { dmg: 42, cd: 1.8, rad: 72, n: 2 }, { dmg: 50, cd: 1.7, rad: 76, n: 2, fire: true },
    ],
    up: ['', '피해 +35%', '폭발 범위 확대', '잉걸불 +1', '피해 증가, 더 빠르게', '각성: 폭발한 자리가 불바다로 남는다'],
  },
  chain: {
    name: '번갯불', icon: '⚡', desc: '적 사이를 튀어 다니는 번개를 내리친다.',
    lv: [
      { dmg: 12, cd: 1.5, jumps: 3, range: 150, bolts: 1 }, { dmg: 12, cd: 1.5, jumps: 4, range: 150, bolts: 1 }, { dmg: 17, cd: 1.45, jumps: 4, range: 160, bolts: 1 },
      { dmg: 17, cd: 1.4, jumps: 6, range: 170, bolts: 1 }, { dmg: 22, cd: 1.2, jumps: 6, range: 170, bolts: 1 }, { dmg: 26, cd: 1.15, jumps: 7, range: 180, bolts: 2, stun: .4 },
    ],
    up: ['', '연쇄 +1', '피해 +40%', '연쇄 +2', '피해 증가, 더 빠르게', '각성: 번개가 두 갈래로 치고 적을 잠깐 마비시킨다'],
  },
  boomerang: {
    name: '초승달', icon: '🌙', desc: '적을 베고 되돌아오는 칼날을 던진다.',
    lv: [
      { dmg: 13, cd: 2, n: 1, spd: 380, range: 200, r: 13 }, { dmg: 18, cd: 2, n: 1, spd: 380, range: 200, r: 13 }, { dmg: 18, cd: 2, n: 2, spd: 380, range: 210, r: 13 },
      { dmg: 20, cd: 1.9, n: 2, spd: 400, range: 250, r: 16 }, { dmg: 27, cd: 1.7, n: 2, spd: 400, range: 250, r: 16 }, { dmg: 30, cd: 1.6, n: 3, spd: 420, range: 260, r: 17, ret2: true },
    ],
    up: ['', '피해 +40%', '칼날 +1', '더 멀리, 더 크게', '피해 증가, 더 빠르게', '각성: 칼날 +1, 돌아올 때 피해 2배'],
  },
  rain: {
    name: '별똥별', icon: '☄️', desc: '적의 머리 위로 별똥별을 떨어뜨린다.',
    lv: [
      { dmg: 28, cd: 2.4, n: 1, rad: 48 }, { dmg: 28, cd: 2.4, n: 2, rad: 48 }, { dmg: 38, cd: 2.3, n: 2, rad: 50 },
      { dmg: 38, cd: 2.2, n: 3, rad: 60 }, { dmg: 48, cd: 1.9, n: 3, rad: 62 }, { dmg: 55, cd: 1.8, n: 5, rad: 64, stun: .6 },
    ],
    up: ['', '별똥별 +1', '피해 +35%', '별똥별 +1, 범위 확대', '피해 증가, 더 빠르게', '각성: 별똥별 +2, 맞은 적이 기절한다'],
  },
};

G.PASSIVES = {
  might: { name: '장작', icon: '🪵', max: 5, desc: '피해 +12%', apply: (s, l) => { s.might += .12 * l; } },
  haste: { name: '풀무', icon: '💨', max: 5, desc: '쿨다운 -7%', apply: (s, l) => { s.cd -= .07 * l; } },
  area: { name: '심지', icon: '🧵', max: 5, desc: '공격 범위 +10%', apply: (s, l) => { s.area += .1 * l; } },
  speed: { name: '깃털', icon: '🪶', max: 5, desc: '이동 속도 +8%', apply: (s, l) => { s.speed += .08 * l; } },
  magnet: { name: '끌림', icon: '🧲', max: 5, desc: '경험치 획득 범위 +30%', apply: (s, l) => { s.pickup += .3 * l; } },
  shell: { name: '껍질', icon: '🛡️', max: 5, desc: '최대 체력 +20, 방어 +1', apply: (s, l) => { s.maxHp += 20 * l; s.armor += l; } },
  warmth: { name: '온기', icon: '❤️', max: 5, desc: '초당 체력 회복 +0.5', apply: (s, l) => { s.regen += .5 * l; } },
  twin: { name: '쌍둥이 불꽃', icon: '👥', max: 2, desc: '모든 무기의 투사체 +1', apply: (s, l) => { s.amount += l; } },
  edge: { name: '날카로움', icon: '🎯', max: 5, desc: '치명타 확률 +8%', apply: (s, l) => { s.crit += .08 * l; } },
  wisdom: { name: '배움', icon: '📖', max: 5, desc: '경험치 +10%', apply: (s, l) => { s.xp += .1 * l; } },
};

G.RELICS = {
  glass: { name: '유리 심장', icon: '💔', desc: '피해 +40%, 최대 체력 -30%', apply: s => { s.might *= 1.4; s.hpMul *= .7; } },
  hungry: { name: '굶주린 불꽃', icon: '🍖', desc: '적을 처치할 때마다 체력을 조금 회복한다' },
  blast: { name: '폭발 잔재', icon: '🎆', desc: '처치한 적이 12% 확률로 폭발한다' },
  frost: { name: '서리 등불', icon: '❄️', desc: '공격이 25% 확률로 적을 2초간 느리게 한다' },
  second: { name: '두 번째 숨', icon: '🕊️', desc: '쓰러지면 한 번, 체력 절반으로 되살아난다' },
  greed: { name: '탐욕의 재', icon: '💰', desc: '경험치 +25%. 대신 새로 나타나는 적이 10% 빨라진다', apply: s => { s.xp += .25; } },
  still: { name: '고요한 발걸음', icon: '🧘', desc: '멈춰 서 있는 동안 피해 +30%' },
  dash: { name: '질주의 불씨', icon: '👟', desc: '움직이는 동안 무기가 18% 빨리 돈다' },
  thorns: { name: '가시 껍질', icon: '🌵', desc: '피격 시 주위 적에게 피해를 주고 밀어낸다' },
  shadow: { name: '긴 그림자', icon: '🌒', desc: '공격 범위 +20%, 투사체 속도 +20%', apply: s => { s.area += .2; s.projSpeed += .2; } },
  clover: { name: '네잎클로버', icon: '🍀', desc: '레벨 업 선택지 +1' },
  time: { name: '시간 조각', icon: '⏳', desc: '30초마다 모든 적이 3초간 멈춘다' },
  collector: { name: '수집가의 자루', icon: '🎒', desc: '20초마다 모든 경험치를 끌어당긴다' },
  rage: { name: '꺼져가는 분노', icon: '😡', desc: '체력이 낮을수록 피해 증가 (최대 +60%)' },
};

G.OMENS = [
  { id: 'redmoon', name: '붉은 달', icon: '🔴', desc: '적이 훨씬 많이 몰려오지만 쉽게 쓰러진다.', mod: { eCount: 1.45, eHp: .72 } },
  { id: 'fog', name: '짙은 안개', icon: '🌫️', desc: '시야가 좁아진다. 대신 경험치 +30%.', mod: { fog: .62, xp: 1.3 } },
  { id: 'giant', name: '거인의 밤', icon: '🗿', desc: '적이 크고 질기지만 느리고, 경험치를 두 배 가까이 준다.', mod: { eSize: 1.3, eHp: 1.6, eSpeed: .85, gem: 1.8, eCount: .8 } },
  { id: 'meteors', name: '유성우', icon: '🌠', desc: '하늘에서 불덩이가 떨어진다. 적도 나도 맞으면 아프다.', mod: { meteors: 1 } },
  { id: 'bounty', name: '풍요', icon: '🌾', desc: '레벨 업 선택지 +1. 대신 다시 뽑기를 쓸 수 없다.', mod: { choices: 1, rerolls: 0 } },
  { id: 'wind', name: '바람의 밤', icon: '🍃', desc: '모두가 빨라진다. 나 +25%, 적 +15%.', mod: { pSpeed: 1.25, eSpeed: 1.15 } },
  { id: 'glass', name: '유리의 밤', icon: '🔮', desc: '주는 피해 +50%, 받는 피해 +50%.', mod: { dmgDeal: 1.5, dmgTake: 1.5 } },
  { id: 'blessing', name: '정령의 축복', icon: '🧚', desc: '유물 하나를 들고 시작한다. 대신 정예가 두 배 자주 나타난다.', mod: { startRelic: 1, eliteRate: 2 } },
  { id: 'famine', name: '굶주린 밤', icon: '🥀', desc: '체력이 저절로 회복되지 않는다. 대신 적이 회복 구슬을 자주 떨어뜨린다.', mod: { noRegen: true, healDrop: 4 } },
  { id: 'twins', name: '쌍둥이 달', icon: '🌗', desc: '중간 우두머리가 둘씩 나타난다.', mod: { twinBoss: true } },
];

G.ENEMIES = {
  shade: { r: 10, hp: 8, speed: 55, dmg: 8, xp: 1, cost: 1, color: '#6a58a8' },
  runner: { r: 7, hp: 5, speed: 112, dmg: 6, xp: 1, cost: .8, color: '#d0607f' },
  brute: { r: 17, hp: 42, speed: 40, dmg: 15, xp: 4, cost: 2.6, color: '#3f7d78' },
  spitter: { r: 10, hp: 14, speed: 60, dmg: 9, xp: 3, cost: 2, color: '#86b84e' },
  splitter: { r: 13, hp: 22, speed: 58, dmg: 10, xp: 2, cost: 2, color: '#c9973d' },
  mite: { r: 6, hp: 5, speed: 98, dmg: 5, xp: 1, cost: .5, color: '#e0b860' },
  charger: { r: 11, hp: 20, speed: 66, dmg: 13, xp: 3, cost: 2, color: '#dc5a3c' },
  wisp: { r: 8, hp: 9, speed: 92, dmg: 7, xp: 2, cost: 1.2, color: '#5aa0dc' },
  swarm: { r: 6, hp: 4, speed: 230, dmg: 6, xp: 1, cost: 1, color: '#9a66e0' },
  warden: { r: 30, hp: 1, speed: 62, dmg: 22, xp: 40, cost: 0, color: '#a8456f', name: '그림자 파수꾼' },
  weaver: { r: 26, hp: 1, speed: 82, dmg: 18, xp: 40, cost: 0, color: '#3f82a8', name: '어둠 직조자' },
  maw: { r: 34, hp: 1, speed: 72, dmg: 26, xp: 40, cost: 0, color: '#a86a3f', name: '굶주린 아가리' },
};

G.SHRINES = {
  heal: { name: '치유의 샘', icon: '💧', color: '#5ad0ff' },
  wisdom: { name: '지식의 돌', icon: '📘', color: '#7dffa0' },
  gamble: { name: '도박꾼의 불', icon: '🎲', color: '#ffd75a' },
  pact: { name: '계약의 제단', icon: '🩸', color: '#ff5a7a' },
};
