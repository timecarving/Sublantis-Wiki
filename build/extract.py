#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sublantis Wiki — 构建脚本
把 Obsidian 库的 Sublantis 世界观笔记抽取为前端 wiki 可直接加载的数据。

输入：/home/mallorine/文档/Obsidian Vault/HMLC-newsettings (2)/Sublantis世界观大体概述
输出：<wiki>/data/index.js, <wiki>/data/notes.js
"""
import os, re, json, html
from urllib.parse import quote

VAULT = "/home/mallorine/文档/Obsidian Vault/HMLC-newsettings (2)/Sublantis世界观大体概述"
WIKI = "/home/mallorine/下载/Sublantis-Wiki"

import markdown
from markdown.extensions.toc import TocExtension

# ================================================================ 工具

def read(p):
    with open(p, encoding="utf-8") as f:
        return f.read()

def quote_id(nid):
    return quote(nid, safe="")

def sanitize_file(s):
    return re.sub(r"[^\w\u4e00-\u9fff\-]+", "_", s)

def strip_md(txt):
    t = re.sub(r"^---\n.*?\n---\n", "", txt, count=1, flags=re.S)
    t = re.sub(r"```.*?```", " ", t, flags=re.S)
    t = re.sub(r"`([^`]*)`", r"\1", t)
    t = re.sub(r"<!--.*?-->", " ", t, flags=re.S)
    t = re.sub(r"\[\[([^\]\|]+)(?:\|([^\]]*))?\]\]", lambda m: m.group(2) or m.group(1).split("/")[-1], t)
    t = re.sub(r"!\[[^\]]*\]\([^\)]*\)", " ", t)
    t = re.sub(r"\[([^\]]*)\]\([^\)]*\)", r"\1", t)
    t = re.sub(r"^#{1,6}\s*", "", t, flags=re.M)
    t = re.sub(r"^\s*>\s?", "", t, flags=re.M)
    t = re.sub(r"\[![^\]]*\][+-]?", "", t)
    t = re.sub(r"[*_~]{1,3}", "", t)
    t = re.sub(r"\s+", " ", t)
    return t.strip()

def blurb_from_md(md, title):
    body = re.sub(r"^---\n.*?\n---\n", "", md, count=1, flags=re.S)
    body = re.sub(r"```.*?```", " ", body, flags=re.S)
    body = re.sub(r"<!--.*?-->", " ", body, flags=re.S)
    for line in body.split("\n"):
        t = line.strip()
        if not t or len(t) < 8:
            continue
        if re.match(r"^#{1,6}\s", t) or t.startswith(("|", "```", "^^", "%%")):
            continue
        if re.match(r"^[-=]{3,}$", t):
            continue
        if re.match(r"^\[![^\]]*\]", t):
            continue
        t = strip_md(t)
        t = re.sub(r"^[\s·•\-—]+", "", t)
        if len(t) < 8:
            continue
        return t[:150]
    return ""


def first_sentence(plain, title):
    s = plain
    s = s.split(" ", 1)[1] if s.startswith(title) else s
    s = s.strip()
    m = re.split(r"(?<=[。！？；])", s)
    out = ""
    for part in m:
        if not part:
            continue
        out += part
        if len(out) >= 60:
            break
    return out[:160].strip()

# ================================================================ 收集文件

notes_raw = {}
for root, dirs, files in os.walk(VAULT):
    dirs[:] = [d for d in dirs if not d.startswith(".")]
    for fn in files:
        if not fn.endswith(".md"):
            continue
        full = os.path.join(root, fn)
        rel = os.path.relpath(full, VAULT)
        nid = rel[:-3]
        txt = read(full)
        base = fn[:-3]
        if rel.startswith("图鉴/"):
            title = re.sub(r"\.excalidraw$", "", base)
        else:
            body = re.sub(r"^---\n.*?\n---\n", "", txt, count=1, flags=re.S)
            m = re.search(r"^#\s+(.+?)\s*$", body, re.M)
            title = m.group(1).strip() if m else base
        notes_raw[nid] = {"id": nid, "path": rel, "dir": os.path.dirname(rel),
                          "base": base, "title": title, "md": txt}

MOC_ID = "Sublantis 世界观总览（MOC）"
moc_md = notes_raw[MOC_ID]["md"]

by_base = {}
for nid, n in notes_raw.items():
    by_base.setdefault(n["base"], []).append(nid)

def resolve_link(target):
    t = (target or "").strip().split("#")[0].strip()
    if not t:
        return None
    if t.endswith(".md"):
        t = t[:-3]
    if t in notes_raw:
        return t
    t2 = re.sub(r"\.excalidraw$", "", t)
    if t2 in notes_raw:
        return t2
    b = t.split("/")[-1]
    hits = by_base.get(b) or by_base.get(re.sub(r"\.excalidraw$", "", b))
    if hits:
        return sorted(hits, key=lambda x: (not x.startswith("设定/"), len(x)))[0]
    return None

# ================================================================ MOC 结构

SECTIONS = []
sec_by_id, blurb_by_id = {}, {}

cur_sec = None
cur_col = None
for line in moc_md.split("\n"):
    m = re.match(r"^##\s+(.+?)\s*$", line)
    if m:
        cur_sec = {"name": m.group(1).strip(), "intro": [], "collections": []}
        SECTIONS.append(cur_sec)
        cur_col = None
        continue
    if cur_sec is None:
        continue
    m = re.match(r"^\*\*(.+?)\*\*\s*·\s*(\d+)\s*条\s*$", line)
    if m:
        cur_col = {"name": m.group(1).strip(), "declared": int(m.group(2)), "ids": [], "blurb": "", "blurb_id": None}
        cur_sec["collections"].append(cur_col)
        continue
    m = re.match(r"^-\s*\[\[([^\]\|]+)(?:\|([^\]]*))?\]\](?:\s*—\s*(.*))?\s*$", line)
    if m:
        nid = resolve_link(m.group(1))
        blurb = (m.group(3) or "").strip()
        if nid and cur_col is not None:
            if nid not in cur_col["ids"]:
                cur_col["ids"].append(nid)
            if blurb and not cur_col["blurb"]:
                cur_col["blurb"], cur_col["blurb_id"] = blurb, nid
            if nid not in sec_by_id:
                sec_by_id[nid] = (cur_sec["name"], cur_col["name"])
        continue
    if cur_col is None and line.strip() and not line.startswith((">", "|", "#")) and cur_sec is not None:
        cur_sec["intro"].append(line.strip())

for s in SECTIONS:
    s["collections"] = [c for c in s["collections"] if c["ids"]]
    s["count"] = sum(len(c["ids"]) for c in s["collections"])
SECTIONS = [s for s in SECTIONS if s["collections"]]

# ================================================================ 图鉴解析

def parse_gallery(rel):
    txt = read(os.path.join(VAULT, rel))
    blocks, elinks = [], []
    m = re.search(r"## Text Elements\n(.*?)(?=\n## |\n```compressed-json)", txt, re.S)
    if m:
        for line in m.group(1).split("\n"):
            line = re.sub(r"\s*\^[A-Za-z0-9]+$", "", line.strip())
            if line:
                blocks.append(line)
    m2 = re.search(r"## Element Links\n(.*?)(?=\n## |\n```|\Z)", txt, re.S)
    if m2:
        for line in m2.group(1).split("\n"):
            line = line.strip()
            if line and "[[" in line:
                elinks.append(line)
    return blocks, elinks

gallery_note = {}
for line in moc_md.split("\n"):
    m = re.match(r"^\|\s*\[\[([^\]\|]+)(?:\|[^\]]*)?\]\]\s*\|\s*(.+?)\s*\|\s*$", line)
    if m:
        nid = resolve_link(m.group(1))
        if nid and nid.startswith("图鉴/"):
            gallery_note[nid] = m.group(2).strip()

gallery = []
for nid, n in sorted(notes_raw.items()):
    if not nid.startswith("图鉴/"):
        continue
    base = n["base"].replace(".excalidraw", "")
    blocks, elinks = parse_gallery(n["path"])
    gallery.append({"id": nid, "name": base, "path": n["path"],
                    "svg": "assets/gallery/" + sanitize_file(base) + ".svg",
                    "thumb": "assets/gallery/thumbs/" + sanitize_file(base) + ".png",
                    "texts": blocks, "elinks": elinks,
                    "note": gallery_note.get(nid, "")})

# ---------------------------------------------------------------- Canvas 总览
CANVAS = None
_cp = os.path.join(VAULT, "Sublantis 世界观总览.canvas")
if os.path.exists(_cp):
    _cv = json.loads(read(_cp))
    _nodes = []
    for nd in _cv.get("nodes", []):
        t = nd.get("type")
        label, nid = "", None
        if t == "file":
            f = (nd.get("file") or "").replace("HMLC-newsettings (2)/Sublantis世界观大体概述/", "")
            nid = resolve_link(f.replace(".md", ""))
            label = notes_raw[nid]["title"] if nid else f.split("/")[-1].replace(".md", "")
            if nd.get("subpath"):
                label += " " + str(nd["subpath"])
        elif t == "group":
            label = nd.get("label") or ""
        elif t == "text":
            label = strip_md(nd.get("text") or "")[:80]
        elif t == "link":
            label = nd.get("url") or ""
        _nodes.append({"id": nd.get("id"), "type": t, "label": label, "note": nid,
                       "color": str(nd.get("color") or ""), "x": nd["x"], "y": nd["y"],
                       "w": nd["width"], "h": nd["height"]})
    _edges = [{"from": e.get("fromNode"), "to": e.get("toNode"), "label": e.get("label") or "",
               "fromSide": e.get("fromSide"), "toSide": e.get("toSide")} for e in _cv.get("edges", [])]
    CANVAS = {"name": "Sublantis 世界观总览", "file": "Sublantis 世界观总览.canvas",
              "svg": "assets/gallery/_canvas_general.svg",
              "note": "从「一张图看全貌」出发，逐层下钻到具体条目 —— Obsidian Canvas 总览图。",
              "nodes": _nodes, "edges": _edges}

# ================================================================ Markdown 渲染

CODE_FENCE = re.compile(r"^```([^\n`]*)\n(.*?)^```\s*$", re.M | re.S)

# 收录边界：作者为「其他作品 / 未来作品」写的内容不进本站，只在渲染期剔除，源 .md 一个字节不动。
CROSS_WORK_STRIP = [
    re.compile(r"^- 联动：作者另一部作品.*?(?=\n\s*[-#]|\n\s*$)", re.M | re.S),
]


def redact(md):
    for pat in CROSS_WORK_STRIP:
        md = pat.sub("", md)
    return md
MD = markdown.Markdown(extensions=[
    "tables", "fenced_code", "sane_lists", "attr_list", "footnotes",
    "md_in_html", "admonition",
    TocExtension(permalink=False, toc_depth="2-4"),
])

CALL_DEFAULT = {"info": "信息", "tip": "提示", "note": "笔记", "warning": "注意",
                "danger": "警告", "example": "示例", "quote": "引用", "important": "重要",
                "abstract": "摘要", "todo": "待办", "success": "完成", "question": "问题",
                "failure": "失败", "bug": "缺陷", "summary": "总结"}

def wiki_link(target, alias, links_out):
    nid = resolve_link(target)
    if nid:
        links_out.add(nid)
        label = alias.strip() if alias and alias.strip() else notes_raw[nid]["title"]
        return f'<a class="wikilink" href="#/n/{quote_id(nid)}">{html.escape(label)}</a>'
    label = (alias or target).strip().split("/")[-1]
    return f'<span class="wikilink dead" title="库中无此文：{html.escape(target, True)}">{html.escape(label)}</span>'

def preprocess(md, links_out):
    ph = {}
    md = re.sub(r"^---\n.*?\n---\n", "", md, count=1, flags=re.S)

    def fence_sub(m):
        lang = (m.group(1) or "").strip()
        body = m.group(2)
        if lang in ("text-plain", "text", "plain", "txt"):
            lang = ""
        cls = f' class="language-{html.escape(lang)}"' if lang else ""
        key = f"@@B{len(ph)}@@"
        ph[key] = f'<pre class="code-block"><code{cls}>{html.escape(body)}</code></pre>'
        return "\n\n" + key + "\n\n"
    md = CODE_FENCE.sub(fence_sub, md)

    def inline_sub(m):
        key = f"@@B{len(ph)}@@"
        ph[key] = "<code>" + html.escape(m.group(1)) + "</code>"
        return key
    md = re.sub(r"`([^`\n]+)`", inline_sub, md)

    md = re.sub(r"%%.*?%%", "", md, flags=re.S)

    def embed_sub(m):
        target = m.group(1)
        nid = resolve_link(target)
        if nid and nid.startswith("图鉴/"):
            return f'<a class="wikilink embed" href="#/g/{quote_id(nid)}">图鉴 · {html.escape(notes_raw[nid]["base"].replace(".excalidraw",""))}</a>'
        if nid:
            links_out.add(nid)
            return f'<a class="wikilink embed" href="#/n/{quote_id(nid)}">{html.escape(notes_raw[nid]["title"])}</a>'
        return f'<span class="wikilink dead">{html.escape(target)}</span>'
    md = re.sub(r"!\[\[([^\]\|]+)(?:\|[^\]]*)?\]\]", embed_sub, md)

    md = re.sub(r"\[\[([^\]\|]+)(?:\|([^\]]*))?\]\]",
                lambda m: wiki_link(m.group(1), m.group(2), links_out), md)

    md = re.sub(r"==([^=\n]+)==", r"<mark>\1</mark>", md)

    # callout
    lines = md.split("\n")
    out, i = [], 0
    while i < len(lines):
        cm = re.match(r"^>\s*\[!(\w+)\]([+-]?)\s*(.*)$", lines[i])
        if cm:
            ctype, ctitle, body = cm.group(1).lower(), cm.group(3).strip(), []
            i += 1
            while i < len(lines):
                if lines[i].startswith(">"):
                    body.append(re.sub(r"^>\s?", "", lines[i])); i += 1
                elif lines[i].strip() == "" and i + 1 < len(lines) and lines[i + 1].startswith(">"):
                    body.append(""); i += 1
                else:
                    break
            key = f"@@B{len(ph)}@@"
            ph[key] = {"callout": True, "type": ctype,
                       "title": ctitle or CALL_DEFAULT.get(ctype, ctype),
                       "body": "\n".join(body).strip(), "links": links_out}
            out += ["", key, ""]
            continue
        out.append(lines[i]); i += 1
    md = "\n".join(out)

    def children_sub(m):
        inner = m.group(1)
        def li(mm):
            name = mm.group(2).strip()
            nid = resolve_link(name)
            if nid:
                links_out.add(nid)
                return f'- <a class="wikilink" href="#/n/{quote_id(nid)}">{html.escape(notes_raw[nid]["title"])}</a>'
            return mm.group(0)
        return re.sub(r"^(\s*-\s*)(.+?)\s*$", li, inner, flags=re.M)
    md = re.sub(r"<!--\s*dsh:children:start\s*-->(.*?)<!--\s*dsh:children:end\s*-->", children_sub, md, flags=re.S)
    md = re.sub(r"<!--\s*dsh:nav:start\s*-->.*?<!--\s*dsh:nav:end\s*-->", "", md, flags=re.S)
    return md, ph

def md_to_html(md, links_out):
    pre, ph = preprocess(md, links_out)
    out = MD.convert(pre)
    out = re.sub(r"<p>\s*(@@B\d+@@)\s*</p>", r"\1", out)
    out = re.sub(r"@@B\d+@@", lambda m: render_ph(ph.get(m.group(0)), ph), out)
    out = re.sub(r"^\s*<h1[^>]*>.*?</h1>\s*", "", out, count=1, flags=re.S)
    return out

def render_ph(v, ph=None):
    if v is None:
        return ""
    if isinstance(v, str):
        if ph:
            v = re.sub(r"@@B\d+@@", lambda m: render_ph(ph.get(m.group(0)), ph), v)
        return v
    inner = MD.convert(v["body"]) if v["body"] else ""
    if ph:
        inner = re.sub(r"<p>\s*(@@B\d+@@)\s*</p>", r"\1", inner)
        inner = re.sub(r"@@B\d+@@", lambda m: render_ph(ph.get(m.group(0)), ph), inner)
    lo = v["links"]
    inner = re.sub(r"\[\[([^\]\|]+)(?:\|([^\]]*))?\]\]",
                   lambda m: wiki_link(m.group(1), m.group(2), lo), inner)
    inner = re.sub(r"==([^=\n]+)==", r"<mark>\1</mark>", inner)
    return (f'<div class="callout" data-type="{v["type"]}">'
            f'<div class="callout-title">{html.escape(v["title"])}</div>'
            f'<div class="callout-body">{inner}</div></div>')

# ================================================================ 生成笔记

NOTES = []
for nid, n in sorted(notes_raw.items()):
    links, kind = set(), "note"
    if nid.startswith("图鉴/"):
        html_body = ""
        kind = "gallery"
        plain = " ".join(parse_gallery(n["path"])[0])
    else:
        html_body = md_to_html(redact(n["md"]), links)
        plain = strip_md(redact(n["md"]))
    sec, col = sec_by_id.get(nid, (None, None))
    if sec is None and not nid.startswith("图鉴/"):
        sec = n["dir"].split("/")[0] if n["dir"] else "其他"
        col = n["dir"]
    if sec is None:
        sec, col = "图鉴", "Excalidraw 图鉴"
    blurb = blurb_by_id.get(nid, "") or gallery_note.get(nid, "") or blurb_from_md(n["md"], n["title"]) or first_sentence(plain, n["title"])
    NOTES.append({
        "id": nid, "title": n["title"], "base": n["base"], "path": n["path"],
        "dir": n["dir"], "section": sec, "collection": col, "kind": kind,
        "blurb": blurb, "words": len(plain),
        "html": html_body, "text": plain[:30000], "links": sorted(links),
    })

# 补 blurb_by_id 需要在生成前收集：重跑一次 MOC 收集
blurb_by_id = {}
for s in SECTIONS:
    for c in s["collections"]:
        if c.get("blurb_id") and c.get("blurb"):
            blurb_by_id[c["blurb_id"]] = c["blurb"]
for note in NOTES:
    if blurb_by_id.get(note["id"]):
        note["blurb"] = blurb_by_id[note["id"]]

# ================================================================ 反向链接 & 图

by_id = {n["id"]: n for n in NOTES}
backlinks = {nid: [] for nid in by_id}
for n in NOTES:
    for t in n["links"]:
        if t in backlinks and n["id"] not in backlinks[t]:
            backlinks[t].append(n["id"])
for n in NOTES:
    n["backlinks"] = sorted(backlinks.get(n["id"], []))

# ================================================================ 结构化内容

def find_by_base(base):
    hits = by_base.get(base)
    if not hits:
        return None
    nid = hits[0]
    raw = notes_raw[nid]
    merged = dict(by_id.get(nid, {}))
    merged["md"] = raw["md"]
    return merged

def parse_tables(note):
    """把一篇笔记里的所有 markdown 表格解析成 [{caption, headers, rows}]"""
    if not note:
        return []
    tables = []
    lines = note["html"].split("\n")
    title_stack = []
    cur_caption = note["title"]
    out = []
    i = 0
    raw = note["md"]
    # 直接从 md 解析，保留结构
    cur_head = note["title"]
    buf, cap = [], None
    def flush(buf, cap):
        if not buf:
            return None
        rows = []
        for ln in buf:
            cells = [c.strip() for c in ln.strip().strip("|").split("|")]
            rows.append(cells)
        if len(rows) >= 2 and re.match(r"^[\s\-:|]+$", rows[1][0] + "".join(rows[1])):
            headers, body = rows[0], rows[2:]
        else:
            headers, body = rows[0], rows[1:]
        # 去掉分隔行
        body = [r for r in body if not all(re.match(r"^[\s\-:]*$", c) for c in r)]
        return {"caption": cap, "headers": headers, "rows": body}
    for ln in raw.split("\n"):
        if ln.strip().startswith("|") and ln.count("|") >= 2:
            if cap is None:
                cap = cur_head
            buf.append(ln)
            continue
        if buf:
            t = flush(buf, cap)
            if t:
                out.append(t)
            buf, cap = [], None
        m = re.match(r"^#{2,4}\s+(.+)$", ln)
        if m:
            cur_head = m.group(1).strip()
    if buf:
        t = flush(buf, cap)
        if t:
            out.append(t)
    return out

def parse_bullets(note):
    """把笔记里 `- key = value` / `* key：value` / `- **key**：value` 按 ## 小节分组成 [{heading, items:[{key,value}]}]"""
    if not note:
        return []
    groups, cur_head, items = [], note["title"], []
    def norm(s):
        s = s.strip().strip("*").strip()
        s = re.sub(r"\*\*", "", s).strip()
        return s
    for ln in note["md"].split("\n"):
        m = re.match(r"^#{2,4}\s+(.+)$", ln)
        if m:
            if items:
                groups.append({"heading": cur_head, "items": items})
                items = []
            cur_head = m.group(1).strip()
            continue
        m = re.match(r"^\s*[-*]\s+(.+)$", ln)
        if not m:
            continue
        body = m.group(1).strip()
        mm = re.match(r"^(.*?)\s*(?:=|：|:)\s*(.+)$", body)
        if mm:
            k, v = norm(mm.group(1)), norm(mm.group(2))
        else:
            k, v = norm(body), ""
        if not k:
            continue
        if len(k) > 90 or len(v) > 400:
            continue
        items.append({"key": k, "value": v})
    if items:
        groups.append({"heading": cur_head, "items": items})
    return [g for g in groups if g["items"]]


