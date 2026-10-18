import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("C:\\Users\\DELL\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outputDirectory = path.join(root, "marketing", "motion-design", "qa");
fs.mkdirSync(outputDirectory, { recursive: true });

const server = http.createServer((request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
  const relativePath = requestPath === "/" ? "marketing/motion-design/index.html" : requestPath.slice(1);
  const resolvedPath = path.resolve(root, relativePath);
  if (!resolvedPath.startsWith(root)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  fs.readFile(resolvedPath, (error, data) => {
    if (error) {
      response.writeHead(404).end("Not found");
      return;
    }
    const extension = path.extname(resolvedPath).toLowerCase();
    const type = extension === ".html" ? "text/html" : extension === ".jpg" ? "image/jpeg" : extension === ".ttf" ? "font/ttf" : "application/octet-stream";
    response.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
    response.end(data);
  });
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  headless: true,
});

try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/marketing/motion-design/index.html`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.assetsReady || window.assetError);
  const frames = [0.9, 3.9, 6.9, 9.9, 13.8];
  for (const time of frames) {
    await page.evaluate((value) => window.seekFrame(value), time);
    await page.locator("canvas").screenshot({ path: path.join(outputDirectory, `frame-${String(time).replace(".", "-")}.png`) });
  }
  process.stdout.write(`${outputDirectory}\n`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
