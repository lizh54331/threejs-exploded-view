// 无头截图：静态服务 + Chromium(Edge) + SwiftShader。
//   node tools/shot.mjs --out shots/a.jpg [--w 1600] [--h 1000] [--pick <key>] [--eval "js"]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith('--')) continue;
  const n = process.argv[i + 1];
  if (!n || n.startsWith('--')) args[a.slice(2)] = true;
  else { args[a.slice(2)] = n; i++; }
}

const ROOT = process.cwd();
const OUT = path.resolve(args.out || 'shots/view.jpg');
const W = Number(args.w || 1600);
const H = Number(args.h || 1000);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(ROOT, url === '/' ? 'index.html' : url);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404).end('404'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const errors = [];
let browser;
for (const opts of [{ channel: 'msedge' }, { channel: 'chrome' }, {}]) {
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist',
             '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--hide-scrollbars'],
      ...opts,
    });
    console.log('[browser]', JSON.stringify(opts));
    break;
  } catch (e) {
    console.error('[browser fail]', String(e.message).split('\n')[0]);
  }
}
if (!browser) process.exit(1);

const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded' });
try { await page.waitForFunction('window.__ready === true', null, { timeout: 20000 }); }
catch { console.log('[warn] __ready not set; capturing anyway'); }
await page.waitForTimeout(1200);

if (args.pick) {
  await page.evaluate((k) => window.__scene.select(k), args.pick);
  await page.waitForTimeout(1400);
}
if (args.eval) {
  await page.evaluate(String(args.eval));
  await page.waitForTimeout(900);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
await page.screenshot({ path: OUT, type: 'jpeg', quality: 92 });
console.log('[shot]', OUT, `${W}x${H}`);
if (errors.length) console.log('[page errors]', errors.slice(0, 8));
await browser.close();
server.close();