STRUCT = []  # [{key,title,desc,source,sourceId,kind,data}]

DATASETS = [
    ("naming", "命名法对照", "Sublantis 专名拆解：表面含义与深层含义", "命名法对照表", "table"),
    ("mystech", "神秘学 ↔ 技术对应", "神秘学概念被工程化后的精确技术实现", "神秘学-技术对应关系", "table"),
    ("zones", "Zone 体系", "十六进制版的 16 个 Zone 及其分配", "Zone体系（0–9与A–F）", "bullets"),
    ("calendar", "十六进制纪年", "纪年进制、时间基准与 Barker 经线", "十六进制纪年与时间标准化", "table"),
    ("deities", "神性实体进化路线", "AOE 的 0–4 环神性实体与守门员", "神性实体进化路线", "table"),
]
for key, title, desc, base, kind in DATASETS:
    note = find_by_base(base)
    if not note:
        print("!! 未找到结构化源:", base)
        continue
    data = parse_tables(note) if kind == "table" else parse_bullets(note)
    if not data:
        print("!! 结构化源解析为空:", base)
    STRUCT.append({"key": key, "title": title, "desc": desc, "source": note["title"],
                   "sourceId": note["id"], "kind": kind, "data": data})

for b, key in [("国徽", "emblem"), ("国旗", "flag"), ("国花", "flower"), ("国鸟", "bird")]:
    x = find_by_base(b)
    if x:
        STRUCT.append({"key": "sym-" + key, "title": x["title"], "desc": "国家标志",
                       "source": x["title"], "sourceId": x["id"], "kind": "note",
                       "data": [{"heading": x["title"], "items": [{"key": "说明", "value": x["blurb"]}]}]})

