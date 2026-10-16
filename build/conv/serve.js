// 本地静态服务器：只为「用官方导出器做真转换」这一步服务，不参与最终产物
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const ROOT = __dirname;
const EXCAL = path.join(ROOT, "node_modules/@excalidraw/excalidraw/dist/prod");
const GALLERY = "/home/mallorine/下载/Sublantis-Wiki/assets/gallery";
const PORT = 8752;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
};

let done = 0;
const server = http.createServer((req, res) => {
  const u = url.parse(req.url);
  if (req.method === "POST" && u.pathname === "/save") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const { name, svg } = JSON.parse(body);
      fs.writeFileSync(path.join(GALLERY, name + ".svg"), svg, "utf8");
      done++;
      console.log("saved", name, Math.round(svg.length / 1024) + "KB");
      if (done >= REPORT) fs.writeFileSync("/tmp/conv-done", String(done));
      res.end("ok");
    });
    return;
  }
  if (req.method === "POST" && u.pathname === "/log") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      console.log("[page]", body);
      res.end("ok");
    });
    return;
  }
  let p = decodeURIComponent(u.pathname);
  let file = p.startsWith("/dist/prod/") ? path.join(EXCAL, p.slice("/dist/prod/".length)) : path.join(ROOT, p);
  if (p === "/") file = path.join(ROOT, "convert.html");
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404);
      res.end("404 " + p);
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(buf);
  });
});

const REPORT = Number(process.argv[2] || 24);
server.listen(PORT, "127.0.0.1", () => console.log("http://127.0.0.1:" + PORT + "/"));
