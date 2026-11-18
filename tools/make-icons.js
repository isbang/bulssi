'use strict';
// 앱 아이콘 PNG 를 만든다. 사용법: node tools/make-icons.js
const fs = require('fs'), path = require('path'), zlib = require('zlib');

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc(buf) { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const flame = (x, y, s) => {
  const cy = .14, r = .27 * s;
  if (Math.hypot(x, y - cy) < r) return true;
  const top = cy - .62 * s;
  if (y > cy || y < top) return false;
  const t = (cy - y) / (cy - top);
  return Math.abs(x - Math.sin(t * 2.4) * .05 * s * t) < r * Math.pow(1 - t, .75);
};
function color(x, y) {
  let c = mix([16, 20, 44], [255, 122, 26], Math.max(0, 1 - Math.hypot(x, y - .08) / .6) ** 2 * .5);
  // 마스크형 아이콘은 가장자리가 잘리므로 불꽃을 가운데 80% 안에 둔다.
  const k = .74, fx = x / k, fy = (y - .03) / k;
  if (flame(fx, fy, 1)) c = [255, 122, 26];
  if (flame(fx / .7, (fy - .14) / .7 + .14, 1)) c = [255, 179, 71];
  if (Math.hypot(fx, fy - .17) < .11) c = [255, 243, 196];
  return c;
}

function png(size) {
  const SS = 3, raw = Buffer.alloc((size * 3 + 1) * size);
  for (let py = 0; py < size; py++) {
    const row = py * (size * 3 + 1);
    for (let px = 0; px < size; px++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const c = color((px + (sx + .5) / SS) / size - .5, (py + (sy + .5) / SS) / size - .5);
        acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2];
      }
      for (let i = 0; i < 3; i++) raw[row + 1 + px * 3 + i] = Math.round(acc[i] / (SS * SS));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

for (const size of [180, 192, 512]) {
  const file = path.join(__dirname, '..', 'icons', `icon-${size}.png`);
  fs.writeFileSync(file, png(size));
  console.log(file);
}