# —— 角色名录
CHAR_FILES = [
    "AST-角色档案", "Michelle-角色档案", "AST", "Michelle Sarkon", "Nash Grueber",
    "Peyton Morrison", "BDD", "CNF", "DCC", "ISP", "SRE", "WAF", "Ivy deMontre",
    "Nago与AST家庭", "支线角色（CCRU命名移植）", "HMLC建制与成员沿革",
    "角色关系与灵感来源", "Socionics与成员关系",
]
FIELD_PATTERNS = [
    ("fullname", r"(?:全名|姓名)\s*[:：]\s*(.+)"),
    ("gender", r"性别\s*[:：]\s*(.+)"),
    ("deadname", r"deadname\s*[:：]\s*(.+)"),
    ("birth", r"出生地\s*[:：]\s*(.+)"),
    ("major", r"专业\s*[:：]\s*(.+)"),
    ("socionics", r"[Ss]ocionics(?:\s*/\s*MBTI)?\s*[:：]\s*(.+)"),
    ("mbti", r"MBTI\s*[:：]\s*(.+)"),
    ("psy", r"(?:超心理定位|超心理)\s*[:：]\s*(.+)"),
    ("family", r"家庭\s*[:：]\s*(.+)"),
    ("position", r"定位\s*[:：]\s*(.+)"),
    ("socionics", r"[Ss]ocionics\s*[:：]\s*(.+)"),
]

