#!/usr/bin/env node
/**
 * Open Graph preview server for Telegram etc.
 * Usage: node server/og.mjs [port]
 * nginx: location /og/ { proxy_pass http://127.0.0.1:5199; }
 */
import http from 'node:http';

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

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const m = url.pathname.match(/^\/og\/(ru|en)\/?$/);
  if (!m) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const to = url.searchParams.get('to');
  const title = url.searchParams.get('title');
  if (!to || !title) {
    res.writeHead(400);
    res.end('Missing to or title');
    return;
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
});

server.listen(PORT, () => {
  console.log(`OG preview server http://localhost:${PORT}/og/ru/?to=...&title=...`);
});
