const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const pastes = {};

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

const server = http.createServer((req, res) => {

  // ---------- CORS ----------
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // ---------- HEALTH CHECK ----------
  if (req.method === "GET" && pathname === "/api/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // ---------- SERVE index.html (MUST BE BEFORE OTHERS) ----------
  if (req.method === "GET" && pathname === "/") {
    const filePath = path.join(__dirname, "index.html");

    fs.readFile(filePath, "utf8", (err, html) => {
      if (err) {
        res.writeHead(500);
        res.end("Error loading index.html");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
    });
    return;
  }

  // ---------- CREATE PASTE ----------
  if (req.method === "POST" && pathname === "/paste") {
    let body = "";

    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        res.writeHead(400);
        res.end("Invalid JSON");
        return;
      }

      if (!data.content || data.content.trim() === "") {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Content is required" }));
        return;
      }

      const id = generateId();
      pastes[id] = {
  content: data.content,
  createdAt: Date.now(),
  expiresAt: data.ttl ? Date.now() + data.ttl * 1000 : null,
  views: 0,
  maxViews: data.maxViews || null
};

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        id,
        url: `/p/${id}`
      }));
    });
    return;
  }

 if (req.method === "GET" && pathname.startsWith("/paste/")) {
  const id = pathname.split("/")[2];
  const paste = pastes[id];

  if (!paste) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const now = Date.now();

  // ⏱ TTL CHECK
  if (paste.expiresAt && now > paste.expiresAt) {
    delete pastes[id];
    res.writeHead(404);
    res.end("Paste expired");
    return;
  }

  // 👁 MAX VIEW CHECK
  if (paste.maxViews && paste.views >= paste.maxViews) {
    delete pastes[id];
    res.writeHead(404);
    res.end("View limit exceeded");
    return;
  }

  // ✅ SAFE VIEW COUNTING
  if (!paste.lastViewedAt || now - paste.lastViewedAt > 500) {
    paste.views++;
    paste.lastViewedAt = now;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ content: paste.content }));
  return;
}


  // ---------- SERVE VIEW PAGE ----------
  if (req.method === "GET" && pathname.startsWith("/p/")) {
    const filePath = path.join(__dirname, "view.html");

    fs.readFile(filePath, "utf8", (err, html) => {
      if (err) {
        res.writeHead(500);
        res.end("Error loading page");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
    });
    return;
  }

  // ---------- SERVE STATIC FILES (CSS, JS) ----------
if (req.method === "GET") {
  const ext = path.extname(pathname);

  if (ext === ".css" || ext === ".js") {
    const filePath = path.join(__dirname, pathname);

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const contentType =
        ext === ".css" ? "text/css" : "application/javascript";

      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    });
    return;
  }
}


  // ---------- DEFAULT ----------
  res.writeHead(404);
  res.end("Not found");
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