characters = []
for b in CHAR_FILES:
    note = find_by_base(b)
    if not note:
        continue
    txt = note["md"]
    rec = {"id": note["id"], "name": note["title"].replace(" 角色档案", ""), "title": note["title"],
           "blurb": note["blurb"], "path": note["path"], "section": note["section"],
           "fields": {}, "socionics": None}
    # 名字归一：去掉括号里的补充说明（如「Michelle（重要角色 / 相对主角）」→「Michelle」）
    mm = re.match(r"^([^（(]{1,24})\s*[（(]", rec["name"])
    if mm:
        rec["name"] = mm.group(1).strip()
    head = "\n".join(txt.split("\n")[:80])
    for key, pat in FIELD_PATTERNS:
        if key in rec["fields"]:
            continue
        m = re.search(pat, head, re.M)
        if m:
            val = m.group(1).strip().strip("*").strip()
            if val and len(val) < 120:
                rec["fields"][key] = val
    # socionics 单独找
    m = re.search(r"(?:[Ss]ocionics\s*[:：]|socionics\s*[:：])\s*(.+)", head)
    if m:
        rec["socionics"] = m.group(1).strip()
    characters.append(rec)

# 排序：核心 11 → 其他
CORE = ["AST", "Michelle", "Nash", "Peyton", "CNF", "WAF", "SRE", "BDD", "DCC", "ISP", "Ivy"]
def char_rank(c):
    for i, k in enumerate(CORE):
        if c["name"].startswith(k) or c["title"].replace(" 角色档案", "").startswith(k):
            return i
    return 99
