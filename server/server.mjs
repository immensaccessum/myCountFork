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

const PORT = Number(process.argv[2]) || 5199;

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildOgHtml({ title, description, redirectUrl, imageUrl, siteName }) {
  const img = imageUrl ? `<meta property="og:image" content="${esc(imageUrl)}">` : '';
  const site = siteName ? `<meta property="og:site_name" content="${esc(siteName)}">` : '';
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>${esc(title)}</title>
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(redirectUrl)}">
  ${site}
  ${img}
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta http-equiv="refresh" content="0;url=${esc(redirectUrl)}">
  <link rel="canonical" href="${esc(redirectUrl)}">
</head>
<body><p><a href="${esc(redirectUrl)}">${esc(title)}</a></p></body>
</html>`;
}

function parseOgQuery(search) {
  if (!search || search.length < 2) return null;
  const params = new URLSearchParams(search);
  const to = params.get('to');
  const title = params.get('title');
  if (!to || !title) return null;
  return { to, title, desc: params.get('desc') || title };
}

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
  const origin = `http://${req.headers.host}`;
  const html = buildOgHtml({
    title,
    description: desc,
    redirectUrl: to,
    imageUrl: `${origin}/cimg/001/i/logo.png`,
    siteName: 'myCount',
  });
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
  return true;
}

const server = http.createServer((req, res) => {
  if (handleOg(req, res)) return;

  handleApiRequest(req, res, () => {
    res.writeHead(404);
    res.end('Not found');
  });
});

server.listen(PORT, () => {
  console.log(`myCount server http://localhost:${PORT}`);
  console.log(`  OG:  /og/ru/?to=...&title=...`);
  console.log(`  API: /api/events/RU, /api/nager/countries`);
});
