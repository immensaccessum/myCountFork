#!/usr/bin/env node
/**
 * Sidecar server: Open Graph previews + Nager.Date API cache.
 * Usage: node server/server.mjs [port]
 * nginx:
 *   location /og/ { proxy_pass http://127.0.0.1:5199; }
 *   location /api/nager/ { proxy_pass http://127.0.0.1:5199; }
 */
import http from 'node:http';
import { handleApiRequest } from './handlers.mjs';
import { buildOgHtml, requestOrigin, safeRedirectTarget } from './og-html.mjs';
import { handleShortRoutes } from './short-links.mjs';

const PORT = Number(process.argv[2]) || 5199;

function handleOg(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const m = url.pathname.match(/^\/og\/(ru|en)\/?$/);
  if (!m) return false;

  const to = url.searchParams.get('to');
  const title = url.searchParams.get('title');
  if (!to || !title) {
    res.writeHead(400);
    res.end('Missing to or title');
    return true;
  }
  const desc = url.searchParams.get('desc') || title;
  const origin = requestOrigin(req);
  const redirectUrl = safeRedirectTarget(to, origin);
  if (!redirectUrl) {
    res.writeHead(400);
    res.end('Invalid redirect target');
    return true;
  }
  const pageUrl = `${origin}${url.pathname}${url.search}`;
  const html = buildOgHtml({
    title,
    description: desc,
    pageUrl,
    redirectUrl,
    imageUrl: `${origin}/og-card.png`,
    imageWidth: 1200,
    imageHeight: 630,
    siteName: 'myCount',
  });
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
  return true;
}

const server = http.createServer((req, res) => {
  if (handleOg(req, res)) return;

  void handleShortRoutes(req, res).then((handled) => {
    if (handled) return;
    handleApiRequest(req, res, () => {
      res.writeHead(404);
      res.end('Not found');
    });
  });
});

// Slowloris / stuck-connection protection.
server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;

server.listen(PORT, () => {
  console.log(`myCount server http://localhost:${PORT}`);
  console.log(`  OG:    /og/ru/?to=...&title=...`);
  console.log(`  Short: POST /api/short, GET /s/:id`);
  console.log(`  API:   /api/events/RU, /api/nager/countries`);
});
