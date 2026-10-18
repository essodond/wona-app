import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the public Wona landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="fr">/i);
  assert.match(html, /<title>Wona · Livrer en confiance<\/title>/i);
  assert.match(html, /Vos colis/i);
  assert.match(html, /APK Android/i);
  assert.match(html, /Google Play/i);
  assert.match(html, /App Store/i);
  assert.match(html, /og:title" content="Wona · Livrer en confiance"/i);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/i);
});

test("keeps the secured administration portal on its own route", async () => {
  const response = await render("/admin");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Ouverture du centre de contrôle/i);
  assert.match(html, /pathname\":\"\/admin/i);
});

test("publishes defensive browser headers", async () => {
  const config = await import("../next.config.mjs");
  const entries = await config.default.headers();
  const headers = entries[0].headers;
  const values = Object.fromEntries(headers.map((item) => [item.key, item.value]));

  assert.equal(values["X-Frame-Options"], "DENY");
  assert.equal(values["X-Content-Type-Options"], "nosniff");
  assert.match(values["Content-Security-Policy"], /frame-ancestors 'none'/);
});
