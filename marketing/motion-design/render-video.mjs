import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("C:\\Users\\DELL\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outputDirectory = path.join(root, "marketing", "motion-design");
const edgeExecutable = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".ttf": "font/ttf",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
};

function createServer() {
  return http.createServer((request, response) => {
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
      response.writeHead(200, {
        "Content-Type": contentTypes[path.extname(resolvedPath).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      response.end(data);
    });
  });
}

function readVint(buffer, offset) {
  let marker = 0x80;
  let length = 1;
  while (length <= 8 && (buffer[offset] & marker) === 0) {
    marker >>= 1;
    length += 1;
  }
  if (length > 8) throw new Error("Taille EBML invalide.");
  let value = buffer[offset] & (marker - 1);
  for (let index = 1; index < length; index++) value = value * 256 + buffer[offset + index];
  return { length, value };
}

function writeVint(value, length) {
  const encoded = Buffer.alloc(length);
  let remaining = value;
  for (let index = length - 1; index >= 0; index--) {
    encoded[index] = remaining & 0xff;
    remaining = Math.floor(remaining / 256);
  }
  encoded[0] |= 1 << (8 - length);
  return encoded;
}

function addWebmDurationMetadata(filePath, durationSeconds) {
  const source = fs.readFileSync(filePath);
  const infoId = Buffer.from([0x15, 0x49, 0xa9, 0x66]);
  const infoOffset = source.indexOf(infoId);
  if (infoOffset < 0) throw new Error("Bloc Info WebM introuvable.");
  const sizeOffset = infoOffset + infoId.length;
  const infoSize = readVint(source, sizeOffset);
  const infoStart = sizeOffset + infoSize.length;
  const infoEnd = infoStart + infoSize.value;
  const durationElement = Buffer.alloc(11);
  durationElement.set([0x44, 0x89, 0x88], 0);
  durationElement.writeDoubleBE(durationSeconds * 1000, 3);
  const updatedSize = infoSize.value + durationElement.length;
  if (updatedSize >= 2 ** (7 * infoSize.length) - 1) {
    throw new Error("Le bloc Info WebM est trop grand pour conserver sa taille EBML.");
  }
  writeVint(updatedSize, infoSize.length).copy(source, sizeOffset);
  const output = Buffer.concat([source.subarray(0, infoEnd), durationElement, source.subarray(infoEnd)]);
  fs.writeFileSync(filePath, output);
}

const server = createServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

let browser;
try {
  browser = await chromium.launch({
    executablePath: edgeExecutable,
    headless: true,
    args: [
      "--autoplay-policy=no-user-gesture-required",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
    ],
  });
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") process.stderr.write(`[browser] ${message.text()}\n`);
  });

  await page.goto(`${baseUrl}/marketing/motion-design/index.html`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.assetsReady || window.assetError, null, { timeout: 30_000 });
  const assetError = await page.evaluate(() => window.assetError || null);
  if (assetError) throw new Error(assetError);

  await page.evaluate(() => window.seekFrame(14.1));
  await page.locator("canvas").screenshot({ path: path.join(outputDirectory, "wona-motion-design-cover.png") });

  process.stdout.write("Rendu de 15 secondes en cours...\n");
  const downloadPromise = page.waitForEvent("download", { timeout: 45_000 });
  const metadata = await page.evaluate(() => window.startRender());
  const download = await downloadPromise;
  const outputPath = path.join(outputDirectory, `wona-motion-design.${metadata.extension}`);
  await download.saveAs(outputPath);
  if (metadata.extension === "webm") addWebmDurationMetadata(outputPath, metadata.duration);

  const probe = await page.evaluate(
    async ({ source, expectedDuration }) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = source;
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = () => reject(new Error("Le navigateur n'a pas pu relire la vidéo exportée."));
      });
      return {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        durationIsValid: Number.isFinite(video.duration) && video.duration >= expectedDuration - 0.8,
      };
    },
    {
      source: `${baseUrl}/marketing/motion-design/wona-motion-design.${metadata.extension}?v=${Date.now()}`,
      expectedDuration: metadata.duration,
    },
  );

  if (!probe.durationIsValid || probe.width !== 1080 || probe.height !== 1920) {
    throw new Error(`Validation vidéo échouée: ${JSON.stringify(probe)}`);
  }
  const stat = fs.statSync(outputPath);
  process.stdout.write(
    `${JSON.stringify({ outputPath, coverPath: path.join(outputDirectory, "wona-motion-design-cover.png"), ...metadata, savedBytes: stat.size, probe }, null, 2)}\n`,
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
