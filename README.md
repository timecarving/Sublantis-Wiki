# Sublantis 世界观 Wiki

**在线访问** → <https://timecarving.github.io/Sublantis-Wiki/>

把 Obsidian 库里的 **Sublantis 世界观**笔记整理成一个纯静态前端 wiki：原文全收录、结构化数据抽取、Excalidraw 图鉴用**官方导出器真转换**成自包含 SVG、wikilink 关系网络与全文检索。

---

## 打开方式

**本地**：双击 `index.html` 即可（纯 `file://`，无需服务器、无需联网）。本地模式下每篇笔记的元数据栏会出现「查看原始 Markdown ↗」，直接打开旁边的原文快照。

**在线**：整份目录就是一个静态站，丢给 GitHub Pages / Netlify / Vercel 均可，**无需任何构建步骤**（`.nojekyll` 已就位）。

### 部署到 GitHub Pages

```bash
cd Sublantis-Wiki
git init && git add . && git commit -m "Sublantis Wiki"
git branch -M main
git remote add origin https://github.com/<你的用户名>/Sublantis-Wiki.git
git push -u origin main
```

然后仓库 **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**，等 1–2 分钟即可访问：

```
https://<你的用户名>.github.io/Sublantis-Wiki/
```

推送时若提示要密码，GitHub 早已不接受账号密码，需用 **Personal Access Token**（Settings → Developer settings → Personal access tokens → Tokens (classic)，勾 `repo` 权限）当密码填；或改用 SSH（`git@github.com:<用户名>/Sublantis-Wiki.git`）。

- 上传内容只需要 `index.html` + `assets/` + `data/` + `README.md`（约 **9 MB**）。
- **`笔记/` 不进仓库**（已写进 `.gitignore`）：网页正文是预渲染好的 HTML，在线版不依赖原文快照。此时页面检测到不是 `file://` 协议，会**自动隐藏**「查看原始 Markdown」入口，不会出现 404。
- `build/` 是构建工具链（约 20 KB 源码），`node_modules` 与中间产物已被 `.gitignore` 排除。
- 所有引用都是**相对路径**，因此放在 `https://<用户名>.github.io/<仓库名>/` 这种子路径下也能正常跑。

> 页面数据以 `data/*.js`（`window.SUBLANTIS_* = …`）形式加载，而不是 `fetch` 取 JSON —— 这样在 `file://` 下不会被 CORS 拦截。

---

## 目录结构

```
Sublantis-Wiki/
├── index.html              入口（唯一页面，hash 路由）
├── assets/
│   ├── app.js              前端应用：路由 / 8 个视图 / 关系图力学模拟 / 检索
│   ├── style.css           视觉样式
│   └── gallery/
│       ├── *.svg           24 张图鉴 + Canvas 总览，全部矢量、自包含
│       ├── thumbs/*.png     画廊列表用位图缩略图（640px，加快首屏绘制）
│       └── thumbs-sm/*.png  Canvas 卡片内嵌的小图（300px）
├── data/
│   ├── index.js            window.SUBLANTIS_INDEX   —— 元信息 / 分类树 / 图鉴 / 结构化 / 角色 / Canvas
│   └── notes.js            window.SUBLANTIS_NOTES   —— 283 篇笔记正文（预渲染 HTML + 纯文本）
├── 笔记/                    283 篇原文快照 + 1 个 .canvas，与 Obsidian 库逐字节一致
│                          ⚠️ 本地保留，不进仓库（见 .gitignore）
└── build/
    ├── extract.py          Markdown → HTML、MOC → 分类树、表格 → 结构化数据
    ├── render_canvas.js    Obsidian Canvas → 总览 SVG（图鉴节点内嵌官方导出图缩略图）
    ├── make_thumbs.js      用 headless chromium 把 gallery SVG 栅格化成缩略图
    ├── lzlib.js            LZString decompressFromBase64 实现
    └── conv/               Excalidraw 官方导出器工具链（见下）
```

---

## 收录了什么

| 内容 | 数量 | 说明 |
| --- | --- | --- |
| 笔记 | **283** 篇 | `设定/` 258 篇 + `图鉴/未命名/` 24 篇 + MOC；正文以 HTML 形式完整收录进 `data/notes.js` |
| 字数 | 约 **32.7 万** | 去 Markdown 标记后的正文 |
| 分类 | **16** 个大类 | 直接来自 MOC 的 `##` 分区与 `**目录** · N 条` 行 |
| Excalidraw 图鉴 | **24** 张 | 官方导出器转 SVG，手绘抖动 / hachure 填充 / Excalifont 字体全部保留，字体已内联 |
| Canvas 总览 | 1 张 | 62 节点 22 连线，图鉴节点内嵌真图缩略图 |
| 结构化数据集 | **9** 组 | 命名法对照 / 神秘学↔技术对应 / Zone 体系 / 十六进制纪年 / 神性实体进化 / 国徽·国旗·国花·国鸟 |
| 角色条目 | **15** | 抽取姓名·性别·专业·Socionics·MBTI·超心理定位·家庭等字段 |
| wikilink | **530** 条唯一边 | MOC 索引 278 条 + 正文互链 |

---

## 八个视图（hash 路由）

