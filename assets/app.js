/* ============================================================
   Sublantis 世界观 Wiki — 前端应用
   数据：window.SUBLANTIS_INDEX / window.SUBLANTIS_NOTES（构建期生成）
   ============================================================ */
(function () {
  "use strict";

  const IDX = window.SUBLANTIS_INDEX || { meta: {}, sections: [], gallery: [], structured: [], characters: [], stats: {}, notesIndex: [] };
  const NOTES = window.SUBLANTIS_NOTES || [];
  /* 原文快照（笔记/）是否与站点同时存在。
     本地双击打开（file://）时快照就在旁边，显示「查看原始 Markdown」；
     部署到 GitHub Pages 后只上传渲染好的网页、不带原文快照，自动隐藏以避免 404。 */
  const RAW_NOTES = location.protocol === "file:";

  const byId = new Map(NOTES.map((n) => [n.id, n]));
  const galById = new Map((IDX.gallery || []).map((g) => [g.id, g]));

  /* 图鉴笔记的 id 形如 "图鉴/未命名/Zone体系.excalidraw"，索引里 name 为 "Zone体系" */
  const galByName = new Map((IDX.gallery || []).map((g) => [g.id.replace(/\.excalidraw$/, ""), g]));

  const $ = (sel, root) => (root || document).querySelector(sel);
  const app = $("#app");
  const enc = encodeURIComponent;
  const dec = decodeURIComponent;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function noteUrl(id) { return "#/n/" + enc(id); }
  function fileUrl(p) { return "笔记/" + String(p).split("/").map(encodeURIComponent).join("/"); }
  function galUrl(id) { return "#/g/" + enc(id); }
  function secUrl(n) { return "#/s/" + enc(n); }

  /* ---------------------------------------------------------- 路由 */

  const NAV = [
    ["#/", "总览"],
    ["#/s", "分类"],
    ["#/x", "结构化"],
    ["#/c", "角色"],
    ["#/g", "图鉴"],
    ["#/map", "关系图"],
    ["#/q", "全文检索"],
  ];

  function parseHash() {
    const h = location.hash.replace(/^#/, "") || "/";
    const parts = h.split("/").filter((x) => x !== "");
    return { parts: parts.map(dec), raw: h };
  }

  function navHTML(active) {
    return NAV.map(([href, label]) => {
      const key = href.replace(/^#/, "");
      const on = active === key || (key !== "/" && active.startsWith(key)) ? " class=\"on\"" : "";
      return `<a href="${href}"${on}>${label}</a>`;
    }).join("");
  }

  function render() {
    const r = parseHash();
    const head = $("#topnav");
    if (head) head.innerHTML = navHTML(r.raw === "" ? "/" : r.raw);
    window.scrollTo(0, 0);

    const p = r.parts;
    let html = "";
    try {
      if (p.length === 0 || p[0] === "") html = viewHome();
      else if (p[0] === "n") html = viewNote(p.slice(1).join("/"));
      else if (p[0] === "s") html = p.length > 1 ? viewSection(p.slice(1).join("/")) : viewSections();
      else if (p[0] === "g") html = p.length > 1 ? viewGalleryItem(p.slice(1).join("/")) : viewGallery();
      else if (p[0] === "x") html = viewStructured(p.length > 1 ? p.slice(1).join("/") : null);
      else if (p[0] === "c") html = viewCharacters();
      else if (p[0] === "map") html = viewGraph();
      else if (p[0] === "q") html = viewSearch(p.length > 1 ? p.slice(1).join("/") : "");
      else html = `<div class="empty">未知路径：${esc(r.raw)}<br><br><a class="wikilink" href="#/">← 返回总览</a></div>`;
    } catch (e) {
      html = `<div class="empty">渲染出错：${esc(e && e.message)}</div>`;
      console.error(e);
    }
    const main = $("#main");
    main.className = p[0] === "map" ? "wide" : "";
    main.innerHTML = html;
    if (p[0] === "map") mountGraph();
    if (p[0] === "q") mountSearch();
    window.dispatchEvent(new CustomEvent("view:ready", { detail: p }));
  }

  /* ---------------------------------------------------------- 首页 */

  function viewHome() {
    const m = IDX.meta || {};
    const totalWords = NOTES.reduce((a, n) => a + (n.words || 0), 0);
    const cards = (IDX.sections || []).map((s, i) => {
      const chips = s.collections.slice(0, 7).map((c) => `<span>${esc(c.name)}</span>`).join("") +
        (s.collections.length > 7 ? `<span>+${s.collections.length - 7}</span>` : "");
      return `<a class="card seccard" href="${secUrl(s.name)}">
        <div class="idx">${String(i + 1).padStart(2, "0")} / ${String(IDX.sections.length).padStart(2, "0")}</div>
        <div class="nm">${esc(s.name)}</div>
        <div class="ct">${s.count} 条</div>
        <div class="cols">${chips}</div>
      </a>`;
    }).join("");

    const featured = pickFeatured();

    return `
    <section class="hero">
      <div class="kicker">OC 世界观设定集 · 结构化收录</div>
      <h1>Sublantis<br><span class="thin">沉入潜意识的亚特兰蒂斯</span></h1>
      <p class="lede">神秘学被工程化、CCRU 伪史与计算机科学对位的十六进制世界。本站收录全部原文笔记、
      结构化条目与手绘关系图鉴。</p>
      <div class="stats">
        <div class="stat"><div class="n">${NOTES.length}</div><div class="l">笔记</div></div>
        <div class="stat"><div class="n">${(IDX.gallery || []).length}</div><div class="l">图鉴</div></div>
        <div class="stat"><div class="n">${(IDX.sections || []).length}</div><div class="l">分类</div></div>
        <div class="stat"><div class="n">${(totalWords / 10000).toFixed(1)}万</div><div class="l">字数</div></div>
        <div class="stat"><div class="n">${(IDX.characters || []).length}</div><div class="l">角色条目</div></div>
      </div>
    </section>

    <h2 class="sec-title">分类总览</h2>
    <div class="grid g3">${cards}</div>

    <h2 class="sec-title">索引长文</h2>
    <div class="grid g2">${featured.map((n) => `
      <a class="card" href="${noteUrl(n.id)}" style="display:block">
        <div class="pill a">${esc(n.section || "")}</div>
        <div style="font-weight:700;font-size:16px;margin:9px 0 6px">${esc(n.title)}</div>
        <div style="font-size:13px;color:var(--ink-3);line-height:1.65">${esc((n.blurb || "").slice(0, 130))}</div>
      </a>`).join("")}
    </div>

    <h2 class="sec-title">快速进入</h2>
    <div class="grid g4">
      ${quick("结构化数据", "#/x", "命名对照 / Zone / 纪年 / 神秘学-技术对应")}
      ${quick("图鉴画廊", "#/g", "24 张手绘关系图，自动渲染为矢量图")}
      ${quick("关系图", "#/map", "全站 wikilink 力导向网络")}
      ${quick("全文检索", "#/q", "对全部原文正文做子串检索")}
    </div>
    <p class="dim mono" style="margin-top:44px;font-size:11px">
      源：${esc(m.source || "")} · 构建 ${esc(m.builtAt || "")} · 原文快照见 <span class="pill">笔记/</span> 目录
    </p>`;
  }

  function quick(t, href, d) {
    return `<a class="card seccard" href="${href}"><div class="nm">${t}</div><div class="ct" style="color:var(--ink-3)">${d}</div></a>`;
  }

  function pickFeatured() {
    const wanted = ["Sublantis 世界观总览（MOC）", "命名法对照表", "神秘学-技术对应关系", "Zone体系（0–9与A–F）",
      "十六进制纪年与时间标准化", "神性实体进化路线"];
    const out = [];
    for (const w of wanted) {
      const hit = NOTES.find((n) => n.base === w || n.id.endsWith("/" + w) || n.id === w);
      if (hit) out.push(hit);
    }
    const long = NOTES.filter((n) => !out.includes(n) && (n.words || 0) > 1500).sort((a, b) => b.words - a.words).slice(0, 6 - out.length);
    return out.concat(long).slice(0, 6);
  }

  /* ---------------------------------------------------------- 分类 */

  function viewSections() {
    const cards = (IDX.sections || []).map((s, i) => {
      const cols = s.collections.map((c) => `<div class="noteitem" data-href="${secUrl(s.name)}#${esc(c.name)}">
        <div class="t">${esc(c.name)}</div><div class="d">${c.ids.length} 条</div>
        <div class="b">${esc(c.blurb || "")}</div></div>`).join("");
      return `<h2 class="sec-title">${String(i + 1).padStart(2, "0")} · ${esc(s.name)}
        <span class="pill">${s.count} 条</span></h2>
        ${(s.intro || []).length ? `<p class="lede">${esc(s.intro.join(" "))}</p>` : ""}
        <div class="notelist" style="margin-bottom:26px">${cols}</div>`;
    }).join("");
    return `<div class="kicker">Contents</div><h1 class="page-title">分类浏览</h1>
      <p class="lede">按 MOC 的世界观分区组织，共 ${(IDX.sections || []).length} 个大类、${NOTES.length} 篇笔记。</p>
      <div style="margin-top:30px">${cards}</div>`;
  }

  function viewSection(name) {
    const s = (IDX.sections || []).find((x) => x.name === name);
    if (!s) return `<div class="empty">没有这个分类：${esc(name)}</div>`;
    const cols = s.collections.map((c) => {
      const items = c.ids.map((id) => {
        const n = byId.get(id);
        if (!n) return "";
        return `<div class="noteitem" data-href="${noteUrl(id)}">
          <div class="t">${esc(n.title)}</div>
          <div class="d">${n.words || 0} 字</div>
          <div class="b">${esc(n.blurb || "")}</div></div>`;
      }).join("");
      return `<h2 class="sec-title" id="${esc(c.name)}">${esc(c.name)} <span class="pill">${c.ids.length} 条</span></h2>
        <div class="notelist" style="margin-bottom:20px">${items}</div>`;
    }).join("");
    return `<div class="crumb"><a href="#/s">分类浏览</a><span class="sep">/</span>${esc(s.name)}</div>
      <h1 class="page-title">${esc(s.name)}</h1>
      ${(s.intro || []).length ? `<p class="lede">${esc(s.intro.join(" "))}</p>` : ""}
      <div style="margin-top:26px">${cols}</div>`;
  }

  /* ---------------------------------------------------------- 笔记 */

  function viewNote(id) {
    const n = byId.get(id);
    if (!n) return `<div class="empty">找不到笔记：${esc(id)}<br><br><a class="wikilink" href="#/">← 返回总览</a></div>`;

    if (n.kind === "gallery") {
      const g = galByName.get(n.id.replace(/\.excalidraw$/, "")) || galById.get(n.id);
      if (g) return viewGalleryItem(g.id);
    }

    const toc = extractTOC(n.html);
    const aside = `
      <aside>
        ${toc.length ? `<div class="panel"><h4>本页目录</h4><ol>${toc.map((t) => `<li><a href="#${enc(n.id)}-${esc(t.id)}" data-toc="${esc(t.id)}">${esc(t.text)}</a></li>`).join("")}</ol></div>` : ""}
        ${n.backlinks && n.backlinks.length ? `<div class="panel"><h4>反向链接 ${n.backlinks.length}</h4><ul>${n.backlinks.slice(0, 40).map((b) => {
          const t = byId.get(b);
          return t ? `<li><a href="${noteUrl(b)}">${esc(t.title)}</a></li>` : "";
        }).join("")}</ul></div>` : ""}
        ${n.links && n.links.length ? `<div class="panel"><h4>指向 ${n.links.length}</h4><ul>${n.links.slice(0, 40).map((b) => {
          const t = byId.get(b);
          return t ? `<li><a href="${noteUrl(b)}">${esc(t.title)}</a></li>` : "";
        }).join("")}</ul></div>` : ""}
        <div class="panel"><h4>元数据</h4>
          <div class="mono" style="font-size:11px;color:var(--ink-3);line-height:2">
            <div>路径 ${esc(n.path)}</div>
            <div>字数 ${n.words || 0}</div>
            <div>出链 ${(n.links || []).length} · 入链 ${(n.backlinks || []).length}</div>
            ${RAW_NOTES ? `<div><a class="wikilink" href="${fileUrl(n.path)}">查看原始 Markdown ↗</a></div>` : ""}
          </div>
        </div>
      </aside>`;

    return `<div class="reader">
      <article>
        <div class="crumb">
          <a href="#/">总览</a><span class="sep">/</span>
          ${n.section ? `<a href="${secUrl(n.section)}">${esc(n.section)}</a>` : ""}
          ${n.collection && n.collection !== n.section ? `<span class="sep">/</span><span>${esc(n.collection)}</span>` : ""}
        </div>
        <header class="article-head">
          <h1>${esc(n.title)}</h1>
          <div class="article-meta">
            <span><b>${esc(n.section || "未分类")}</b></span>
            <span>${n.words || 0} 字</span>
            <span>${(n.links || []).length} 出链</span>
            <span>${(n.backlinks || []).length} 入链</span>
            <span style="opacity:.65">${esc(n.path)}</span>
          </div>
        </header>
        <div class="prose">${n.html || `<p class="dim">（此笔记无正文）</p>`}</div>
      </article>
      ${aside}
    </div>`;
  }

  function extractTOC(html) {
    const out = [];
    if (!html) return out;
    const re = /<h([23])[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;
    let m;
    while ((m = re.exec(html))) {
      const txt = m[3].replace(/<[^>]+>/g, "").trim();
      if (txt) out.push({ lvl: +m[1], id: m[2], text: txt });
    }
    return out;
  }

  /* ---------------------------------------------------------- 角色 */

  const FIELD_LABEL = {
    fullname: "全名", gender: "性别", deadname: "deadname", birth: "出生地",
    major: "专业", socionics: "Socionics", mbti: "MBTI", psy: "超心理定位",
    family: "家庭", position: "定位",
  };

  function viewCharacters() {
    const list = IDX.characters || [];
    if (!list.length) return `<div class="empty">没有抽到角色条目</div>`;
    const cards = list.map((c) => {
      const rows = Object.keys(FIELD_LABEL)
        .filter((k) => c.fields && c.fields[k] && k !== "socionics")
        .map((k) => `<dt>${FIELD_LABEL[k]}</dt><dd>${mdInline(c.fields[k])}</dd>`).join("");
      const soc = c.fields && c.fields.socionics ? c.fields.socionics : "";
      return `<div class="charcard">
        <div class="hd">
          <div>
            <div class="nm">${esc(c.name)}</div>
            <div class="sub">${esc(c.section || "")} · ${esc(c.title)}</div>
          </div>
          ${soc ? `<div class="soc">${esc(soc)}</div>` : ""}
        </div>
        <dl>${rows || `<dt>—</dt><dd class="dim">此条目为汇总页，字段见正文</dd>`}</dl>
        <div class="bl"><a class="wikilink" href="${noteUrl(c.id)}">打开条目 →</a></div>
      </div>`;
    }).join("");
    return `<div class="kicker">Personnel</div><h1 class="page-title">角色名录</h1>
      <p class="lede">从角色档案类笔记中自动抽取的结构化字段（姓名 / 性别 / 专业 / Socionics · MBTI / 超心理定位 / 家庭等）。
      字段可能不完整，完整设定以各条目正文为准。</p>
      <div class="grid g3" style="margin-top:26px">${cards}</div>`;
  }

  /* ---------------------------------------------------------- 图鉴 */

  function viewGallery() {
    const cvs = IDX.canvas;
    const canvasCard = cvs ? `
      <a class="gal-card" href="#/g/__canvas" style="grid-column:1/-1">
        <div class="gal-thumb" style="height:260px"><img src="${cvs.svg}" alt="${esc(cvs.name)}" loading="lazy"></div>
        <div class="gal-meta">
          <div class="nm">${esc(cvs.name)} <span class="pill a">Canvas</span></div>
          ${cvs.note ? `<div class="nt">${esc(cvs.note)}</div>` : ""}
          <div class="cd">${(cvs.nodes || []).length} 节点 · ${(cvs.edges || []).length} 连线</div>
        </div>
      </a>` : "";
    const cards = (IDX.gallery || []).map((g) => `
      <a class="gal-card" href="${galUrl(g.id)}">
        <div class="gal-thumb"><img src="${g.thumb || g.svg}" alt="${esc(g.name)}" loading="lazy"></div>
        <div class="gal-meta">
          <div class="nm">${esc(g.name)}</div>
          ${g.note ? `<div class="nt">${esc(g.note)}</div>` : ""}
          <div class="cd">${(g.texts || []).length} 文本块 · ${(g.elinks || []).length} 关联</div>
        </div>
      </a>`).join("");
    return `<div class="kicker">Atlas</div><h1 class="page-title">图鉴画廊</h1>
      <p class="lede">24 张 Excalidraw 手绘图，均由 <b>Excalidraw 官方导出器</b>从源数据转换而来 —— 手绘线条抖动、hachure 填充、Excalifont 字体与源文件完全一致，字体已内联，SVG 可无损缩放。另有 1 张 Obsidian Canvas 总览。点击查看大图与文本大纲。</p>
      <div class="gal-grid" style="margin-top:26px">${canvasCard}${cards}</div>`;
  }

  function viewCanvas() {
    const c = IDX.canvas;
    if (!c) return `<div class="empty">没有 Canvas 数据</div>`;
    const files = (c.nodes || []).filter((n) => n.type === "file");
    const groups = (c.nodes || []).filter((n) => n.type === "group");
    const texts = (c.nodes || []).filter((n) => n.type === "text");
    const uniq = new Map();
    for (const f of files) {
      const k = f.note || f.label;
      if (!uniq.has(k)) uniq.set(k, f);
    }
    const linkList = [...uniq.values()].map((f) => `<li>${f.note
      ? `<a class="wikilink" href="${noteUrl(f.note)}">${esc(f.label)}</a>`
      : `<span class="wikilink dead">${esc(f.label)}</span>`}</li>`).join("");
    const groupList = groups.map((g) => `<li>${esc(g.label || "(未命名分区)")}</li>`).join("");
    return `<div class="crumb"><a href="#/g">图鉴画廊</a><span class="sep">/</span>Canvas 总览</div>
      <h1 class="page-title" style="margin-bottom:8px">${esc(c.name)}</h1>
      <p class="lede" style="margin-bottom:22px">${esc(c.note || "")}</p>
      <div class="gal-view" style="max-height:none"><img src="${c.svg}" alt="${esc(c.name)}"></div>
      <div class="grid g3" style="margin-top:22px">
        <div class="panel card"><h4 class="mono dim" style="font-size:10.5px;letter-spacing:.16em;margin:0 0 10px">关联笔记 (${uniq.size})</h4>
          <ul style="margin:0;padding-left:16px;font-size:13px;line-height:1.9">${linkList}</ul></div>
        <div class="panel card"><h4 class="mono dim" style="font-size:10.5px;letter-spacing:.16em;margin:0 0 10px">分区 (${groups.length})</h4>
          <ul style="margin:0;padding-left:16px;font-size:13px;line-height:1.9">${groupList}</ul></div>
        <div class="panel card"><h4 class="mono dim" style="font-size:10.5px;letter-spacing:.16em;margin:0 0 10px">说明文本 (${texts.length})</h4>
          <ul style="margin:0;padding-left:16px;font-size:12.5px;color:var(--ink-2);line-height:1.8">${texts.map((t) => `<li>${esc(t.label)}</li>`).join("")}</ul></div>
      </div>`;
  }

  function viewGalleryItem(id) {
    if (id === "__canvas") return viewCanvas();
    const g = galByName.get(id) || galById.get(id) || (IDX.gallery || []).find((x) => x.name === id);
    if (!g) return `<div class="empty">找不到图鉴：${esc(id)}<br><br><a class="wikilink" href="#/g">← 图鉴画廊</a></div>`;
    const seen = new Set();
    const rel = (g.elinks || []).map((l) => {
      const m = l.match(/^(.*?)\s*\[\[([^\]\|]+)(?:\|([^\]]*))?\]\]\s*$/);
      if (!m) return `<li>${esc(l)}</li>`;
      const target = m[2];
      const label = m[3] || target.split("/").pop();
      if (seen.has(label)) return "";
      seen.add(label);
      const n = NOTES.find((x) => x.base === target.split("/").pop() || x.id === target || x.title === target);
      return `<li>${n ? `<a class="wikilink" href="${noteUrl(n.id)}">${esc(label)}</a>` : `<span class="wikilink dead">${esc(label)}</span>`}</li>`;
    }).join("");
    const texts = (g.texts || []).map((t) => `<li>${esc(t)}</li>`).join("");
    return `<div class="crumb"><a href="#/g">图鉴画廊</a><span class="sep">/</span>${esc(g.name)}</div>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:28px;align-items:start" class="gal-detail">
        <div>
          <div class="gal-view"><img src="${g.svg}" alt="${esc(g.name)}"></div>
        </div>
        <aside style="position:sticky;top:82px">
          <h1 style="font-size:22px;margin:0 0 8px">${esc(g.name)}</h1>
          ${g.note ? `<p class="lede" style="font-size:13.5px">${esc(g.note)}</p>` : ""}
          ${rel ? `<div class="panel card" style="margin-top:16px"><h4 class="mono dim" style="font-size:10.5px;letter-spacing:.16em;margin:0 0 10px">关联笔记</h4><ul style="margin:0;padding-left:16px;font-size:13px">${rel}</ul></div>` : ""}
          ${texts ? `<div class="panel card" style="margin-top:14px"><h4 class="mono dim" style="font-size:10.5px;letter-spacing:.16em;margin:0 0 10px">图中文本 (${(g.texts || []).length})</h4><ul style="margin:0;padding-left:16px;font-size:12.5px;color:var(--ink-2)">${texts}</ul></div>` : ""}
          <div class="mono" style="font-size:11px;color:var(--ink-3);margin-top:14px">
            <a class="wikilink" href="${g.svg}" target="_blank">原图 SVG ↗</a>${RAW_NOTES ? `<br>
            <a class="wikilink" href="${fileUrl(g.path)}">原始 Markdown ↗</a>` : ""}
          </div>
        </aside>
      </div>`;
  }

  /* ---------------------------------------------------------- 结构化 */

  function viewStructured(key) {
    const sets = IDX.structured || [];
    if (!sets.length) return `<div class="empty">没有结构化数据</div>`;
    const cur = sets.find((s) => s.key === key) || sets[0];
    const tabs = sets.map((s) => `<button data-href="#/x/${enc(s.key)}" class="${s.key === cur.key ? "on" : ""}">${esc(s.title)}</button>`).join("")
      + `<button data-href="#/c" style="margin-left:14px">角色名录 (${(IDX.characters || []).length}) →</button>`;
    let body;
    if (cur.kind === "table") {
      body = (cur.data || []).map((t) => `
        ${t.caption ? `<h2 class="sec-title">${esc(t.caption)}</h2>` : ""}
        <table class="dtable" style="border-collapse:collapse;width:100%;font-size:13.5px;border:1px solid var(--line)">
          <thead><tr>${t.headers.map((h) => `<th style="text-align:left;font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-2);padding:9px 12px;background:var(--bg-3);border-bottom:1px solid var(--line-2)">${esc(h)}</th>`).join("")}</tr></thead>
          <tbody>${t.rows.map((row) => `<tr>${row.map((c) => `<td style="padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top">${mdInline(c)}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>`).join("");
    } else {
      body = (cur.data || []).map((gp) => `
        <h2 class="sec-title">${esc(gp.heading)}</h2>
        <div class="kv">${gp.items.map((it) => `<div class="k">${esc(it.key)}</div><div>${mdInline(it.value) || "<span class='dim'>—</span>"}</div>`).join("")}</div>`).join("");
    }
    return `<div class="kicker">Structured Data</div><h1 class="page-title">结构化内容</h1>
      <p class="lede">把散落在原文里的对照表、编号规则与映射关系抽取成可快速查阅的数据视图。</p>
      <div class="tabs" style="margin-top:24px">${tabs}</div>
      <div class="crumb mono" style="font-size:11px;color:var(--ink-3);margin-bottom:16px">来源：${cur.sourceId ? `<a class="wikilink" href="${noteUrl(cur.sourceId)}">${esc(cur.source)}</a>` : esc(cur.source)} — ${esc(cur.desc || "")}</div>
      ${body}`;
  }

  function mdInline(s) {
    if (!s) return "";
    let t = esc(s);
    t = t.replace(/\[\[([^\]\|]+)(?:\|([^\]]*))?\]\]/g, (m, a, b) => {
      const n = NOTES.find((x) => x.base === a.split("/").pop() || x.id === a || x.title === a);
      const label = b || a.split("/").pop();
      return n ? `<a class="wikilink" href="${noteUrl(n.id)}">${esc(label)}</a>` : `<span class="wikilink dead">${esc(label)}</span>`;
    });
    t = t.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    t = t.replace(/`([^`]+)`/g, '<code style="font-family:var(--font-mono);font-size:.88em;color:var(--cyan)">$1</code>');
    return t;
  }

  /* ---------------------------------------------------------- 搜索 */

  let SEARCH_INDEX = null;
  function buildIndex() {
    if (SEARCH_INDEX) return SEARCH_INDEX;
    SEARCH_INDEX = NOTES.map((n) => ({
      n,
      low: ((n.title || "") + " " + (n.base || "") + " " + (n.blurb || "") + " " + (n.text || "")).toLowerCase(),
      titleLow: ((n.title || "") + " " + (n.base || "")).toLowerCase(),
    }));
    return SEARCH_INDEX;
  }

  function doSearch(q) {
    const idx = buildIndex();
    const lq = q.toLowerCase().trim();
    if (!lq) return [];
    const terms = lq.split(/\s+/).filter(Boolean);
    const res = [];
    for (const it of idx) {
      let score = 0, ok = true;
      for (const t of terms) {
        const inTitle = it.titleLow.includes(t);
        const cnt = it.low.split(t).length - 1;
        if (!cnt) { ok = false; break; }
        score += (inTitle ? 40 : 0) + Math.min(cnt, 8);
      }
      if (!ok) continue;
      if (it.titleLow.includes(lq)) score += 60;
      res.push([score, it.n]);
    }
    res.sort((a, b) => b[0] - a[0]);
    return res.slice(0, 60).map((x) => x[1]);
  }

  function snippet(n, q) {
    const src = n.text || "";
    const lq = q.toLowerCase();
    let pos = -1;
    for (const t of lq.split(/\s+/).filter(Boolean)) {
      pos = src.toLowerCase().indexOf(t);
      if (pos >= 0) break;
    }
    if (pos < 0) return esc((n.blurb || "").slice(0, 200));
    const from = Math.max(0, pos - 70);
    let s = src.slice(from, from + 260);
    s = esc(s);
    for (const t of q.split(/\s+/).filter(Boolean)) {
      try { s = s.replace(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), (x) => `<em>${x}</em>`); } catch (e) {}
    }
    return (from > 0 ? "…" : "") + s + "…";
  }

  function viewSearch(q) {
    const query = q || "";
    const hits = query ? doSearch(query) : [];
    return `<div class="kicker">Full-text</div><h1 class="page-title">全文检索</h1>
      <p class="lede">对全部 ${NOTES.length} 篇笔记的正文做子串检索；空格分隔多个关键词（须全部命中）。</p>
      <form class="searchbar-big" id="searchform" style="margin-top:22px">
        <input id="q" type="search" placeholder="如：Zone 飞地 / Astral / 千禧年事件" value="${esc(query)}" autocomplete="off">
      </form>
      ${query ? (hits.length ? `<div class="mono dim" style="font-size:11px;margin-bottom:14px">${hits.length} 条结果</div>` +
        hits.map((n) => `<a class="hit" href="${noteUrl(n.id)}" style="display:block">
          <div class="t">${esc(n.title)}</div>
          <div class="p">${esc(n.section || "")} › ${esc(n.path)}</div>
          <div class="x">${snippet(n, query)}</div></a>`).join("")
        : `<div class="empty">没有命中「${esc(query)}」</div>`) : ""}`;
  }

  function mountSearch() {
    const f = $("#searchform");
    if (!f) return;
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      location.hash = "#/q/" + enc($("#q").value.trim());
    });
  }

  /* ---------------------------------------------------------- 关系图 */

  let graphStop = null;
  function viewGraph() {
    const linkCount = NOTES.reduce((a, n) => a + (n.links || []).filter((t) => byId.has(t)).length, 0);
    return `<div class="kicker">Wikilink Network</div>
      <h1 class="page-title" style="margin-bottom:6px">关系图</h1>
      <p class="lede" style="margin-bottom:18px">${NOTES.length} 个节点 · ${linkCount} 条 wikilink 边 · 颜色表示所属分类。拖拽平移、滚轮缩放、悬停高亮、点击打开笔记。</p>
      <div class="graphwrap">
        <canvas id="graph"></canvas>
        <div class="graph-legend" id="glegend"></div>
        <div class="graph-hint">拖拽平移 · 滚轮缩放 · 点击节点打开 · 双击空白复位</div>
      </div>`;
  }

  function mountGraph() {
    if (graphStop) { graphStop(); graphStop = null; }
    const cv = $("#graph");
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    const PAL = ["#e2a838", "#4fc7d4", "#8b7ff0", "#6fca8b", "#e2657f", "#d98a4f", "#7f9df0", "#c07fe0",
      "#5fb8a8", "#e0b060", "#90a0e8", "#e07f9f", "#a8c46a", "#6fa8d8", "#d8a0c0", "#8fc0a0"];
    const secs = (IDX.sections || []).map((s) => s.name);
    const secColor = new Map(secs.map((s, i) => [s, PAL[i % PAL.length]]));

    const nodes = NOTES.map((n, i) => ({
      id: n.id, title: n.title, sec: n.section,
      x: Math.cos((i / NOTES.length) * Math.PI * 2) * 380 + (Math.random() - 0.5) * 60,
      y: Math.sin((i / NOTES.length) * Math.PI * 2) * 380 + (Math.random() - 0.5) * 60,
      vx: 0, vy: 0, deg: (n.links || []).length + (n.backlinks || []).length,
      r: 2.6 + Math.min(6, Math.sqrt((n.words || 0) / 260)),
    }));
    const idxOf = new Map(nodes.map((n, i) => [n.id, i]));
    const edges = [];
    for (const n of NOTES) {
      for (const t of (n.links || [])) {
        if (idxOf.has(t) && t !== n.id) edges.push([idxOf.get(n.id), idxOf.get(t)]);
      }
    }

    let W = 0, H = 0;
    function resize() {
      const r = cv.parentElement.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + "px"; cv.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    const view = { x: 0, y: 0, k: Math.min(W, H) / 1100 };
    let hover = -1, drag = null, panning = null, alpha = 1;

    /* 力导向 */
    function step() {
      const cx = 0, cy = 0;
      for (const n of nodes) { n.fx = 0; n.fy = 0; }
      // 斥力（Barnes-Hut 简化为采样）
      const N = nodes.length;
      for (let i = 0; i < N; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < N; j++) {
          const b = nodes[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) d2 = 1;
          if (d2 > 90000) continue;
          const f = 2600 / d2;
          const d = Math.sqrt(d2);
          const ux = dx / d, uy = dy / d;
          a.fx -= ux * f; a.fy -= uy * f;
          b.fx += ux * f; b.fy += uy * f;
        }
      }
      // 弹簧
      for (const [i, j] of edges) {
        const a = nodes[i], b = nodes[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - 96) * 0.014;
        const ux = dx / d, uy = dy / d;
        a.fx += ux * f; a.fy += uy * f;
        b.fx -= ux * f; b.fy -= uy * f;
      }
      // 向心 + 分类聚类
      for (const n of nodes) {
        n.fx += (cx - n.x) * 0.008;
        n.fy += (cy - n.y) * 0.008;
        const a = secs.indexOf(n.sec);
        if (a >= 0) {
          const ang = (a / secs.length) * Math.PI * 2;
          const gx = Math.cos(ang) * 300, gy = Math.sin(ang) * 300;
          n.fx += (gx - n.x) * 0.004;
          n.fy += (gy - n.y) * 0.004;
        }
      }
      for (const n of nodes) {
        n.vx = (n.vx + n.fx * alpha) * 0.82;
        n.vy = (n.vy + n.fy * alpha) * 0.82;
        n.x += n.vx; n.y += n.vy;
      }
      alpha *= 0.994;
      if (alpha < 0.02) alpha = 0.02;
    }

    function toScreen(x, y) { return [(x + view.x) * view.k + W / 2, (y + view.y) * view.k + H / 2]; }
    function toWorld(sx, sy) { return [(sx - W / 2) / view.k - view.x, (sy - H / 2) / view.k - view.y]; }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#080910";
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      // 边
      ctx.lineWidth = Math.max(0.35, view.k * 0.8);
      for (const [i, j] of edges) {
        const a = nodes[i], b = nodes[j];
        const hl = hover === i || hover === j;
        ctx.strokeStyle = hl ? "rgba(226,168,56,0.75)" : "rgba(150,160,200,0.16)";
        const [x1, y1] = toScreen(a.x, a.y), [x2, y2] = toScreen(b.x, b.y);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      // 点
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const [x, y] = toScreen(n.x, n.y);
        if (x < -40 || y < -40 || x > W + 40 || y > H + 40) continue;
        const c = secColor.get(n.sec) || "#8a8f9c";
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1.6, n.r * view.k * 1.4), 0, Math.PI * 2);
        ctx.fillStyle = hover === i ? "#fff" : c;
        ctx.globalAlpha = hover === i ? 1 : 0.88;
        ctx.fill();
        ctx.globalAlpha = 1;
        if (hover === i) {
          ctx.save();
          ctx.font = "600 12px 'Source Han Sans CN', sans-serif";
          const label = n.title.length > 22 ? n.title.slice(0, 22) + "…" : n.title;
          const tw = ctx.measureText(label).width;
          ctx.fillStyle = "rgba(10,11,16,0.92)";
          ctx.fillRect(x + 9, y - 10, tw + 14, 21);
          ctx.strokeStyle = "rgba(226,168,56,0.6)";
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 9, y - 10, tw + 14, 21);
          ctx.fillStyle = "#e8e6e1";
          ctx.fillText(label, x + 16, y + 5);
          ctx.restore();
        }
      }
      ctx.restore();
    }

    let running = true;
    function loop() {
      if (!running) return;
      step(); draw();
      requestAnimationFrame(loop);
    }

    // 交互
    function pick(sx, sy) {
      let best = -1, bd = 12 * 12;
      for (let i = 0; i < nodes.length; i++) {
        const [x, y] = toScreen(nodes[i].x, nodes[i].y);
        const d = (x - sx) * (x - sx) + (y - sy) * (y - sy);
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    }
    const rectPos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

    cv.addEventListener("mousemove", (e) => {
      const [sx, sy] = rectPos(e);
      if (panning) {
        view.x += (sx - panning[0]) / view.k;
        view.y += (sy - panning[1]) / view.k;
        panning = [sx, sy];
        return;
      }
      if (drag) {
        const [wx, wy] = toWorld(sx, sy);
        const n = nodes[drag.i];
        n.x = wx; n.y = wy; n.vx = n.vy = 0;
        return;
      }
      const h = pick(sx, sy);
      if (h !== hover) { hover = h; cv.style.cursor = h >= 0 ? "pointer" : "grab"; }
    });
    cv.addEventListener("mousedown", (e) => {
      const [sx, sy] = rectPos(e);
      const h = pick(sx, sy);
      if (h >= 0) { drag = { i: h, moved: 0 }; cv.classList.add("drag"); }
      else { panning = [sx, sy]; cv.classList.add("drag"); }
    });
    window.addEventListener("mouseup", (e) => {
      if (drag) {
        const [sx, sy] = rectPos(e);
        if (Math.abs(sx - toScreen(nodes[drag.i].x, nodes[drag.i].y)[0]) < 6) location.hash = noteUrl(nodes[drag.i].id);
      }
      drag = null; panning = null; cv.classList.remove("drag");
    });
    cv.addEventListener("click", (e) => {
      const [sx, sy] = rectPos(e);
      const h = pick(sx, sy);
      if (h >= 0) location.hash = noteUrl(nodes[h].id);
    });
    cv.addEventListener("dblclick", () => { view.x = 0; view.y = 0; view.k = Math.min(W, H) / 1100; alpha = 0.9; });
    cv.addEventListener("wheel", (e) => {
      e.preventDefault();
      const [sx, sy] = rectPos(e);
      const [bx, by] = toWorld(sx, sy);
      view.k *= e.deltaY < 0 ? 1.12 : 0.89;
      view.k = Math.max(0.12, Math.min(6, view.k));
      const [ax, ay] = toWorld(sx, sy);
      view.x += ax - bx; view.y += ay - by;
    }, { passive: false });

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    const leg = $("#glegend");
    if (leg) leg.innerHTML = secs.map((s) => `<div><i style="background:${secColor.get(s)}"></i>${esc(s)}</div>`).join("");

    loop();
    graphStop = () => { running = false; window.removeEventListener("resize", onResize); };
  }

  /* ---------------------------------------------------------- 全局交互 */

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-href]");
    if (el) { location.hash = el.getAttribute("data-href"); return; }
    const toc = e.target.closest("[data-toc]");
    if (toc) {
      e.preventDefault();
      const id = toc.getAttribute("data-toc");
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  window.addEventListener("hashchange", render);

  const gs = $("#globalsearch");
  if (gs) {
    gs.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && gs.value.trim()) location.hash = "#/q/" + enc(gs.value.trim());
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !/input|textarea/i.test(document.activeElement.tagName)) {
      e.preventDefault();
      const q = $("#globalsearch") || $("#q");
      if (q) q.focus();
    }
  });

  if (!location.hash) location.hash = "#/";
  render();
})();
