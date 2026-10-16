// 把 Obsidian 的 .excalidraw.md 解码成 Excalidraw 场景，供浏览器端官方导出器使用
const fs = require("fs");
const path = require("path");
const lz = require("../lzlib.js");

const VAULT = "/home/mallorine/文档/Obsidian Vault/HMLC-newsettings (2)/Sublantis世界观大体概述/图鉴";
const OUT = path.join(__dirname, "scenes.js");

function decode(file) {
  const txt = fs.readFileSync(file, "utf8");
  const m = txt.match(/```compressed-json\s*([\s\S]*?)```/);
  if (!m) throw new Error("no compressed-json in " + file);
  const b64 = m[1].replace(/\s+/g, "");
  const json = lz(b64);
  if (!json) throw new Error("lz failed " + file);
  return JSON.parse(json);
}

const scenes = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (name.endsWith(".excalidraw.md")) {
      const data = decode(p);
      const elements = (data.elements || []).filter((e) => !e.isDeleted);
      const name2 = name.replace(/\.excalidraw\.md$/, "");
      scenes.push({
        name: name2,
        file: path.relative(VAULT, p),
        elements,
        viewBackgroundColor: (data.appState && data.appState.viewBackgroundColor) || "#ffffff",
      });
      console.log(name2, elements.length, "elements");
    }
  }
}
walk(VAULT);

fs.writeFileSync(OUT, "window.__SCENES = " + JSON.stringify(scenes) + ";\n", "utf8");
console.log("---", scenes.length, "scenes,", Math.round(fs.statSync(OUT).size / 1024), "KB");