| 路由 | 视图 | 说明 |
| --- | --- | --- |
| `#/` | 总览 | 统计、分类卡（代表条目 + 字数）、索引长文、图鉴缩略图带、快捷入口 |
| `#/s` `#/s/<分类名>` | 分类浏览 | MOC 两级树：分类 → 合辑 → 笔记列表 |
| `#/n/<笔记 id>` | 笔记阅读 | 预渲染正文 + 右侧目录 / 反向链接 / 出链 / 元数据；底部「上一篇 / 下一篇」按 MOC 顺序；`file://` 下多一个「查看原始 Markdown ↗」 |
| `#/x` `#/x/<key>` | 结构化 | 对照表与键值表，标签页切换，每条注明来源笔记 |
| `#/c` | 角色名录 | 从角色档案笔记抽取的结构化字段卡片 |
| `#/g` `#/g/<图鉴>` | 图鉴画廊 | 24 张缩略图 + Canvas 通栏卡 + 名称/摘要/关联笔记筛选框；详情页含图内文本大纲与元素级关联笔记，大图可点击放大（Esc 关闭） |
| `#/map` | 关系图 | 283 节点 / 530 边力导向网络，按分类着色，可拖拽·缩放·点击进入 |
| `#/q/<词>` | 全文检索 | 对全部正文做子串检索，空格分隔多关键词（须全部命中） |

快捷键：`/` 聚焦搜索框；笔记页 `[` / `]`（或 `k` / `j`）切换上一篇 / 下一篇；大图放大后 `Esc` 关闭。

移动端已适配（≤760px：导航折行可横滑、侧栏隐藏、表格横向滚动）。

**收录范围**：只收 Sublantis / HMLC 本体设定。作者为其他作品或未来作品写的规划不入站 —— 渲染期由 `build/extract.py` 的 `CROSS_WORK_STRIP` / `redact()` 剔除，源 `.md` 不动。

---

## 重建

源库路径写在 `build/extract.py` 顶部（常量 `VAULT` / `WIKI`）。

```bash
# 1) 数据层：Markdown → HTML、分类树、结构化数据、角色字段、Canvas 结构
python3 build/extract.py

# 2) 图鉴：用 Excalidraw 官方导出器真转换（一次性，需要联网装依赖）
cd build/conv
npm i @excalidraw/excalidraw esbuild
npx esbuild entry.js --bundle --format=iife --outfile=bundle.js
node collect_scenes.js          # 解 LZString，产出 scenes.js
node serve.js 24 &              # 本地静态服务（导出器要像浏览器一样取字体）
chromium --headless --disable-gpu --no-sandbox --virtual-time-budget=180000 \
         --screenshot=/tmp/x.png "http://127.0.0.1:8752/"     # 页面里自动导出并回传
# 3) 缩略图 + Canvas 总览
node build/make_thumbs.js
node build/render_canvas.js
```

依赖：Python 3 + `markdown`（`pip install markdown`）；Node.js；headless chromium（Playwright 缓存里的那个即可）。

重新拷贝原文快照（**只读拷贝，不动源文件**）：

```bash
rsync -a --delete "/path/to/Sublantis世界观大体概述/" 笔记/
```

---

## 构建期做了什么

**Markdown → HTML（`build/extract.py`）**

- 保护代码块与行内代码为占位符，避免被后续替换误伤；
- `[[路径|别名]]` → 解析为站内链接（basename 索引回退，优先 `设定/` 下、路径最短者）；无法解析的渲染成灰点线 `dead link` 而非丢弃；
- `![[x.excalidraw]]` 嵌入 → 指向图鉴详情页；
- Obsidian callout（`> [!info] 标题`）→ 带 `data-type` 的 `<div class="callout">`，按类型着色，内部再跑一遍行内替换（占位符递归展开，无残留）；
- `==高亮==` → `<mark>`；`%%注释%%` 删除；
- 文末 `<!-- dsh:children -->` 名单转为链接，`<!-- dsh:nav -->` 导航块整段剔除；
- 正文开头的重复 `<h1>` 去掉（页头已显示标题）。

**Excalidraw → SVG（`build/conv/`，官方导出器）**

- 数据藏在 ```compressed-json``` 围栏里的 **LZString base64**（不是 zlib/gzip），`collect_scenes.js` 解码成场景；
- 浏览器里跑 `@excalidraw/excalidraw` 的 `exportToSvg`（0.18 起是**单对象入参** `{elements, appState, files}`），产物即 Excalidraw 自己的导出结果；
- `EXCALIDRAW_ASSET_PATH` 指向本地 `dist/prod/`，字体随导出**内联成 base64**，因此每个 SVG 都是自包含的，离线/换机器都能正常显示；
- 结果由页面 POST 回本地 server 落盘，不经手任何手工渲染代码。

**Canvas → SVG（`build/render_canvas.js`）**

- Obsidian Canvas 没有官方导出器，按 canvas JSON 自绘：group 虚线框 / 边三次贝塞尔 + 箭头 + 标签 / 文件卡片；
- 卡片里若指向 `.excalidraw.md`，内嵌上面官方导出的位图缩略图（9 张），所以图鉴节点的预览也是真转换产物。

---

## 已知取舍

- Canvas 总览图本身是自绘的（Obsidian 未提供官方 canvas 渲染器），但它引用的 9 张 Excalidraw 图是官方导出结果。
- 图鉴笔记的正文是空 HTML，只参与检索与图鉴详情页（原文在 `.excalidraw.md` 快照里）。
- 角色字段由正则从正文头部抽取，仅供参考，完整设定以各条目正文为准。
- `data/notes.js` 约 1.9 MB，首次打开会解析全部正文以支持全文检索（本地文件，无网络开销）。
- 在线版不含 `笔记/` 原文快照，因此「查看原始 Markdown」入口按协议自动隐藏（`assets/app.js` 里的 `RAW_NOTES`）。想连原文一起公开，就把 `笔记/` 从 `.gitignore` 移出，并把 `RAW_NOTES` 改成 `true`。

---

内容版权归原作设定者所有；本 wiki 仅为阅读与索引用途的本地整理。
