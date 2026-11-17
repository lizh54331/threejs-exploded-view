// 真实输入冒烟测试：投影坐标 → mouse.click → 断言面板/标签/拆解状态。
//   node tools/test-click.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = process.cwd();
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
};
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, b) => {
    if (e) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    res.end(b);
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({
  channel: 'msedge', headless: true,
  args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(`http://127.0.0.1:${port}/index.html`);
await page.waitForFunction('window.__ready === true', null, { timeout: 25000 });
await page.waitForTimeout(1200);

// 1) 目标构件包围盒中心 → 屏幕坐标 → 真实点击
const target = await page.evaluate(() => {
  const { camera, parts, centerOf } = window.__scene;
  const p = parts[0];
  const v = centerOf(p.key);
  v.project(camera);
  return {
    key: p.key, name: p.name,
    x: (v.x * 0.5 + 0.5) * innerWidth,
    y: (-v.y * 0.5 + 0.5) * innerHeight,
  };
});
await page.mouse.click(target.x, target.y);
await page.waitForTimeout(1300);
const clickState = await page.evaluate(() => ({
  title: document.getElementById('dName').textContent,
  active: document.querySelectorAll('.part.on').length,
  explode: Number(window.__scene.explode.toFixed(2)),
  labels: document.querySelectorAll('.lbl.show').length,
}));
console.log('canvas click ->', JSON.stringify(clickState), 'expected:', target.name);

// 2) 清单点第二个构件
const expected = await page.evaluate(() => window.__scene.parts[1].name);
await page.locator('.part').nth(1).click();
await page.waitForTimeout(700);
const listState = await page.evaluate(() => ({
  title: document.getElementById('dName').textContent,
  params: document.querySelectorAll('#dParams div').length,
}));
console.log('list click ->', JSON.stringify(listState), 'expected:', expected);

// 3) 重组
await page.locator('#btnExplode').click();
await page.waitForTimeout(1600);
const collapse = await page.evaluate(() => ({
  explode: Number(window.__scene.explode.toFixed(2)),
  btn: document.getElementById('btnExplode').textContent,
  labels: document.querySelectorAll('.lbl.show').length,
}));
console.log('collapse ->', JSON.stringify(collapse));

console.log('errors:', errs.length ? errs.slice(0, 4) : 'none');
await browser.close();
server.close();