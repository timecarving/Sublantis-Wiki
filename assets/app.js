/* SUBLANTIS — 潜没档案 / 前端应用
   路由：#/ 总览  #/s 分区  #/s/<名>  #/n/<id>  #/c 名录  #/g 图版
        #/g/<id>  #/x 结构化  #/m 星图  #/q/<词> */
(function () {
  "use strict";

  var I = window.SUBLANTIS_INDEX;
  var NOTES = window.SUBLANTIS_NOTES;
  var META = I.meta;
  var SECTIONS = I.sections || [];
  var RAW_NOTES = location.protocol === "file:";

  var byId = new Map();
  NOTES.forEach(function (n) { byId.set(n.id, n); });
  var secIndex = new Map();
  SECTIONS.forEach(function (s, i) { secIndex.set(s.name, i); });

  var galById = new Map(), galByName = new Map();
  (I.gallery || []).forEach(function (g) {
    galById.set(g.id, g);
    galByName.set(g.id.replace(/\.excalidraw$/, ""), g);
  });

  /* ---------------------------------------------------------------- 基础 */

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function hex(n) {
    var s = (n | 0).toString(16).toUpperCase();
    return s.length < 2 ? "0" + s : s;
  }
  function wan(n) { return n >= 10000 ? (n / 10000).toFixed(1) + " 万" : String(n); }
  function noteUrl(id) { return "#/n/" + encodeURIComponent(id); }
  function secUrl(name) { return "#/s/" + encodeURIComponent(name); }
  function galUrl(id) { return "#/g/" + encodeURIComponent(id); }
  function secOf(name) { return secIndex.has(name) ? secIndex.get(name) : -1; }
  function notesOfSection(name) {
    return NOTES.filter(function (n) { return n.section === name && n.kind !== "gallery"; });
  }
  function topCollections(sec, k) {
    return (sec.collections || []).filter(function (c) { return c.name !== "Excalidraw 图鉴"; })
      .slice(0, k || 3).map(function (c) { return c.name; });
  }

  /* ---------------------------------------------------------------- 深度尺 */

  var railEl = null, railMark = null, railRead = null;
  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function updateDepth() {
    if (!railMark || !railEl) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    railMark.style.transform = "translateY(" + (p * (railEl.clientHeight - 22)) + "px)";
    railRead.textContent = "0x" + hex(Math.round(p * 255));
    if (!REDUCED) document.documentElement.style.setProperty("--sy", (-window.scrollY * 0.07).toFixed(1) + "px");
  }

  function mountRail() {
    railEl = document.getElementById("rail");
    railMark = document.getElementById("railmark");
    railRead = document.getElementById("railread");
    if (!railEl) return;
    var ticks = railEl.querySelector(".ticks");
    if (ticks && !ticks.childNodes.length) {
      var s = "";
      for (var i = 0; i < 16; i++) s += "<i></i>";
      ticks.innerHTML = s;
    }
    updateDepth();
  }

  /* ---------------------------------------------------------------- 组件 */

  function bar(label, right) {
    return '<div class="bar"><span class="bar-l">' + label + "</span>" +
      '<span class="bar-r">' + (right || "") + "</span></div>";
  }

  function head(kicker, title, sub) {
    return '<header class="head"><div class="kick">' + kicker + "</div>" +
      "<h1>" + title + "</h1>" + (sub ? '<p class="sub">' + sub + "</p>" : "") + "</header>";
  }

  function plateCard(g, i) {
    return '<a class="plate" href="' + galUrl(g.id) + '">' +
      '<span class="plate-img"><img src="' + esc(g.thumb || g.svg) + '" alt="" loading="lazy"></span>' +
      '<span class="plate-meta"><i>' + hex(i) + "</i><b>" + esc(g.name) + "</b>" +
      "<em>" + esc(g.blurb || "") + "</em></span></a>";
  }

  function entryRow(n, i) {
    return '<a class="entry" href="' + noteUrl(n.id) + '">' +
      '<span class="e-id">' + hex(i) + "</span>" +
      '<span class="e-main"><b>' + esc(n.title) + "</b>" +
      (n.blurb ? "<em>" + esc(n.blurb) + "</em>" : "") + "</span>" +
      '<span class="e-meta">' + n.words + " 字</span></a>";
  }

  /* ---------------------------------------------------------------- 总览 */

  function viewHome() {
    var stats = [
      ["档案", META.noteCount], ["图版", META.galleryCount],
      ["分区", SECTIONS.length], ["字数", META.charCount]
    ];
    var h = '<div class="stage home">' +
      '<section class="hero">' +
        '<div class="hero-tag"><i></i> 潜没档案 · SUBMERGED ARCHIVE</div>' +
        '<div class="wm-wrap"><h1 class="wordmark" aria-label="SUBLANTIS">SUBLANTIS</h1></div>' +
        '<div class="hero-cn">沉入潜意识的亚特兰蒂斯</div>' +
        '<p class="hero-note">神秘学被工程化，CCRU 伪史与计算机科学对位。十六个 Zone 共用一套进制。' +
        "这不是一部被讲述的小说，而是一份被归档的世界。</p>" +
        '<div class="hero-scope">收录范围仅 Sublantis / HMLC 本体设定，原文逐字保留；图版由 Excalidraw 官方导出器转换。</div>' +
        '<div class="stats">' + stats.map(function (s) {
          return '<div class="stat"><b data-count="' + s[1] + '" data-wan="' + (s[1] >= 10000 ? 1 : 0) + '">0</b>' +
            "<i>" + s[0] + "</i></div>";
        }).join("") + "</div>" +
      "</section>" +
      '<section class="descent">' +
        bar("下潜 · DESCENT", "0x00 – 0x" + hex(SECTIONS.length - 1)) +
        '<div class="dx-list">' +
        SECTIONS.map(function (s, i) {
          var band = i === 0 ? '<div class="band"><b>表层</b><span>sudoer</span><i></i></div>'
            : i === 6 ? '<div class="band"><b>中层</b><span>root</span><i></i></div>'
            : i === 11 ? '<div class="band"><b>深层</b><span>ring0</span><i></i></div>' : "";
          return band + '<a class="dx" href="' + secUrl(s.name) + '">' +
            '<span class="dx-id">0x' + hex(i) + "</span>" +
            '<span class="dx-name">' + esc(s.name) + "</span>" +
            '<span class="dx-sub">' + esc(topCollections(s, 3).join(" · ")) + "</span>" +
            '<span class="dx-n">' + s.count + "</span>" +
            '<span class="dx-bar"><i style="width:' + Math.max(4, Math.round(s.count / 46 * 100)) + '%"></i></span></a>';
        }).join("") + "</div>" +
      "</section>" +
      '<section class="plates">' +
        bar("图版 · ATLAS", '<a href="#/g">全部 ' + META.galleryCount + " →</a>") +
        '<div class="plate-row">' + (I.gallery || []).slice(0, 6).map(plateCard).join("") + "</div>" +
      "</section></div>";
    return { html: h, mount: countUp };
  }

  function countUp() {
    [].forEach.call(document.querySelectorAll("[data-count]"), function (el) {
      var target = +el.getAttribute("data-count");
      var isWan = el.getAttribute("data-wan") === "1";
      var t0 = performance.now();
      function step(t) {
        var k = Math.min(1, (t - t0) / 1000);
        var e = 1 - Math.pow(1 - k, 3);
        el.textContent = isWan ? wan(Math.round(target * e)) : Math.round(target * e);
        if (k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* ---------------------------------------------------------------- 分区 */

  function viewSections() {
    var h = '<div class="stage">' +
      head("SECTORS", "分区索引", "按总览 MOC 的两级树展开。编号是十六进制，越往下越接近内层。") +
      '<div class="dx-list big">' + SECTIONS.map(function (s, i) {
        return '<a class="dx" href="' + secUrl(s.name) + '">' +
          '<span class="dx-id">0x' + hex(i) + "</span>" +
          '<span class="dx-name">' + esc(s.name) + "</span>" +
          '<span class="dx-sub">' + esc((s.collections || []).map(function (c) { return c.name; }).join(" · ")) + "</span>" +
          '<span class="dx-n">' + s.count + "</span>" +
          '<span class="dx-bar"><i style="width:' + Math.max(4, Math.round(s.count / 46 * 100)) + '%"></i></span></a>';
      }).join("") + "</div></div>";
    return { html: h };
  }

  function viewSection(name) {
    var si = secOf(name), sec = SECTIONS[si];
    if (!sec) return notFound(name);
    var list = notesOfSection(name);
    var words = list.reduce(function (a, n) { return a + (n.words || 0); }, 0);
    var h = '<div class="stage">' +
      '<nav class="crumb"><a href="#/">总览</a><span>/</span><a href="#/s">分区</a><span>/</span>' +
      "<b>0x" + hex(si) + " " + esc(sec.name) + "</b></nav>" +
      head("SECTOR 0x" + hex(si), esc(sec.name), (sec.intro || []).join(" ") || "（本分区未写导语）") +
      bar("条目 · " + list.length, "共 " + words + " 字") +
      '<div class="entries">' + list.map(entryRow).join("") + "</div></div>";
    return { html: h };
  }

  /* ---------------------------------------------------------------- 条目 */

  function tocOf(html) {
    var out = [], re = /<h([23])[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/h\1>/g, m;
    while ((m = re.exec(html))) {
      var t = m[3].replace(/<[^>]+>/g, "")
        .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'").replace(/&amp;/g, "&").trim();
      out.push({ lv: +m[1], id: m[2], t: t });
    }
    return out;
  }

  function runningText(html) {
    var ps = html.match(/<p>[\s\S]*?<\/p>/g) || [];
    var len = 0;
    ps.forEach(function (s) { len += s.replace(/<[^>]+>/g, "").length; });
    return { len: len, n: ps.length };
  }

  function useTwo(n) {
    if (window.innerWidth < 1180) return false;
    if ((n.words || 0) < 900) return false;
    var pref = localStorage.getItem("sub-cols");
    if (pref === "one") return false;
    if (pref === "two") return true;
    var rt = runningText(n.html || "");
    var hs = (n.html || "").match(/<h[23][^>]*>/g) || [];
    return rt.len >= 2200 && rt.n >= 10 && hs.length <= 4;
  }

  var PAGER = null;

  function neighbours(n) {
    var list = secOf(n.section) >= 0 ? notesOfSection(n.section) : [];
    var i = list.findIndex(function (x) { return x.id === n.id; });
    if (i < 0) return { prev: null, next: null };
    return { prev: list[i - 1] || null, next: list[i + 1] || null };
  }

  function viewNote(id) {
    var n = byId.get(id);
    if (!n) return notFound(id);
    if (n.kind === "gallery") return viewGalleryItem(id);
    PAGER = neighbours(n);
    var two = useTwo(n);
    var toc = tocOf(n.html || "");
    var si = secOf(n.section);
    var links = (n.links || []).filter(function (x) { return byId.has(x); });
    var back = (n.backlinks || []).filter(function (x) { return byId.has(x); });

    var side = "";
    if (toc.length) {
      side += '<div class="panel"><h3>本页目录</h3><ol class="toc">' +
        toc.map(function (t) {
          return '<li class="lv' + t.lv + '"><a href="' + "#/n/" + encodeURIComponent(n.id) + "#" + t.id + '">' + esc(t.t) + "</a></li>";
        }).join("") + "</ol></div>";
    }
    if (back.length) {
      side += '<div class="panel"><h3>被引用 <i>' + back.length + '</i></h3><ul class="sig">' +
        back.slice(0, 12).map(function (x) {
          return '<li><a href="' + noteUrl(x) + '">' + esc((byId.get(x) || {}).title || x) + "</a></li>";
        }).join("") + "</ul></div>";
    }
    if (links.length) {
      side += '<div class="panel"><h3>指向 <i>' + links.length + '</i></h3><ul class="sig">' +
        links.slice(0, 12).map(function (x) {
          return '<li><a href="' + noteUrl(x) + '">' + esc((byId.get(x) || {}).title || x) + "</a></li>";
        }).join("") + "</ul></div>";
    }
    side += '<div class="panel meta"><h3>标本信息</h3><dl>' +
      "<dt>路径</dt><dd>" + esc(n.path) + "</dd>" +
      "<dt>分区</dt><dd>" + (si >= 0 ? "0x" + hex(si) + " " + esc(n.section) : esc(n.section || "—")) + "</dd>" +
      "<dt>字数</dt><dd>" + (n.words || 0) + "</dd>" +
      (RAW_NOTES ? '<dt>原文</dt><dd><a href="笔记/' + encodeURIComponent(n.path) + '" target="_blank">Markdown ↗</a></dd>' : "") +
      "</dl></div>";

    var h = '<div class="stage doc">' +
      '<nav class="crumb"><a href="#/">总览</a><span>/</span>' +
      (si >= 0 ? '<a href="' + secUrl(n.section) + '">' + esc(n.section) + "</a><span>/</span>" : "") +
      "<b>" + esc(n.title) + "</b></nav>" +
      '<i class="crop tl"></i><i class="crop tr"></i><i class="crop bl"></i><i class="crop br"></i>' +
      '<header class="doc-head"><div class="doc-meta">' +
        '<span class="tag">' + (si >= 0 ? "0x" + hex(si) : "SAMPLE") + "</span>" +
        "<span>" + esc(n.collection || n.section || "") + "</span>" +
        "<span>" + (n.words || 0) + " 字</span>" +
        "<span>" + back.length + " 入链</span><span>" + links.length + " 出链</span>" +
        '<button class="ghost" id="colsbtn" type="button">' + (two ? "双栏" : "单栏") + "</button></div>" +
        "<h1>" + esc(n.title) + "</h1>" +
        (n.blurb ? '<p class="lede">' + esc(n.blurb) + "</p>" : "") + "</header>" +
      '<div class="doc-grid"><article class="prose' + (two ? " two" : "") + '">' + (n.html || "") + "</article>" +
      '<aside class="side">' + side + "</aside></div>" +
      '<div class="pager">' +
        (PAGER.prev ? '<a href="' + noteUrl(PAGER.prev.id) + '"><i>上一件</i><b>' + esc(PAGER.prev.title) + "</b></a>" : "<span></span>") +
        (PAGER.next ? '<a href="' + noteUrl(PAGER.next.id) + '"><i>下一件</i><b>' + esc(PAGER.next.title) + "</b></a>" : "<span></span>") +
      "</div></div>";

    return {
      html: h,
      mount: function () {
        var btn = document.getElementById("colsbtn");
        if (!btn) return;
        btn.addEventListener("click", function () {
          var on = document.querySelector(".prose").classList.toggle("two");
          btn.textContent = on ? "双栏" : "单栏";
          localStorage.setItem("sub-cols", on ? "two" : "one");
        });
      }
    };
  }

  /* ---------------------------------------------------------------- 名录 */

  var FIELD_LABEL = {
    fullname: "全名", gender: "性别", deadname: "旧名", birth: "出生地", major: "专业",
    socionics: "Socionics", mbti: "MBTI", psy: "超心理定位", family: "家庭", position: "定位"
  };

  function viewCharacters() {
    var cs = I.characters || [];
    var h = '<div class="stage">' +
      head("PERSONNEL", "名录", "字段从角色档案自动抽取，可能不完整；完整设定以条目正文为准。") +
      bar("样本 · " + cs.length, "HMLC / NWU") +
      '<div class="spec-grid">' + cs.map(function (c, i) {
        var f = c.fields || {};
        var rows = Object.keys(f).filter(function (k) { return f[k]; }).map(function (k) {
          return "<dt>" + (FIELD_LABEL[k] || k) + "</dt><dd>" + esc(f[k]) + "</dd>";
        }).join("");
        return '<article class="spec">' +
          '<div class="spec-top"><span class="spec-id">0x' + hex(i) + "</span>" +
          '<span class="spec-sec">' + esc(c.section || "") + "</span></div>" +
          '<h2><a href="' + noteUrl(c.id) + '">' + esc(c.name) + "</a></h2>" +
          (c.blurb ? '<p class="spec-lede">' + esc(c.blurb) + "</p>" : "") +
          '<dl class="spec-kv">' + rows + "</dl></article>";
      }).join("") + "</div></div>";
    return { html: h };
  }

  /* ---------------------------------------------------------------- 图版 */

  function viewGallery() {
    var gs = I.gallery || [];
    var h = '<div class="stage">' +
      head("ATLAS", "图版", "手绘原稿由 Excalidraw 官方导出器转成矢量，线条与字体与源文件一致；另有 1 张 Obsidian Canvas 总览。") +
      '<div class="find-line"><input id="galfilter" class="galfilter" type="search" placeholder="筛选：名称 / 摘要 / 图内文本"></div>' +
      '<div class="film-grid">' + gs.map(function (g, i) {
        return '<figure class="film" data-q="' + esc((g.name + " " + (g.blurb || "") + " " + (g.texts || []).join(" ")).toLowerCase()) + '">' +
          '<a class="film-img" href="' + galUrl(g.id) + '"><img src="' + esc(g.thumb || g.svg) + '" alt="" loading="lazy"></a>' +
          '<figcaption><i>' + hex(i) + "</i><b>" + esc(g.name) + "</b><span>" + esc(g.blurb || "") + "</span>" +
          "<em>" + (g.texts || []).length + " 文本块 · " + (g.elinks || []).length + " 关联</em></figcaption></figure>";
      }).join("") + "</div></div>";
    return {
      html: h,
      mount: function () {
        var inp = document.getElementById("galfilter");
        if (!inp) return;
        inp.addEventListener("input", function () {
          var q = inp.value.trim().toLowerCase();
          [].forEach.call(document.querySelectorAll(".film"), function (f) {
            f.style.display = !q || (f.getAttribute("data-q") || "").indexOf(q) >= 0 ? "" : "none";
          });
        });
      }
    };
  }

  function viewGalleryItem(id) {
    var g = galById.get(id) || galByName.get(id);
    if (!g) return notFound(id);
    var i = (I.gallery || []).indexOf(g);
    var texts = g.texts || [], elinks = g.elinks || [];
    var h = '<div class="stage">' +
      '<nav class="crumb"><a href="#/">总览</a><span>/</span><a href="#/g">图版</a><span>/</span><b>' + esc(g.name) + "</b></nav>" +
      '<header class="doc-head"><div class="doc-meta"><span class="tag">PLATE 0x' + hex(i) + "</span>" +
      "<span>" + texts.length + " 文本块</span><span>" + elinks.length + " 关联</span></div>" +
      "<h1>" + esc(g.name) + "</h1>" + (g.blurb ? '<p class="lede">' + esc(g.blurb) + "</p>" : "") + "</header>" +
      '<div class="plate-view"><img class="zoomable" src="' + esc(g.svg) + '" alt=""></div>' +
      '<div class="two-col">' +
      '<div class="panel"><h3>图内文本 <i>' + texts.length + '</i></h3><ol class="txtlist">' +
      texts.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ol></div>" +
      '<div class="panel"><h3>关联条目 <i>' + elinks.length + '</i></h3><ul class="sig">' +
      (elinks.length ? elinks.map(function (raw) {
        var m = /^\s*(.*?)\s*\[\[(.+?)\]\]\s*$/.exec(raw);
        var label = m ? m[1] : raw, target = m ? m[2] : raw;
        target = target.split("|")[0].trim();
        var hit = NOTES.filter(function (n) {
          return n.title === target || n.base === target || n.base === target + ".excalidraw" ||
                 n.title === label || n.base === label;
        })[0];
        if (!label) label = target;
        return "<li>" + (hit ? '<a href="' + noteUrl(hit.id) + '">' + esc(label) + "</a>" : esc(label)) + "</li>";
      }).join("") : '<li class="dim">此图未登记元素级关联</li>') +
      "</ul></div></div></div>";
    return { html: h, mount: mountLightbox };
  }

  /* ---------------------------------------------------------------- 结构化 */

  var STRUCT = I.structured || [];

  function structBody(cur) {
    if (!cur) return "";
    var body = "";
    if (cur.kind === "table") {
      (cur.data || []).forEach(function (tb) {
        if (tb.caption) body += '<h2 class="sec">' + esc(tb.caption) + "</h2>";
        var hs = tb.headers || [];
        body += '<table class="dtable">' +
          (hs.length ? "<thead><tr>" + hs.map(function (x) { return "<th>" + esc(x) + "</th>"; }).join("") + "</tr></thead>" : "") +
          "<tbody>" + (tb.rows || []).map(function (r) {
            return "<tr>" + r.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>";
          }).join("") + "</tbody></table>";
      });
    } else {
      (cur.data || []).forEach(function (g) {
        if (g.heading) body += '<h2 class="sec">' + esc(g.heading) + "</h2>";
        body += '<div class="kvlist">' + (g.items || []).map(function (it) {
          return '<div class="row"><span class="k">' + esc(it.key) + '</span><span class="v">' + esc(it.value) + "</span></div>";
        }).join("") + "</div>";
      });
    }
    var src = cur.sourceId && byId.get(cur.sourceId);
    return '<div class="src">来源：' + (src ? '<a href="' + noteUrl(src.id) + '">' + esc(cur.source || src.title) + "</a>" : esc(cur.source || "—")) +
      (cur.desc ? " — " + esc(cur.desc) : "") + "</div>" + body;
  }

  function structView(activeKey) {
    var cur = activeKey ? STRUCT.filter(function (s) { return s.key === activeKey; })[0] : STRUCT[0];
    if (!cur) cur = STRUCT[0];
    var h = '<div class="stage">' +
      head("TABLES", "结构化", "把散落在原文里的对照表、编号规则与映射关系抽成可快速查阅的数据视图。") +
      '<div class="tabs">' + STRUCT.map(function (s) {
        return '<a href="#/x/' + encodeURIComponent(s.key) + '"' + (s === cur ? ' class="on"' : "") + ">" + esc(s.title) + "</a>";
      }).join("") + "</div>" +
      '<div id="structbody">' + structBody(cur) + "</div></div>";
    return { html: h };
  }

  /* ---------------------------------------------------------------- 星图 */

  function viewGraph() {
    return {
      html: '<div class="stage">' +
        head("CONSTELLATION", "星图", "每个频点是一篇档案，连线是正文里的 wikilink，颜色是分区。拖拽平移、滚轮缩放、悬停高亮、点击打开。") +
        '<div class="starfield"><canvas id="graph"></canvas><div class="legend" id="legend"></div>' +
        '<div class="hint">拖拽平移 · 滚轮缩放 · 双击复位</div></div></div>',
      mount: mountGraph
    };
  }

  function mountGraph() {
    var cv = document.getElementById("graph");
    if (!cv) return;
    var wrap = cv.parentNode;
    var ctx = cv.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;

    var hubId = null, hubDeg = -1;
    NOTES.forEach(function (n) {
      var d = (n.links || []).length + (n.backlinks || []).length;
      if (d > hubDeg) { hubDeg = d; hubId = n.id; }
    });

    var PAL = ["#6fe8c6", "#7fd6f0", "#a98cf0", "#e9b45a", "#8ce08a", "#f08fa8", "#c9d3a8", "#7ac4b8"];
    var nodes = [], look = new Map();
    NOTES.forEach(function (n) {
      var si = secOf(n.section); if (si < 0) si = 15;
      var deg = (n.links || []).length + (n.backlinks || []).length;
      var o = {
        id: n.id, title: n.title, deg: deg, sec: si, color: PAL[si % PAL.length],
        ang: (si / Math.max(1, SECTIONS.length)) * Math.PI * 2,
        r: 330, x: 0, y: 0, vx: 0, vy: 0, fixed: n.id === hubId
      };
      nodes.push(o); look.set(n.id, o);
    });

    var counters = Object.create(null);
    nodes.forEach(function (n) {
      if (n.fixed) return;
      var c = counters[n.sec] = (counters[n.sec] || 0) + 1;
      n.r = 330 + ((c - 1) % 4) * 86 + (c > 12 ? 70 : 0);
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
      view.k = Math.min(W, H) / 1620;
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

    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      edges.forEach(function (e) {
        var p = toScreen(e[0].x, e[0].y), q = toScreen(e[1].x, e[1].y);
        var hot = hover && (e[0] === hover || e[1] === hover);
        var hub = e[0].fixed || e[1].fixed;
        ctx.strokeStyle = hot ? "rgba(111,232,198,.55)" : hub ? "rgba(111,232,198,.05)" : "rgba(150,205,196,.13)";
        ctx.lineWidth = hot ? 1.3 : 1;
        ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      });
      var pulse = 0.5 + 0.5 * Math.sin(t / 900);
      nodes.forEach(function (n) {
        var p = toScreen(n.x, n.y);
        var r = n.fixed ? 5.5 : Math.min(8, 2 + Math.sqrt(n.deg) * 0.85);
        var a = 0.55 + 0.45 * pulse;
        if (hover && n !== hover) a *= 0.28;
        ctx.globalAlpha = a;
        ctx.fillStyle = n.fixed ? "#e9b45a" : n.color;
        ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = a * 0.16;
        ctx.beginPath(); ctx.arc(p[0], p[1], r * 3.4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        if (hover === n || n.fixed || n.deg > 30) {
          ctx.fillStyle = n.fixed ? "#e9b45a" : "rgba(214,232,225,.92)";
          ctx.font = (n.fixed ? "600 12px " : "11px ") + "'JetBrains Mono', monospace";
          ctx.fillText(n.title, p[0] + r + 6, p[1] + 4);
        }
      });
    }

    function loop(t) { tick(); draw(t); requestAnimationFrame(loop); }

    function hitTest(sx, sy) {
      var best = null, bd = 1e9;
      nodes.forEach(function (n) {
        var p = toScreen(n.x, n.y);
        var d = (p[0] - sx) * (p[0] - sx) + (p[1] - sy) * (p[1] - sy);
        if (d < 130 && d < bd) { bd = d; best = n; }
      });
      return best;
    }

    cv.addEventListener("mousedown", function (e) {
      var r = cv.getBoundingClientRect();
      var n = hitTest(e.clientX - r.left, e.clientY - r.top);
      if (n && !n.fixed) dragNode = n; else drag = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener("mouseup", function () { drag = null; dragNode = null; });
    cv.addEventListener("mousemove", function (e) {
      var r = cv.getBoundingClientRect();
      var sx = e.clientX - r.left, sy = e.clientY - r.top;
      if (drag) {
        cv.style.cursor = "grabbing";
        pan.x += e.clientX - drag.x; pan.y += e.clientY - drag.y;
        drag.x = e.clientX; drag.y = e.clientY;
        return;
      }
      if (dragNode) {
        var w = toWorld(sx, sy);
        dragNode.x = w[0]; dragNode.y = w[1];
        dragNode.vx = dragNode.vy = 0;
        alpha = Math.max(alpha, 0.1); return;
      }
      var n = hitTest(sx, sy);
      if (n !== hover) { hover = n; cv.style.cursor = n ? "pointer" : "grab"; }
    });
    cv.addEventListener("click", function (e) {
      var r = cv.getBoundingClientRect();
      var n = hitTest(e.clientX - r.left, e.clientY - r.top);
      if (n) location.hash = noteUrl(n.id).slice(1);
    });
    cv.addEventListener("dblclick", function () { pan.x = pan.y = 0; alpha = 0.5; });
    cv.addEventListener("wheel", function (e) {
      e.preventDefault();
      view.k = Math.max(0.2, Math.min(4, view.k * (e.deltaY < 0 ? 1.1 : 0.9)));
    }, { passive: false });

    var lg = document.getElementById("legend");
    if (lg) {
      lg.innerHTML = SECTIONS.map(function (s, i) {
        return '<div><i style="background:' + PAL[i % PAL.length] + '"></i>' + esc(s.name) + "</div>";
      }).join("");
    }

    window.addEventListener("resize", resize);
    resize(); loop(0);
  }

  /* ---------------------------------------------------------------- 检索 */

  var SIDX = null;
  function searchIndex() {
    if (SIDX) return SIDX;
    SIDX = NOTES.map(function (n) {
      return { n: n, t: (n.title + " " + (n.text || "")).toLowerCase() };
    });
    return SIDX;
  }

  function snip(text, q) {
    var low = text.toLowerCase(), first = q.toLowerCase().split(/\s+/)[0] || "";
    var i = low.indexOf(first);
    var start = Math.max(0, i - 60);
    var body = esc(text.slice(start, start + 220));
    var out = body;
    if (first) {
      var re = new RegExp("(" + first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
      out = body.replace(re, "<em>$1</em>");
    }
    return (start > 0 ? "…" : "") + out + "…";
  }

  function viewSearch(q) {
    q = (q || "").trim();
    var hits = [];
    if (q) {
      var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
      searchIndex().forEach(function (row) {
        var ok = true;
        for (var i = 0; i < terms.length; i++) if (row.t.indexOf(terms[i]) < 0) { ok = false; break; }
        if (ok) hits.push(row.n);
      });
    }
    var h = '<div class="stage">' +
      head("QUERY", "检索", "对全部 " + NOTES.length + " 篇正文做子串检索，空格分隔多个关键词则必须全部命中。") +
      '<div class="querybar"><input id="q" class="query" type="search" value="' + esc(q) + '" placeholder="关键词，回车确认">' +
      '<span class="qcount">' + (q ? hits.length + " 命中" : "待输入") + "</span></div>" +
      (q ? '<div class="hits">' + hits.slice(0, 80).map(function (n, i) {
        return '<a class="hit" href="' + noteUrl(n.id) + '">' +
          '<span class="h-id">' + hex(i) + "</span>" +
          '<span class="h-main"><b>' + esc(n.title) + "</b>" +
          "<em>" + esc(n.section || "") + " / " + esc(n.path) + "</em>" +
          '<span class="h-snip">' + snip(n.text || "", q) + "</span></span></a>";
      }).join("") + "</div>" : "") + "</div>";
    return {
      html: h,
      mount: function () {
        var inp = document.getElementById("q");
        if (!inp) return;
        var t = null;
        inp.addEventListener("input", function () {
          clearTimeout(t);
          t = setTimeout(function () {
            var v = inp.value.trim();
            location.hash = v ? "#/q/" + encodeURIComponent(v) : "#/q";
          }, 320);
        });
      }
    };
  }

  /* ---------------------------------------------------------------- 杂项 */

  function notFound(id) {
    return {
      html: '<div class="stage"><div class="lost"><div class="kick">404</div><h1>未著录</h1>' +
        "<p>这份档案里没有这一页。</p><p class=\"dim\">" + esc(id || "") + '</p>' +
        '<p><a href="#/">回到总览</a></p></div></div>'
    };
  }

  function mountLightbox() {
    var img = document.querySelector(".plate-view .zoomable");
    if (!img) return;
    img.addEventListener("click", function () {
      var lb = document.createElement("div");
      lb.className = "lightbox";
      lb.innerHTML = '<img src="' + esc(img.getAttribute("src")) + '" alt="">';
      lb.addEventListener("click", function () { lb.remove(); });
      document.body.appendChild(lb);
    });
  }

  /* ---------------------------------------------------------------- 路由 */

  function parseHash() {
    var h = location.hash.replace(/^#/, "").replace(/^\/+/, "");
    if (!h) return { root: "home", p: [] };
    var parts = h.split("/").filter(function (x) { return x !== ""; });
    var alias = { note: "n", gallery: "g", map: "m" };
    var root = alias[parts[0]] || parts[0];
    return { root: root, p: parts.slice(1).map(decodeURIComponent) };
  }

  var main = null;

  function render() {
    var r = parseHash(), out;
    switch (r.root) {
      case "home": out = viewHome(); break;
      case "s": out = r.p.length ? viewSection(r.p.join("/")) : viewSections(); break;
      case "n": out = viewNote(r.p.join("/")); break;
      case "c": out = viewCharacters(); break;
      case "g": out = r.p.length ? viewGalleryItem(r.p.join("/")) : viewGallery(); break;
      case "x": out = structView(r.p.length ? r.p.join("/") : null); break;
      case "m": out = viewGraph(); break;
      case "q": out = viewSearch(r.p.join("/")); break;
      default: out = notFound(r.root);
    }
    main.innerHTML = out.html;
    main.classList.remove("in");
    void main.offsetWidth;
    main.classList.add("in");
    if (out.mount) out.mount();
    window.scrollTo(0, 0);
    updateDepth();
    var nav = document.getElementById("topnav");
    if (nav) {
      [].forEach.call(nav.querySelectorAll("a"), function (a) {
        var k = a.getAttribute("data-k");
        var on = (k === "home" && r.root === "home") || (k === "s" && r.root === "s") ||
          (k === "c" && r.root === "c") || (k === "g" && r.root === "g") ||
          (k === "m" && r.root === "m") || (k === "q" && r.root === "q") ||
          (k === "x" && r.root === "x");
        a.classList.toggle("on", !!on);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    main = document.getElementById("main");
    mountRail();
    window.addEventListener("scroll", updateDepth, { passive: true });
    window.addEventListener("resize", updateDepth);
    window.addEventListener("hashchange", render);
    document.addEventListener("keydown", function (e) {
      if (e.target.tagName === "INPUT" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        var s = document.getElementById("q");
        if (s) s.focus(); else location.hash = "#/q";
      }
      if (e.key === "]") { if (PAGER && PAGER.next) location.hash = noteUrl(PAGER.next.id).slice(1); }
      if (e.key === "[") { if (PAGER && PAGER.prev) location.hash = noteUrl(PAGER.prev.id).slice(1); }
      if (e.key === "Escape") {
        var lb = document.querySelector(".lightbox");
        if (lb) lb.remove();
      }
    });
    render();
  });
})();
