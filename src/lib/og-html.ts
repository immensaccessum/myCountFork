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
  pageUrl?: string;
  redirectUrl: string;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  siteName?: string;
}

export function buildOgHtml(opts: OgPageOptions): string {
  const img = opts.imageUrl
    ? `<meta property="og:image" content="${esc(opts.imageUrl)}">
  <meta property="og:image:width" content="${opts.imageWidth ?? 1200}">
  <meta property="og:image:height" content="${opts.imageHeight ?? 630}">
  <meta property="og:image:type" content="image/png">`
    : '';
  const site = opts.siteName
    ? `<meta property="og:site_name" content="${esc(opts.siteName)}">`
    : '';
  const canonical = opts.pageUrl || opts.redirectUrl;
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(opts.title)}</title>
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(opts.title)}">
  <meta property="og:description" content="${esc(opts.description)}">
  <meta property="og:url" content="${esc(canonical)}">
  ${site}
  ${img}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(opts.title)}">
  <meta name="twitter:description" content="${esc(opts.description)}">
  ${opts.imageUrl ? `<meta name="twitter:image" content="${esc(opts.imageUrl)}">` : ''}
  <link rel="canonical" href="${esc(canonical)}">
</head>
<body>
  <p><a href="${esc(opts.redirectUrl)}">${esc(opts.title)}</a></p>
  <script>location.replace(${JSON.stringify(opts.redirectUrl)});</script>
</body>
</html>`;
}
