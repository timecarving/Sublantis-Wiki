/* ============================================================================
   Sublantis 世界观档案库 · 前端
   hash 路由： #/ 总览 · #/s 分类 · #/n/<id> 笔记 · #/x 结构化
              #/c 角色 · #/g 图鉴 · #/map 关系图 · #/q/<词> 检索
   兼容旧前缀 note / gallery
   ========================================================================== */
(function () {
  "use strict";

  var IDX = window.SUBLANTIS_INDEX;
  var NOTES = window.SUBLANTIS_NOTES;
  var GALLERY = IDX.gallery || [];
  var SECTIONS = IDX.sections || [];
  var RAW_NOTES = location.protocol === "file:";

  var byId = new Map(NOTES.map(function (n) { return [n.id, n]; }));
  var galById = new Map(GALLERY.map(function (g) { return [g.id, g]; }));
  var galByName = new Map(GALLERY.map(function (g) { return [g.id.replace(/\.excalidraw$/, ""), g]; }));
  var secIndex = new Map(SECTIONS.map(function (s, i) { return [s.name, i]; }));

  var DIRS = ["fire", "earth", "wind", "water"];
  var DVAR = { fire: "var(--fire)", earth: "var(--earth)", wind: "var(--wind)", water: "var(--water)" };

  function dirOf(name) {
    var i = secIndex.has(name) ? secIndex.get(name) : 0;
    return DIRS[i % 4];
  }

  var NAV = [
    ["#/", "总览"],
    ["#/s", "分类"],
    ["#/x", "结构化"],
    ["#/c", "角色"],
    ["#/g", "图版"],
    ["#/map", "关系图"],
    ["#/q", "检索"]
  ];

  var FIELD_LABEL = {
    fullname: "全名", gender: "性别", deadname: "旧名", birth: "出生地",
    major: "专业", socionics: "Socionics", mbti: "MBTI", psy: "超心理定位",
    family: "家庭", position: "定位"
  };

  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function enc(s) { return encodeURIComponent(s); }
  function noteUrl(id) { return "#/n/" + enc(id); }
  function galUrl(id) { return "#/g/" + enc(id); }
  function secUrl(name) { return "#/s/" + enc(name); }
  function fileUrl(p) { return "笔记/" + p.split("/").map(encodeURIComponent).join("/"); }
  function words(n) { return n >= 10000 ? (n / 10000).toFixed(1) + " 万字" : n + " 字"; }
  function pad2(n) { return String(n).padStart(2, "0"); }

  /* 十六进制纪年：月日各取十六进制，例如 10-16 写作 0x 0A·10 */
  function hexDay() {
    var d = (IDX.meta && IDX.meta.builtAt) || "";
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
    if (!m) return "";
    return "0x " + Number(m[2]).toString(16).toUpperCase().padStart(2, "0") +
      "·" + Number(m[3]).toString(16).toUpperCase().padStart(2, "0");
  }

  var ORDER = [], ORDER_IDX = new Map();
  (function buildOrder() {
    var seen = new Set();
    function push(id) { if (byId.has(id) && !seen.has(id)) { seen.add(id); ORDER.push(id); } }
    SECTIONS.forEach(function (s) {
      (s.collections || []).forEach(function (c) { (c.ids || []).forEach(push); });
    });
    NOTES.forEach(function (n) { push(n.id); });
    ORDER.forEach(function (id, i) { ORDER_IDX.set(id, i); });
  })();

  function docbar(sec, right) {
    return '<div class="docbar"><div class="in">' +
      '<span class="sec">档案 / ' + esc(sec) + "</span>" +
      "<span>" + esc((IDX.meta && IDX.meta.name) || "Sublantis") + "</span>" +
      '<div class="r">' + (right || "") + "</div></div></div>";
  }

  function crumb(parts) {
    return '<div class="crumb">' + parts.map(function (p, i) {
      var pre = i ? '<span class="sep">/</span>' : "";
      return pre + (p[1] ? '<a href="' + p[1] + '">' + esc(p[0]) + "</a>" : "<span>" + esc(p[0]) + "</span>");
    }).join("") + "</div>";
  }

  function pageHead(kicker, title, lede) {
    return '<div class="page">' +
      '<div class="kicker">' + esc(kicker) + "</div>" +
      '<h1 class="page-title">' + esc(title) + "</h1>" +
      (lede ? '<p class="lede">' + lede + "</p>" : "") + "</div>";
  }

  function proseHtml(note, two) {
    var sc = DVAR[dirOf(note.section)];
    return '<div class="prose' + (two ? " two" : "") + '" style="--sc:' + sc + '">' + note.html + "</div>";
  }

  function tocOf(note) {
    var out = [], re = /<h([23])[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g, m;
    while ((m = re.exec(note.html))) {
      var t = m[3].replace(/<[^>]+>/g, "")
        .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'").replace(/&amp;/g, "&").trim();
      out.push({ lv: +m[1], id: m[2], t: t });
    }
    return out;
  }

  function edgeCount() {
    var s = new Set();
    NOTES.forEach(function (n) {
      (n.links || []).forEach(function (t) { s.add(n.id + ">" + t); });
    });
    return s.size;
  }

  /* ---------------------------------------------------------------- 总览 */

  function viewHome() {
    var totalWords = NOTES.reduce(function (a, n) { return a + (n.words || 0); }, 0);
    var rows = SECTIONS.map(function (s, i) {
      var inSec = NOTES.filter(function (n) { return n.section === s.name; });
      var w = inSec.reduce(function (a, n) { return a + (n.words || 0); }, 0);
      var sample = inSec.slice().sort(function (a, b) { return (b.words || 0) - (a.words || 0); }).slice(0, 3);
      return '<a href="' + secUrl(s.name) + '" style="--dc:' + DVAR[DIRS[i % 4]] + '">' +
        '<span class="no">' + pad2(i + 1) + "</span>" +
        '<span class="nm">' + esc(s.name) + "</span>" +
        '<span class="meta">' + s.count + " 篇 / " + (w / 10000).toFixed(1) + " 万字</span>" +
        '<span class="samp">' + sample.map(function (n) { return esc(n.title); }).join(" · ") + "</span></a>";
    }).join("");

    var thumbs = GALLERY.slice(0, 8).map(function (g) {
      return '<a class="ts" href="' + galUrl(g.id) + '"><img src="' + esc(g.thumb || g.svg) +
        '" alt="' + esc(g.name) + '" loading="lazy"><b>' + esc(g.name) + "</b></a>";
    }).join("");

    var quad = [
      ["#/x", "结构化档案", 0, "9 组对照表与键值表"],
      ["#/c", "角色名录", 1, (IDX.characters ? IDX.characters.length : 0) + " 条人物字段"],
      ["#/g", "图版图鉴", 3, GALLERY.length + " 张手绘图与总览 Canvas"],
      ["#/map", "关系网络", 2, NOTES.length + " 节点 / " + edgeCount() + " 条双链"]
    ].map(function (q) {
      return '<a href="' + q[0] + '" style="--dc:' + DVAR[DIRS[q[2]]] + '"><b>' + q[1] + "</b><span>" + q[3] + "</span></a>";
    }).join("");

    return docbar("总览", "<span>" + NOTES.length + " 篇</span><span>" + hexDay() + "</span>") +
      '<div class="frame">' +
      '<section class="mast">' +
      "<div>" +
      '<div class="kicker">OC 世界观设定集</div>' +
      "<h1>Sublantis</h1>" +
      '<p class="cn">沉入潜意识<span class="em">的</span>亚特兰蒂斯</p>' +
      '<p class="lede">神秘学被工程化，CCRU 伪史与计算机科学对位。十六个 Zone 共用一套进制，' +
      "一份被归档的世界，而不是一部被讲述的小说。</p>" +
      '<span class="scope">收录范围：仅 Sublantis / HMLC 本体设定。作者其他作品与未来作品的规划不入站。' +
      "原文逐字保留，图版由 Excalidraw 官方导出器转换，字体已内联。</span>" +
      "</div>" +
      '<div class="facts">' +
      '<div class="row"><span class="k">笔记</span><span class="n">' + NOTES.length + "</span></div>" +
      '<div class="row"><span class="k">图版</span><span class="n">' + GALLERY.length + "</span></div>" +
      '<div class="row"><span class="k">分类</span><span class="n">' + SECTIONS.length + "</span></div>" +
      '<div class="row"><span class="k">字数</span><span class="n">' + (totalWords / 10000).toFixed(1) + "万</span></div>" +
      "</div></section>" +
      '<h2 class="sec-title">分类索引<span class="cnt">' + SECTIONS.length + " 类</span></h2>" +
      '<div class="rowidx">' + rows + "</div>" +
      '<h2 class="sec-title">图版<span class="cnt">' + GALLERY.length + ' 张</span>' +
      '<span class="more"><a href="#/g">全部 →</a></span></h2>' +
      '<div class="thumbstrip">' + thumbs + "</div>" +
      '<h2 class="sec-title">入口</h2>' +
      '<div class="quad">' + quad + "</div></div>";
  }

  function viewSections() {
    var rows = SECTIONS.map(function (s, i) {
      var inSec = NOTES.filter(function (n) { return n.section === s.name; });
      var w = inSec.reduce(function (a, n) { return a + (n.words || 0); }, 0);
      var sample = inSec.slice().sort(function (a, b) { return (b.words || 0) - (a.words || 0); }).slice(0, 4);
      return '<a href="' + secUrl(s.name) + '" style="--dc:' + DVAR[DIRS[i % 4]] + '">' +
        '<span class="no">' + pad2(i + 1) + "</span>" +
        '<span class="nm">' + esc(s.name) + "</span>" +
        '<span class="meta">' + s.count + " 篇 / " + (w / 10000).toFixed(1) + " 万字</span>" +
        '<span class="samp">' + sample.map(function (n) { return esc(n.title); }).join(" · ") + "</span></a>";
    }).join("");
    return docbar("分类", "<span>" + SECTIONS.length + " 类</span>") +
      '<div class="frame">' + pageHead("目录", "分类索引", "按总览 MOC 的两级树展开。编号为阅读顺序，颜色为四方位色，按索引循环使用。") +
      '<div class="rowidx">' + rows + "</div></div>";
  }

  function viewSection(name) {
    var idx = secIndex.has(name) ? secIndex.get(name) : -1;
    var s = idx >= 0 ? SECTIONS[idx] : null;
    if (!s) return viewSections();
    var inSec = NOTES.filter(function (n) { return n.section === name; });
    var items = inSec.sort(function (a, b) {
      var ia = ORDER_IDX.has(a.id) ? ORDER_IDX.get(a.id) : 1e9;
      var ib = ORDER_IDX.has(b.id) ? ORDER_IDX.get(b.id) : 1e9;
      return ia - ib;
    }).map(function (n) {
      return '<div class="noteitem" data-href="' + noteUrl(n.id) + '">' +
        '<span class="t">' + esc(n.title) + "</span>" +
        '<span class="d">' + words(n.words || 0) + "</span>" +
        (n.blurb ? '<span class="b">' + esc(n.blurb) + "</span>" : "") + "</div>";
    }).join("");

    return docbar(name, "<span>" + s.count + " 篇</span><span>" + hexDay() + "</span>") +
      '<div class="frame"><div class="page">' +
      crumb([["总览", "#/"], ["分类", "#/s"], [name, null]]) +
      '<div class="kicker">分类 ' + pad2(idx + 1) + " / " + pad2(SECTIONS.length) + "</div>" +
      '<h1 class="page-title">' + esc(name) + "</h1>" +
      ((s.intro && s.intro.length) ? '<p class="lede">' + esc(s.intro.join(" ")) + "</p>" : "") +
      "</div>" +
      '<div class="rowidx" style="margin-top:26px">' + items + "</div></div>";
  }

  /* ---------------------------------------------------------------- 笔记 */

  /* 统计正文里「连续散文」的比例：表格 / 项目符号多的笔记分栏会很难读 */
  function runningText(html) {
    var ps = html.match(/<p>[\s\S]*?<\/p>/g) || [];
    var len = 0;
    ps.forEach(function (s) { len += s.replace(/<[^>]+>/g, "").length; });
    return { len: len, n: ps.length };
  }

  function useTwoColumn(n) {
    if (n.kind === "gallery") return false;
    if ((n.words || 0) < 900) return false;
    if (window.innerWidth < 1180) return false;
    var pref = localStorage.getItem("sub-cols");
    if (pref === "one") return false;
    if (pref === "two") return true;
    var rt = runningText(n.html || "");
    return rt.len >= 1500 && rt.n >= 6;
  }

  function notFound(id) {
    return docbar("未找到", "") + '<div class="frame"><div class="page">' +
      '<div class="kicker">404</div><h1 class="page-title">未收录的条目</h1>' +
      '<p class="lede mono dim">' + esc(id) + "</p>" +
      '<div class="empty">这份档案里没有这一页。<br><a href="#/" style="text-decoration:underline">回到总览</a></div></div></div>';
  }

  function viewNote(id) {
    var n = byId.get(id);
    if (!n) return notFound(id);
    var two = useTwoColumn(n);
    var toc = tocOf(n);
    var i = ORDER_IDX.has(id) ? ORDER_IDX.get(id) : -1;
    var prev = i > 0 ? byId.get(ORDER[i - 1]) : null;
    var next = (i >= 0 && i < ORDER.length - 1) ? byId.get(ORDER[i + 1]) : null;

    var aside = "<aside>";
    if (toc.length) {
      aside += '<div class="panel"><h4>本页目录</h4><ol>' + toc.map(function (t) {
        return '<li><a href="#" data-toc="' + esc(t.id) + '">' + esc(t.t) + "</a></li>";
      }).join("") + "</ol></div>";
    }
    if (n.backlinks && n.backlinks.length) {
      aside += '<div class="panel"><h4>反向链接 ' + n.backlinks.length + "</h4><ul>" +
        n.backlinks.slice(0, 40).map(function (b) {
          var t = byId.get(b);
          return '<li><a href="' + noteUrl(b) + '">' + esc(t ? t.title : b) + "</a></li>";
        }).join("") + "</ul></div>";
    }
    if (n.links && n.links.length) {
      aside += '<div class="panel"><h4>指向 ' + n.links.length + "</h4><ul>" +
        n.links.slice(0, 40).map(function (b) {
          var t = byId.get(b);
          return '<li><a href="' + noteUrl(b) + '">' + esc(t ? t.title : b) + "</a></li>";
        }).join("") + "</ul></div>";
    }
    aside += '<div class="panel"><h4>元数据</h4><div class="kv">' +
      "<div>路径 <b>" + esc(n.path) + "</b></div>" +
      "<div>字数 <b>" + (n.words || 0) + "</b></div>" +
      "<div>分类 <b>" + esc(n.section || "") + "</b></div>" +
      (RAW_NOTES ? '<div><a href="' + fileUrl(n.path) + '" target="_blank">查看原始 Markdown ↗</a></div>' : "") +
      "</div></div></aside>";

    var pager = '<nav class="pager">' +
      (prev ? '<a href="' + noteUrl(prev.id) + '"><span class="dir">← 上一篇</span><span class="t">' + esc(prev.title) + "</span></a>" : "<span></span>") +
      (next ? '<a class="nx" href="' + noteUrl(next.id) + '"><span class="dir">下一篇 →</span><span class="t">' + esc(next.title) + "</span></a>" : "<span></span>") +
      "</nav>";

    return docbar(n.section || "笔记", "<span>" + words(n.words || 0) + "</span><span>" + hexDay() + "</span>") +
      '<div class="frame"><div class="reader">' +
      "<article>" +
      crumb([["总览", "#/"], ["分类", "#/s"], [n.section || "其他", secUrl(n.section || "")], [n.title, null]]) +
      '<div class="article-head"><h1>' + esc(n.title) + "</h1>" +
      '<div class="article-meta">' +
      "<span>分类 <b>" + esc(n.section || "") + "</b></span>" +
      "<span>" + (n.words || 0) + " 字</span>" +
      "<span>出链 " + ((n.links || []).length) + "</span>" +
      "<span>入链 " + ((n.backlinks || []).length) + "</span>" +
      '<span class="path">' + esc(n.path) + "</span>" +
      '<button class="cols-toggle' + (two ? " on" : "") + '" id="colsbtn">' + (two ? "双栏" : "单栏") + "</button>" +
      "</div></div>" + proseHtml(n, two) + pager + "</article>" + aside +
      "</div></div>";
  }

  /* ---------------------------------------------------------------- 角色 */

  function viewCharacters() {
    var list = IDX.characters || [];
    var cards = list.map(function (c, i) {
      var f = c.fields || {};
      var keys = Object.keys(FIELD_LABEL).filter(function (k) { return f[k]; });
      var kv = keys.map(function (k) {
        return '<div class="row"><span class="k">' + FIELD_LABEL[k] + '</span><span class="v">' + esc(f[k]) + "</span></div>";
      }).join("");
      return '<div class="charcard">' +
        '<div><div class="nm">' + esc(c.name) + "</div>" +
        '<div class="sub2">' + pad2(i + 1) + " / " + esc(c.title || "") + "</div>" +
        (f.socionics ? '<span class="soc">' + esc(f.socionics) + "</span>" : "") +
        (c.id ? '<div style="margin-top:10px"><a class="pill" href="' + noteUrl(c.id) + '">打开条目</a></div>' : "") +
        "</div>" +
        '<div class="kv">' + (kv || '<div class="dim mono" style="font-size:11px">此条目为汇总页，字段见正文</div>') + "</div></div>";
    }).join("");

    return docbar("角色", "<span>" + list.length + " 条</span>") +
      '<div class="frame">' +
      pageHead("人物档案", "角色名录", "字段从角色档案笔记中自动抽取，可能不完整，完整设定以条目正文为准。") +
      "<div>" + cards + "</div></div>";
  }

  /* ---------------------------------------------------------------- 图版 */

  function viewGallery() {
    var cards = GALLERY.map(function (g, i) {
      return '<a class="gal-card" href="' + galUrl(g.id) + '" data-q="' +
        esc((g.name + " " + (g.note || "") + " " + (g.elinks || []).join(" ")).toLowerCase()) + '">' +
        '<span class="gal-thumb"><img src="' + esc(g.thumb || g.svg) + '" alt="' + esc(g.name) + '" loading="lazy"></span>' +
        '<span class="gal-meta"><span class="nm">' + esc(g.name) + "</span>" +
        '<span class="nt">' + esc(g.note || "") + "</span>" +
        '<span class="cd">' + pad2(i + 1) + " / " + (g.texts || []).length + " 文本块 · " + (g.elinks || []).length + " 关联</span></span></a>";
    }).join("");

    var canvasCard = "";
    if (IDX.canvas) {
      canvasCard = '<a class="gal-card" href="#/g/__canvas" data-q="canvas 总览 世界观">' +
        '<span class="gal-thumb"><img src="' + esc(IDX.canvas.svg) + '" alt="Canvas 总览" loading="lazy"></span>' +
        '<span class="gal-meta"><span class="nm">' + esc(IDX.canvas.name) + "</span>" +
        '<span class="nt">' + esc(IDX.canvas.note || "") + "</span>" +
        '<span class="cd">Canvas · ' + (IDX.canvas.nodes || []).length + " 节点 · " + (IDX.canvas.edges || []).length + " 连线</span></span></a>";
    }

    return docbar("图版", "<span>" + GALLERY.length + " 张</span>") +
      '<div class="frame">' +
      pageHead("图版", "图鉴画廊", "24 张手绘图由 Excalidraw 官方导出器从源数据转换而来，手绘线条与字体与源文件一致，字体已内联。另有 1 张 Obsidian Canvas 总览。") +
      '<input id="galfilter" class="galfilter" type="search" placeholder="筛选：名称 / 摘要 / 关联笔记" autocomplete="off">' +
      '<div class="mono dim" id="galfilter-note" style="font-size:10px;letter-spacing:.1em;margin-bottom:12px"></div>' +
      '<div class="gal-grid">' + canvasCard + cards + "</div></div>";
  }

  function viewCanvas() {
    var c = IDX.canvas;
    if (!c) return notFound("canvas");
    var nodes = (c.nodes || []).filter(function (n) { return n.type === "file" && n.note; });
    var groups = (c.nodes || []).filter(function (n) { return n.type === "group" && n.label; });
    var texts = (c.nodes || []).filter(function (n) { return n.type === "text" && n.label; });

    var aside = '<div class="g2 grid" style="margin-top:28px">' +
      '<div class="card"><h4 class="mono" style="font-size:9.5px;letter-spacing:.2em;color:var(--ink-3);margin:0 0 10px">关联笔记 ' + nodes.length + "</h4>" +
      '<ul class="mono" style="list-style:none;margin:0;padding:0;font-size:11.5px;line-height:1.9">' +
      nodes.slice(0, 60).map(function (n) {
        return '<li><a href="' + noteUrl(n.note) + '" style="border-bottom:1px solid var(--line)">' + esc(n.label) + "</a></li>";
      }).join("") + "</ul></div>" +
      '<div class="card"><h4 class="mono" style="font-size:9.5px;letter-spacing:.2em;color:var(--ink-3);margin:0 0 10px">分区 ' + groups.length + "</h4>" +
      '<ul class="mono" style="list-style:none;margin:0;padding:0;font-size:11.5px;line-height:1.9">' +
      groups.map(function (g) { return "<li>" + esc(g.label) + "</li>"; }).join("") + "</ul></div></div>";

    return docbar("图版", "<span>Canvas</span>") +
      '<div class="frame">' +
      crumb([["总览", "#/"], ["图版", "#/g"], ["Canvas 总览", null]]) +
      '<div class="page"><div class="kicker">图版</div>' +
      '<h1 class="page-title">' + esc(c.name) + "</h1>" +
      '<p class="lede">' + esc(c.note || "") + "</p></div>" +
      '<div class="gal-view" style="margin-top:26px"><img class="zoomable" src="' + esc(c.svg) + '" alt="' + esc(c.name) + '"></div>' +
      aside +
      (texts.length ? '<div class="mono dim" style="font-size:10.5px;line-height:1.9;margin-top:20px;border-top:1px solid var(--line);padding-top:14px">' +
        texts.map(function (t) { return esc(t.label); }).join("<br>") + "</div>" : "") +
      "</div>";
  }

  function viewGalleryItem(id) {
    if (id === "__canvas") return viewCanvas();
    var g = galById.get(id) || galByName.get(id);
    if (!g) return notFound(id);
    var seen = new Set();
    var elinks = (g.elinks || []).map(function (line) {
      var t = line.replace(/^[^:]*:\s*/, "");
      var m = /\[\[([^\]\|]+)(?:\|([^\]]*))?\]\]/.exec(t);
      if (!m) return null;
      var label = (m[2] || m[1]).trim();
      return { target: m[1].trim(), label: label };
    }).filter(function (e) {
      if (!e || seen.has(e.label)) return false;
      seen.add(e.label);
      return true;
    });

    var linkList = elinks.length ?
      '<ul class="mono" style="list-style:none;margin:0;padding:0;font-size:11.5px;line-height:1.9">' +
      elinks.map(function (e) {
        var n = byId.get(e.target);
        return "<li>" + (n ? '<a href="' + noteUrl(n.id) + '" style="border-bottom:1px solid var(--line)">' + esc(e.label) + "</a>"
          : '<span class="dim">' + esc(e.label) + "</span>") + "</li>";
      }).join("") + "</ul>" : '<div class="mono dim" style="font-size:11px">这张图没有元素级关联笔记</div>';

    var texts = (g.texts || []).length ?
      '<ul class="mono" style="list-style:none;margin:0;padding:0;font-size:11px;line-height:1.85;color:var(--ink-2)">' +
      g.texts.slice(0, 90).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>"
      : '<div class="mono dim" style="font-size:11px">无</div>';

    return docbar("图版", "<span>" + (g.texts || []).length + " 文本块</span>") +
      '<div class="frame">' +
      crumb([["总览", "#/"], ["图版", "#/g"], [g.name, null]]) +
      '<div class="page"><div class="kicker">图版</div>' +
      '<h1 class="page-title">' + esc(g.name) + "</h1>" +
      (g.note ? '<p class="lede">' + esc(g.note) + "</p>" : "") + "</div>" +
      '<div class="gal-view" style="margin-top:24px"><img class="zoomable" src="' + esc(g.svg) + '" alt="' + esc(g.name) + '"></div>' +
      '<div class="g2 grid" style="margin-top:28px">' +
      '<div class="card"><h4 class="mono" style="font-size:9.5px;letter-spacing:.2em;color:var(--ink-3);margin:0 0 10px">关联笔记 ' + elinks.length + "</h4>" + linkList + "</div>" +
      '<div class="card"><h4 class="mono" style="font-size:9.5px;letter-spacing:.2em;color:var(--ink-3);margin:0 0 10px">图中文本 ' + (g.texts || []).length + "</h4>" + texts + "</div>" +
      "</div></div>";
  }

  /* ---------------------------------------------------------------- 结构化 */

  function viewStructured(key) {
    var list = IDX.structured || [];
    if (!list.length) return docbar("结构化", "") + '<div class="frame"><div class="empty">没有结构化数据</div></div>';
    var cur = list.filter(function (s) { return s.key === key; })[0] || list[0];

    var tabs = list.map(function (s) {
      return '<button data-tab="' + esc(s.key) + '"' + (s.key === cur.key ? ' class="on"' : "") + ">" + esc(s.title) + "</button>";
    }).join("");

    var body = "";
    if (cur.kind === "table") {
      (cur.data || []).forEach(function (tb) {
        if (tb.caption) body += '<h2 class="sec-title" style="margin-top:36px">' + esc(tb.caption) + "</h2>";
        var head = tb.headers || [];
        body += '<table class="dtable">' +
          (head.length ? "<thead><tr>" + head.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") + "</tr></thead>" : "") +
          "<tbody>" + (tb.rows || []).map(function (r) {
            return "<tr>" + r.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>";
          }).join("") + "</tbody></table>";
      });
    } else {
      (cur.data || []).forEach(function (g) {
        if (g.heading) body += '<h2 class="sec-title" style="margin-top:36px">' + esc(g.heading) + "</h2>";
        body += '<div class="kvlist">' + (g.items || []).map(function (it) {
          return '<div class="row"><span class="k">' + esc(it.key) + '</span><span class="v">' + esc(it.value) + "</span></div>";
        }).join("") + "</div>";
      });
    }

    var src = cur.sourceId && byId.get(cur.sourceId);
    return docbar("结构化", "<span>" + list.length + " 组</span>") +
      '<div class="frame">' +
      pageHead("结构化档案", "结构化条目", "把散落在原文里的对照表、编号规则与映射关系抽成可快速查阅的视图。") +
      '<div class="tabs">' + tabs + "</div>" +
      (src ? '<div class="mono dim" style="font-size:10px;letter-spacing:.1em;margin-top:14px">来源 / <a href="' + noteUrl(src.id) + '" style="border-bottom:1px solid var(--line-2)">' + esc(src.title) + "</a></div>" : "") +
      body + "</div>";
  }

  /* ---------------------------------------------------------------- 关系图 */

  function viewGraph() {
    return docbar("关系图", "<span>" + NOTES.length + " 节点</span><span>" + edgeCount() + " 条边</span>") +
      '<div class="frame">' +
      pageHead("双链网络", "关系图", "每个节点是一篇笔记，边是正文里的 wikilink。颜色按分类，拖拽平移，滚轮缩放，悬停高亮，点击打开。") +
      '<div class="graphwrap"><canvas id="graph"></canvas>' +
      '<div class="graph-hint">拖拽平移 · 滚轮缩放 · 双击复位</div>' +
      '<div class="graph-legend" id="legend"></div></div></div>';
  }

  var PAL = ["#c73e2d", "#3f7b4a", "#e2b43b", "#286a9b", "#8f3b2e", "#2f5f3a", "#b08a26", "#1f5478",
    "#a85b4a", "#5c8f66", "#cfa34a", "#4d7fa0", "#7d2a20", "#264a2d", "#8a6a18", "#163d59"];

  function mountGraph() {
    var cv = document.getElementById("graph");
    if (!cv) return;
    var wrap = cv.parentNode;
    var ctx = cv.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;

    /* 度数最高的笔记当枢纽（通常是总览 MOC），钉在原点 */
    var hubId = null, hubDeg = -1;
    NOTES.forEach(function (n) {
      var d = (n.links || []).length + (n.backlinks || []).length;
      if (d > hubDeg) { hubDeg = d; hubId = n.id; }
    });

    var nodes = [], look = new Map();
    NOTES.forEach(function (n) {
      var si = secIndex.has(n.section) ? secIndex.get(n.section) : 15;
      var deg = (n.links || []).length + (n.backlinks || []).length;
      var o = {
        id: n.id, title: n.title, deg: deg, sec: si, color: PAL[si % PAL.length],
        ang: (si / Math.max(1, SECTIONS.length)) * Math.PI * 2,
        r: 300, x: 0, y: 0, vx: 0, vy: 0, fixed: n.id === hubId
      };
      nodes.push(o); look.set(n.id, o);
    });

    /* 放射初值：每个分类一根辐条，同类的笔记沿弧排开 */
    var counters = Object.create(null);
    nodes.forEach(function (n) {
      if (n.fixed) return;
      var c = counters[n.sec] = (counters[n.sec] || 0) + 1;
      n.r = 300 + ((c - 1) % 4) * 74 + (c > 12 ? 60 : 0);
      n.ang = n.ang + (((c - 1) % 5) - 2) * 0.05;
      n.x = Math.cos(n.ang) * n.r;
      n.y = Math.sin(n.ang) * n.r;
    });

    var edges = [];
    NOTES.forEach(function (n) {
      (n.links || []).forEach(function (t) {
        if (look.has(t)) edges.push([look.get(n.id), look.get(t)]);
      });
    });

    var view = { k: 1 }, hover = null, drag = null, dragNode = null, alpha = 1, pan = { x: 0, y: 0 };

    function resize() {
      var r = wrap.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + "px"; cv.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      view.k = Math.min(W, H) / 1380;
      draw();
    }
    function toScreen(x, y) { return [x * view.k + W / 2 + pan.x, y * view.k + H / 2 + pan.y]; }
    function toWorld(sx, sy) { return [(sx - W / 2 - pan.x) / view.k, (sy - H / 2 - pan.y) / view.k]; }

    function tick() {
      edges.forEach(function (e) {
        var a = e[0], b = e[1];
        var dx = b.x - a.x, dy = b.y - a.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        var f = (d - 64) * 0.0024;
        var fx = (dx / d) * f, fy = (dy / d) * f;
        if (!a.fixed) { a.vx += fx; a.vy += fy; }
        if (!b.fixed) { b.vx -= fx; b.vy -= fy; }
      });
      for (var i = 0; i < nodes.length; i++) {
        var a = nodes[i];
        if (a.fixed) continue;
        for (var j = i + 1; j < nodes.length; j++) {
          var b = nodes[j];
          var dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
          if (d2 > 40000 || d2 < 1) continue;
          var d = Math.sqrt(d2), f = 900 / d2;
          var fx = (dx / d) * f, fy = (dy / d) * f;
          a.vx -= fx; a.vy -= fy;
          if (!b.fixed) { b.vx += fx; b.vy += fy; }
        }
      }
      nodes.forEach(function (n) {
        if (n.fixed) { n.x = 0; n.y = 0; n.vx = n.vy = 0; return; }
        var ax = Math.cos(n.ang) * n.r, ay = Math.sin(n.ang) * n.r;
        n.vx += (ax - n.x) * 0.03;
        n.vy += (ay - n.y) * 0.03;
        n.x += n.vx * alpha; n.y += n.vy * alpha;
        n.vx *= 0.55; n.vy *= 0.55;
      });
      alpha = Math.max(0.03, alpha * 0.993);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      edges.forEach(function (e) {
        var p = toScreen(e[0].x, e[0].y), q = toScreen(e[1].x, e[1].y);
        var hot = hover && (e[0] === hover || e[1] === hover);
        var hub = e[0].fixed || e[1].fixed;
        ctx.strokeStyle = hot ? "rgba(32,37,34,.62)" : hub ? "rgba(32,37,34,.07)" : "rgba(32,37,34,.15)";
        ctx.lineWidth = hot ? 1.4 : 1;
        ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      });
      nodes.forEach(function (n) {
        var p = toScreen(n.x, n.y);
        var r = n.fixed ? 6 : Math.min(8.5, 2.2 + Math.sqrt(n.deg) * 0.9);
        if (hover && n !== hover) ctx.globalAlpha = 0.32;
        ctx.fillStyle = n.fixed ? "#202522" : n.color;
        ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill();
        if (hover === n || n.fixed || n.deg > 30) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = n.fixed ? "#c73e2d" : "#202522";
          ctx.font = (n.fixed ? "600 12px " : "11px ") + "'JetBrains Mono', monospace";
          ctx.fillText(n.title, p[0] + r + 5, p[1] + 4);
        }
        ctx.globalAlpha = 1;
      });
    }

    function loop() { tick(); draw(); requestAnimationFrame(loop); }

    function hitTest(sx, sy) {
      var best = null, bd = 1e9;
      nodes.forEach(function (n) {
        var p = toScreen(n.x, n.y);
        var d = (p[0] - sx) * (p[0] - sx) + (p[1] - sy) * (p[1] - sy);
        if (d < 110 && d < bd) { bd = d; best = n; }
      });
      return best;
    }

    cv.addEventListener("mousedown", function (e) {
      var r = cv.getBoundingClientRect();
      var n = hitTest(e.clientX - r.left, e.clientY - r.top);
      if (n && !n.fixed) { dragNode = n; } else { drag = { x: e.clientX, y: e.clientY }; }
    });
    window.addEventListener("mouseup", function () { drag = null; dragNode = null; });
    cv.addEventListener("mousemove", function (e) {
      var r = cv.getBoundingClientRect();
      var sx = e.clientX - r.left, sy = e.clientY - r.top;
      if (drag) {
        cv.style.cursor = "grabbing";
        pan.x += e.clientX - drag.x; pan.y += e.clientY - drag.y;
        drag.x = e.clientX; drag.y = e.clientY;
        draw(); return;
      }
      if (dragNode) {
        var w = toWorld(sx, sy);
        dragNode.x = w[0]; dragNode.y = w[1];
        dragNode.vx = dragNode.vy = 0;
        alpha = Math.max(alpha, 0.10); draw(); return;
      }
      var n = hitTest(sx, sy);
      if (n !== hover) { hover = n; cv.style.cursor = n ? "pointer" : "grab"; draw(); }
    });
    cv.addEventListener("click", function (e) {
      var r = cv.getBoundingClientRect();
      var n = hitTest(e.clientX - r.left, e.clientY - r.top);
      if (n) location.hash = noteUrl(n.id).slice(1);
    });
    cv.addEventListener("dblclick", function () {
      pan.x = pan.y = 0; alpha = 0.5; draw();
    });
    cv.addEventListener("wheel", function (e) {
      e.preventDefault();
      view.k = Math.max(0.2, Math.min(4, view.k * (e.deltaY < 0 ? 1.1 : 0.9)));
      draw();
    }, { passive: false });

    var lg = document.getElementById("legend");
    if (lg) {
      lg.innerHTML = SECTIONS.map(function (s, i) {
        return '<div><i style="background:' + PAL[i % PAL.length] + '"></i>' + esc(s.name) + "</div>";
      }).join("");
    }

    window.addEventListener("resize", resize);
    resize(); loop();
  }

  /* ---------------------------------------------------------------- 检索 */

  var searchIndex = null;

  function buildIndex() {
    if (searchIndex) return searchIndex;
    searchIndex = NOTES.map(function (n) {
      return {
        n: n,
        hay: (n.title + " " + (n.base || "") + " " + (n.blurb || "") + " " + (n.text || "")).toLowerCase(),
        titleLow: (n.title || "").toLowerCase()
      };
    });
    return searchIndex;
  }

  function snippet(text, ws) {
    var low = text.toLowerCase(), best = -1;
    ws.forEach(function (w) {
      var i = low.indexOf(w);
      if (i >= 0 && (best < 0 || i < best)) best = i;
    });
    var start = best > 70 ? best - 70 : 0;
    var s = text.slice(start, start + 300);
    if (start > 0) s = "… " + s;
    var out = esc(s);
    ws.forEach(function (w) {
      if (!w) return;
      out = out.replace(new RegExp("(" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi"), "<em>$1</em>");
    });
    return out;
  }

  function doSearch(q) {
    var ws = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!ws.length) return [];
    var out = [];
    buildIndex().forEach(function (it) {
      var score = 0, ok = true;
      ws.forEach(function (w) {
        if (it.hay.indexOf(w) < 0) { ok = false; return; }
        score += it.hay.split(w).length - 1;
        if (it.titleLow.indexOf(w) >= 0) score += 40;
      });
      if (!ok) return;
      if (it.titleLow.indexOf(q.toLowerCase()) >= 0) score += 60;
      out.push({ n: it.n, score: score });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, 80);
  }

  function viewSearch(q) {
    var hits = q ? doSearch(q) : [];
    var list;
    if (!q) {
      list = '<div class="empty">输入关键词开始检索。空格分隔多个词时要求全部命中。</div>';
    } else if (!hits.length) {
      list = '<div class="empty">没有命中。试试点分隔多个关键词，例如「Astral 网络」</div>';
    } else {
      var ws = q.toLowerCase().split(/\s+/).filter(Boolean);
      list = hits.map(function (h, i) {
        return '<a class="hit" href="' + noteUrl(h.n.id) + '">' +
          '<span class="no">' + pad2(i + 1) + "</span>" +
          '<div><div class="t">' + esc(h.n.title) + "</div>" +
          '<div class="p">' + esc(h.n.section || "") + " / " + esc(h.n.path) + "</div>" +
          '<div class="x">' + snippet(h.n.text || h.n.blurb || "", ws) + "</div></div></a>";
      }).join("");
    }

    return docbar("检索", "<span>" + (q ? hits.length + " 条命中" : "") + "</span>") +
      '<div class="frame">' +
      pageHead("全文检索", "检索档案", "对全部 " + NOTES.length + " 篇正文做子串检索，空格分隔多个关键词则须全部命中。") +
      '<div class="searchbar-big"><input id="qinput" type="search" value="' + esc(q || "") + '" placeholder="输入关键词" autocomplete="off"></div>' +
      '<div class="mono dim" style="font-size:10px;letter-spacing:.12em;margin:6px 0 18px">' +
      (q ? hits.length + " 条命中 / " + NOTES.length + " 篇" : "就绪") + "</div>" +
      "<div>" + list + "</div></div>";
  }

  /* ---------------------------------------------------------------- 渲染 */

  function parseHash() {
    var h = location.hash.replace(/^#/, "").replace(/^\/+/, "");
    var parts = h.split("/").filter(function (x) { return x !== ""; });
    if (!parts.length) parts = [""];
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      try { out.push(decodeURIComponent(parts[i])); } catch (e) { out.push(parts[i]); }
    }
    if (out[0] === "note") out[0] = "n";
    if (out[0] === "gallery") out[0] = "g";
    return out;
  }

  function setActiveNav(root) {
    document.querySelectorAll(".mainnav a").forEach(function (a) {
      a.classList.toggle("on", a.getAttribute("data-root") === root);
    });
  }

  function render() {
    var p = parseHash();
    var main = $("#main");
    var html, root = p[0] || "";

    if (root === "" || root === "/") html = viewHome();
    else if (root === "s") html = p.length > 1 ? viewSection(p[1]) : viewSections();
    else if (root === "n") html = viewNote(p.slice(1).join("/"));
    else if (root === "x") html = viewStructured(p[1]);
    else if (root === "c") html = viewCharacters();
    else if (root === "g") html = p.length > 1 ? viewGalleryItem(p.slice(1).join("/")) : viewGallery();
    else if (root === "map") html = viewGraph();
    else if (root === "q") html = viewSearch(p.slice(1).join("/"));
    else html = notFound(p.join("/"));

    main.innerHTML = html;
    setActiveNav(root);
    window.scrollTo(0, 0);

    if (root === "g" && p.length === 1) mountGalleryFilter();
    if (root === "map") mountGraph();
    if (root === "q") mountSearchInput();
    if (root === "x") mountTabs();

    var fm = $("#footmeta");
    if (fm) fm.textContent = "构建 " + ((IDX.meta && IDX.meta.builtAt) || "") + " / 纪年 " + hexDay();
  }

  /* ---------------------------------------------------------------- 交互 */

  function mountGalleryFilter() {
    var f = $("#galfilter");
    if (!f) return;
    var cards = Array.prototype.slice.call(document.querySelectorAll(".gal-card[data-q]"));
    var note = $("#galfilter-note");
    f.addEventListener("input", function () {
      var q = f.value.trim().toLowerCase(), n = 0;
      cards.forEach(function (c) {
        var ok = !q || c.getAttribute("data-q").indexOf(q) >= 0;
        c.style.display = ok ? "" : "none";
        if (ok) n++;
      });
      if (note) note.textContent = q ? n + " / " + cards.length + " 张命中" : "";
    });
  }

  function mountSearchInput() {
    var inp = $("#qinput");
    if (!inp) return;
    var t = null;
    inp.focus();
    inp.setSelectionRange(inp.value.length, inp.value.length);
    inp.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var v = inp.value.trim();
        history.replaceState(null, "", v ? "#/q/" + enc(v) : "#/q");
        render();
      }, 260);
    });
  }

  function mountTabs() {
    document.querySelectorAll(".tabs button").forEach(function (b) {
      b.addEventListener("click", function () {
        location.hash = "#/x/" + enc(b.getAttribute("data-tab"));
      });
    });
  }

  function openLightbox(src) {
    var lb = document.getElementById("lightbox");
    if (!lb) {
      lb = document.createElement("div");
      lb.id = "lightbox";
      lb.className = "lightbox";
      lb.innerHTML = '<img alt=""><div class="lb-hint">点击任意处或按 Esc 关闭</div>';
      document.body.appendChild(lb);
      lb.addEventListener("click", function () { lb.classList.remove("on"); });
    }
    lb.querySelector("img").src = src;
    lb.classList.add("on");
  }

  document.addEventListener("click", function (e) {
    var z = e.target.closest ? e.target.closest("img.zoomable") : null;
    if (z) { e.preventDefault(); openLightbox(z.getAttribute("src")); return; }

    var t = e.target.closest ? e.target.closest("[data-toc]") : null;
    if (t) {
      e.preventDefault();
      var el = document.getElementById(t.getAttribute("data-toc"));
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    var btn = e.target.closest ? e.target.closest("#colsbtn") : null;
    if (btn) {
      var prose = document.querySelector(".prose");
      if (!prose) return;
      var nowTwo = prose.classList.toggle("two");
      btn.classList.toggle("on", nowTwo);
      btn.textContent = nowTwo ? "双栏" : "单栏";
      localStorage.setItem("sub-cols", nowTwo ? "two" : "one");
      return;
    }

    var el2 = e.target.closest ? e.target.closest("[data-href]") : null;
    if (el2 && !(e.target.closest && e.target.closest("a"))) {
      location.hash = el2.getAttribute("data-href");
    }
  });

  document.addEventListener("keydown", function (e) {
    var tag = (e.target.tagName || "").toLowerCase();
    var typing = tag === "input" || tag === "textarea" || e.target.isContentEditable;

    if (e.key === "/" && !typing) {
      e.preventDefault();
      var g = $("#globalsearch");
      if (g) g.focus();
      return;
    }
    if (e.key === "Escape") {
      var lb = document.getElementById("lightbox");
      if (lb) lb.classList.remove("on");
      if (typing) e.target.blur();
      return;
    }
    if (typing) return;

    var p = parseHash();
    if (p[0] !== "n") return;
    var id = p.slice(1).join("/");
    var i = ORDER_IDX.has(id) ? ORDER_IDX.get(id) : -1;
    if (i < 0) return;
    var back = (e.key === "[" || e.key === "k");
    var fwd = (e.key === "]" || e.key === "j");
    if (back && i > 0) location.hash = noteUrl(ORDER[i - 1]).slice(1);
    if (fwd && i < ORDER.length - 1) location.hash = noteUrl(ORDER[i + 1]).slice(1);
  });

  $("#topnav").innerHTML = NAV.map(function (n) {
    var root = n[0].replace(/^#\//, "").split("/")[0];
    return '<a href="' + n[0] + '" data-root="' + root + '">' + n[1] + "</a>";
  }).join("");

  var gs = $("#globalsearch");
  if (gs) {
    gs.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        var v = gs.value.trim();
        if (v) location.hash = "#/q/" + enc(v);
        gs.blur();
      }
    });
  }

  window.addEventListener("hashchange", render);
  render();
})();
