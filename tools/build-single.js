'use strict';
// index.html 과 js/*.js 를 파일 하나(dist/bulssi.html)로 합친다. 사용법: node tools/build-single.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const style = html.match(/<style>[\s\S]*?<\/style>/)[0]
  .replace(/calc\(env\(safe-area-inset-(?:top|bottom)\) \+ (\d+px)\)/g, '$1');
const body = html.match(/<body>([\s\S]*?)<script/)[1];
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)]
  .map(m => '<script>\n' + fs.readFileSync(path.join(root, m[1]), 'utf8') + '</script>').join('\n');
const fonts = html.match(/<link rel="stylesheet"[^>]*>/)[0];
const out = '<title>불씨</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n' + fonts + '\n' + style + body + scripts + '\n';
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'bulssi.html'), out);
console.log('dist/bulssi.html', out.length, 'bytes');
