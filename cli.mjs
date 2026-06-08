#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const OUT_DIR = resolve(__dirname, "out");
const portFlag = process.argv.indexOf("--port");
const preferredPort = portFlag !== -1
  ? Number(process.argv[portFlag + 1])
  : process.env.PORT
    ? Number(process.env.PORT)
    : 3000;

function findAvailablePort(startPort) {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(startPort, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on("error", () => resolve(findAvailablePort(startPort + 1)));
  });
}

const PORT = await findAvailablePort(preferredPort);

const MIME = {
  ".html": "text/html",
  ".js":   "application/javascript",
  ".css":  "text/css",
  ".png":  "image/png",
  ".svg":  "image/svg+xml",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".glsl": "text/plain",
};

createServer((req, res) => {
  let url = req.url ?? "/";
  // strip query strings
  url = url.split("?")[0];
  // Next.js static export uses trailing slashes → serve index.html
  if (url.endsWith("/")) url += "index.html";

  const filePath = resolve(OUT_DIR, url.replace(/^\//, ""));

  // path traversal guard
  if (!filePath.startsWith(OUT_DIR)) {
    res.writeHead(403); res.end(); return;
  }

  try {
    const data = readFileSync(filePath);
    res.writeHead(200, { "Content-Type": MIME[extname(filePath)] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    // fallback to index.html for SPA-style routing
    try {
      const data = readFileSync(resolve(OUT_DIR, "index.html"));
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(data);
    } catch {
      res.writeHead(404); res.end("Not found");
    }
  }
}).listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Serving on ${url}`);
  // open browser without any dependency
  const { platform } = process;
  const cmd = platform === "win32" ? "start" : platform === "darwin" ? "open" : "xdg-open";
  import("node:child_process").then(({ exec }) => exec(`${cmd} ${url}`));
});
