#!/usr/bin/env node
/* Sublantis Wiki — Obsidian Canvas → SVG
 * 渲染 Sublantis 世界观总览.canvas：group 容器 / file 卡片 / text 文本 / link / edge 箭头。
 */
const fs = require("fs");
const path = require("path");

const VAULT = "/home/mallorine/文档/Obsidian Vault/HMLC-newsettings (2)/Sublantis世界观大体概述";
const OUT = "/home/mallorine/下载/Sublantis-Wiki/assets/gallery/_canvas_general.svg";
const FONT = "'Source Han Sans CN', 'Noto Sans SC', system-ui, sans-serif";

const cv = JSON.parse(fs.readFileSync(path.join(VAULT, "Sublantis 世界观总览.canvas"), "utf8"));

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CJK = /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\u3000-\u303f]/;
function charW(ch, fs) {
  if (CJK.test(ch)) return fs * 1.0;
  if ("iljI.,:;'|!".includes(ch)) return fs * 0.3;
  if ("mwMW@%".includes(ch)) return fs * 0.84;
  if (ch === " ") return fs * 0.3;
  return fs * 0.55;
}
function textW(s, fs) { let w = 0; for (const c of s) w += charW(c, fs); return w; }
function wrap(raw, fs, maxW, maxLines) {
  const out = [];
  for (const para of String(raw).split("\n")) {
    if (!para) { out.push(""); continue; }
    if (textW(para, fs) <= maxW) { out.push(para); continue; }
    let line = "", w = 0;
    for (const ch of para) {
      const cw = charW(ch, fs);
      if (w + cw > maxW && line) { out.push(line); line = ch; w = cw; }
      else { line += ch; w += cw; }
    }
    out.push(line);
  }
  if (maxLines && out.length > maxLines) { out.length = maxLines; out[maxLines - 1] += " …"; }
  return out;
}

const OBS = { "1": "#e03131", "2": "#e8590c", "3": "#f08c00", "4": "#2f9e44", "5": "#0c8599", "6": "#6741d9" };
const byId = new Map(cv.nodes.map((n) => [n.id, n]));

/* 图鉴节点嵌入真·Excalidraw 官方导出图的缩略图（base64 内联，SVG 自包含） */
const SM = "/home/mallorine/下载/Sublantis-Wiki/assets/gallery/thumbs-sm";
const thumbCache = new Map();
function thumbFor(file) {
  const base = (file || "").split("/").pop().replace(/\.excalidraw\.md$/, "").replace(/\.md$/, "");
  if (thumbCache.has(base)) return thumbCache.get(base);
  const p = path.join(SM, base + ".png");
  const uri = fs.existsSync(p) ? "data:image/png;base64," + fs.readFileSync(p).toString("base64") : null;
  thumbCache.set(base, uri);
  return uri;
}
// 从 PNG 头读尺寸（宽高，大端）
function pngSize(buf) { return [buf.readUInt32BE(16), buf.readUInt32BE(20)]; }
const thumbSizeCache = new Map();
function thumbSize(uri) {
  if (thumbSizeCache.has(uri)) return thumbSizeCache.get(uri);
  const [w, h] = pngSize(Buffer.from(uri.split(",")[1], "base64"));
  thumbSizeCache.set(uri, [w, h]);
  return [w, h];
}

let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const n of cv.nodes) {
  minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
  maxX = Math.max(maxX, n.x + n.width); maxY = Math.max(maxY, n.y + n.height);
}
const PAD = 50;
const VX = minX - PAD, VY = minY - PAD, VW = maxX - minX + PAD * 2, VH = maxY - minY + PAD * 2;

const parts = [];

/* --- group 容器（先画，作为底） --- */
for (const n of cv.nodes.filter((n) => n.type === "group")) {
  const c = OBS[n.color] || "#868e96";
  parts.push(`<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" rx="10" fill="${c}0e" stroke="${c}66" stroke-width="1.6" stroke-dasharray="7 6"/>`);
  if (n.label) {
    parts.push(`<text x="${n.x + 14}" y="${n.y + 25}" font-family="${FONT}" font-size="17" font-weight="700" fill="${c}">${esc(n.label)}</text>`);
  }
}

