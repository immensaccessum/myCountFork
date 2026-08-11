function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export interface OgPageOptions {
  title: string;
  description: string;
  redirectUrl: string;
  imageUrl?: string;
  siteName?: string;
}

export function buildOgHtml(opts: OgPageOptions): string {
  const img = opts.imageUrl ? `<meta property="og:image" content="${esc(opts.imageUrl)}">` : '';
  const site = opts.siteName
    ? `<meta property="og:site_name" content="${esc(opts.siteName)}">`
    : '';
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(opts.title)}</title>
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(opts.title)}">
  <meta property="og:description" content="${esc(opts.description)}">
  <meta property="og:url" content="${esc(opts.redirectUrl)}">
  ${site}
  ${img}
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${esc(opts.title)}">
  <meta name="twitter:description" content="${esc(opts.description)}">
  <meta http-equiv="refresh" content="0;url=${esc(opts.redirectUrl)}">
  <link rel="canonical" href="${esc(opts.redirectUrl)}">
</head>
<body>
  <p><a href="${esc(opts.redirectUrl)}">${esc(opts.title)}</a></p>
  <script>location.replace(${JSON.stringify(opts.redirectUrl)});</script>
</body>
</html>`;
}