characters.sort(key=char_rank)

# 去重：同名 / 前缀名（Michelle 与 Michelle Sarkon）合并，保留字段更多的一条
_dedup = []
def _find_slot(name):
    low = name.lower()
    for c in _dedup:
        a, b = c["name"].lower(), low
        if a == b or (len(a) >= 5 and b.startswith(a)) or (len(b) >= 5 and a.startswith(b)):
            return c
    return None
for c in characters:
    slot = _find_slot(c["name"])
    if slot is None:
        _dedup.append(c)
    else:
        richer, poorer = (c, slot) if len(c["fields"]) > len(slot["fields"]) else (slot, c)
        richer["fields"] = {**poorer["fields"], **richer["fields"]}
        richer.setdefault("aliases", []).append(poorer["id"])
        if len(c["name"]) > len(slot["name"]) and richer is c:
            richer["name"] = slot["name"]
        if richer is not slot:
            _dedup[_dedup.index(slot)] = richer
characters = sorted(_dedup, key=char_rank)

# —— 分类统计
from collections import Counter, OrderedDict
cat_counter = Counter(n["section"] for n in NOTES)
folder_counter = Counter(n["dir"].split("/")[0] if n["dir"] else "(根)" for n in NOTES)

# ================================================================ 输出

def js(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))