/* --- 边 --- */
function sidePoint(n, side, other) {
  const cx = n.x + n.width / 2, cy = n.y + n.height / 2;
  const ocx = other.x + other.width / 2, ocy = other.y + other.height / 2;
  if (!side) {
    if (Math.abs(ocx - cx) > Math.abs(ocy - cy)) side = ocx > cx ? "right" : "left";
    else side = ocy > cy ? "bottom" : "top";
  }
  if (side === "left") return [n.x, cy];
  if (side === "right") return [n.x + n.width, cy];
  if (side === "top") return [cx, n.y];
  return [cx, n.y + n.height];
}
for (const e of cv.edges || []) {
  const a = byId.get(e.fromNode), b = byId.get(e.toNode);
  if (!a || !b) continue;
  const [x1, y1] = sidePoint(a, e.fromSide, b);
  const [x2, y2] = sidePoint(b, e.toSide, a);
  const dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
  const c1 = e.fromSide === "left" || e.fromSide === "right" ? [x1 + Math.sign(x2 - x1) * dx * 0.45, y1] : [x1, y1 + Math.sign(y2 - y1) * dy * 0.45];
  const c2 = e.toSide === "left" || e.toSide === "right" ? [x2 - Math.sign(x2 - x1) * dx * 0.45, y2] : [x2, y2 - Math.sign(y2 - y1) * dy * 0.45];
  const stroke = OBS[e.color] || "#adb5bd";
  const ang = Math.atan2(y2 - c2[1], x2 - c2[0]);
  const L = 11, w = 0.4;
  const p1 = [x2 - L * Math.cos(ang - w), y2 - L * Math.sin(ang - w)];
  const p2 = [x2 - L * Math.cos(ang + w), y2 - L * Math.sin(ang + w)];
  parts.push(`<path d="M${x1} ${y1}C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${x2} ${y2}" fill="none" stroke="${stroke}" stroke-width="1.8" opacity="0.85"/>`);
  parts.push(`<path d="M${x2} ${y2}L${p1[0]} ${p1[1]}L${p2[0]} ${p2[1]}Z" fill="${stroke}" opacity="0.85"/>`);
  if (e.label) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    parts.push(`<rect x="${mx - textW(e.label, 12) / 2 - 6}" y="${my - 11}" width="${textW(e.label, 12) + 12}" height="19" rx="3" fill="#ffffff" opacity="0.92"/>`);
    parts.push(`<text x="${mx}" y="${my + 3}" font-family="${FONT}" font-size="12" fill="#495057" text-anchor="middle">${esc(e.label)}</text>`);
  }
}

/* --- 节点 --- */
for (const n of cv.nodes) {
  const c = OBS[n.color] || "#868e96";
  if (n.type === "file") {
    const name = (n.file || "").split("/").pop().replace(/\.md$/, "");
    parts.push(`<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" rx="6" fill="#ffffff" stroke="${c}" stroke-width="1.6"/>`);
    parts.push(`<rect x="${n.x}" y="${n.y}" width="4" height="${n.height}" rx="2" fill="${c}"/>`);
    const thumb = thumbFor(n.file);
    const lines = wrap(name + (n.subpath ? " " + n.subpath : ""), 14, n.width - 30, 2);
    lines.forEach((ln, i) => {
      parts.push(`<text x="${n.x + 18}" y="${n.y + 26 + i * 19}" font-family="${FONT}" font-size="14" font-weight="600" fill="#1e1e1e">${esc(ln)}</text>`);
    });
    if (thumb) {
      const top = n.y + 22 + lines.length * 19 + 8;
      const availW = n.width - 26, availH = n.y + n.height - 12 - top;
      const [iw, ih] = thumbSize(thumb);
      let dw = availW, dh = (availW * ih) / iw;
      if (dh > availH) { dh = availH; dw = (availH * iw) / ih; }
      const dx = n.x + 13 + (availW - dw) / 2;
      parts.push(`<image x="${dx}" y="${top}" width="${dw}" height="${dh}" preserveAspectRatio="xMidYMid meet" href="${thumb}"/>`);
    }
  } else if (n.type === "text") {
    const fs_ = n.color === "3" && n.width > 1000 ? 22 : 15;
    const lines = wrap((n.text || "").replace(/^#\s+/, "").replace(/^>\s?/gm, ""), fs_, n.width - 20, Math.floor(n.height / (fs_ * 1.45)) + 2);
    parts.push(`<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" rx="4" fill="#ffffff" opacity="0.001"/>`);
    lines.forEach((ln, i) => {
      const bold = i === 0 && /^#/.test((n.text || "").trim()) ? 700 : 400;
      parts.push(`<text x="${n.x + 8}" y="${n.y + fs_ * 1.15 + i * fs_ * 1.45}" font-family="${FONT}" font-size="${fs_}" font-weight="${bold}" fill="#343a40">${esc(ln)}</text>`);
    });
  } else if (n.type === "link") {
    parts.push(`<rect x="${n.x}" y="${n.y}" width="${n.width}" height="${n.height}" rx="6" fill="#fff" stroke="${c}" stroke-width="1.6"/>`);
    parts.push(`<text x="${n.x + 14}" y="${n.y + 26}" font-family="${FONT}" font-size="14" fill="#1971c2">${esc(n.url || "")}</text>`);
  }
}

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VX} ${VY} ${VW} ${VH}" width="${Math.round(VW)}" height="${Math.round(VH)}" role="img" aria-label="Sublantis 世界观总览 Canvas">\n` +
  `<!-- Sublantis Wiki · 由 Obsidian Canvas 自动渲染 -->\n` +
  `<rect x="${VX}" y="${VY}" width="${VW}" height="${VH}" fill="#ffffff"/>\n` +
  parts.join("\n") + `\n</svg>\n`;
fs.writeFileSync(OUT, svg, "utf8");
console.log("canvas svg:", Math.round(VW) + "x" + Math.round(VH), (svg.length / 1024).toFixed(0) + "KB", "nodes", cv.nodes.length, "edges", (cv.edges || []).length);
