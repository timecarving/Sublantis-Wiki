#!/usr/bin/env node
/* Sublantis Wiki — 把 assets/gallery/*.svg 栅格化成列表用缩略图
 * 只用于画廊列表与 Canvas 卡片（详情页仍用矢量 SVG）。
 * 真实渲染交给 headless chromium，自己不算尺寸。
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const WIKI = "/home/mallorine/下载/Sublantis-Wiki";
const SRC = path.join(WIKI, "assets/gallery");
const OUTDIR = path.join(SRC, "thumbs");
const CHROME = "/home/mallorine/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome";
const MAXW = 640;   // 2x 目标显示宽
const MAXH = 720;

fs.mkdirSync(OUTDIR, { recursive: true });
const tmp = fs.mkdtempSync("/tmp/thumbs-");

const names = fs.readdirSync(SRC).filter((f) => f.endsWith(".svg") && f !== "_canvas_general.svg");
const map = {};
let i = 0;
for (const f of names) {
  const svg = fs.readFileSync(path.join(SRC, f), "utf8");
  const m = svg.match(/<svg[^>]*\bwidth="([\d.]+)"[^>]*\bheight="([\d.]+)"/) || svg.match(/<svg[^>]*\bviewBox="([\d.\- ]+)"[^>]*>/);
  let w, h;
  if (m && m.length === 3) { w = parseFloat(m[1]); h = parseFloat(m[2]); }
  else {
    const vb = svg.match(/viewBox="([\d.\- ]+)"/)[1].trim().split(/\s+/).map(Number);
    w = vb[2]; h = vb[3];
  }
  let tw = MAXW, th = Math.round((MAXW * h) / w);
  if (th > MAXH) { th = MAXH; tw = Math.round((MAXH * w) / h); }
  const html = `<html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#fff}img{display:block;width:${tw}px;height:${th}px}</style></head><body><img src="file://${path.join(SRC, f)}"></body></html>`;
  const hp = path.join(tmp, "t.html");
  fs.writeFileSync(hp, html, "utf8");
  const png = path.join(OUTDIR, f.replace(/\.svg$/, ".png"));
  execFileSync(CHROME, ["--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
    `--window-size=${tw},${th}`, `--screenshot=${png}`, "file://" + hp], { stdio: "ignore" });
  map[f.replace(/\.svg$/, "")] = { w: tw, h: th, bytes: fs.statSync(png).size };
  i++;
}
console.log("thumbs:", i, "total", Math.round(Object.values(map).reduce((a, b) => a + b.bytes, 0) / 1024) + "KB");
fs.writeFileSync(path.join(WIKI, "build", "thumbs.json"), JSON.stringify(map, null, 1), "utf8");