INDEX = {
    "meta": {
        "name": "Sublantis 世界观 Wiki",
        "subtitle": "OC 世界观设定集 · 结构化收录",
        "source": "Obsidian: HMLC-newsettings (2)/Sublantis世界观大体概述",
        "noteCount": len(NOTES),
        "galleryCount": len(gallery),
        "charCount": sum(n["words"] for n in NOTES),
        "builtAt": "2026-10-16",
    },
    "sections": [{"name": s["name"], "count": s["count"],
                  "intro": s["intro"],
                  "collections": [{"name": c["name"], "declared": c.get("declared", len(c["ids"])),
                                   "ids": c["ids"], "blurb": c.get("blurb", ""),
                                   "blurb_id": c.get("blurb_id")} for c in s["collections"]]}
                 for s in SECTIONS],
    "gallery": gallery,
    "canvas": CANVAS,
    "structured": STRUCT,
    "characters": characters,
    "stats": {
        "sections": [{"name": k, "count": v} for k, v in cat_counter.most_common()],
        "folders": [{"name": k, "count": v} for k, v in folder_counter.most_common()],
    },
    "notesIndex": [{k: v for k, v in n.items() if k not in ("html", "text")} for n in NOTES],
}

os.makedirs(os.path.join(WIKI, "data"), exist_ok=True)
with open(os.path.join(WIKI, "data", "index.js"), "w", encoding="utf-8") as f:
    f.write("window.SUBLANTIS_INDEX = " + js(INDEX) + ";\n")
with open(os.path.join(WIKI, "data", "notes.js"), "w", encoding="utf-8") as f:
    f.write("window.SUBLANTIS_NOTES = " + js(NOTES) + ";\n")

print("notes:", len(NOTES))
print("gallery:", len(gallery))
print("sections:", [(s["name"], s["count"]) for s in SECTIONS])
print("characters:", [(c["name"], list(c["fields"].keys())) for c in characters[:14]])
print("structured:", [(s0["key"], s0["kind"], len(s0["data"])) for s0 in STRUCT])
print("index.js KB:", os.path.getsize(os.path.join(WIKI, "data", "index.js")) // 1024)
print("notes.js KB:", os.path.getsize(os.path.join(WIKI, "data", "notes.js")) // 1024)
