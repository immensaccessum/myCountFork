export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Anti open-redirect: only same-host absolute URLs or relative paths are allowed
 * as redirect targets. Returns a safe absolute URL or null.
 */
export function safeRedirectTarget(to, origin) {
  const value = String(to || '');
  if (value.startsWith('/') && !value.startsWith('//')) return `${origin}${value}`;
  try {
    const url = new URL(value);
    const own = new URL(origin);
    if (url.host === own.host && (url.protocol === 'https:' || url.protocol === 'http:')) {
      return url.href;
    }
  } catch {
    /* fallthrough */
  }
  return null;
}

export function requestOrigin(req) {
  const host = req.headers.host || 'localhost';
  const forwarded = req.headers['x-forwarded-proto'];
  const proto =
    forwarded?.split(',')[0]?.trim() ||
    (host.includes('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export function buildOgHtml({
  title,
  description,
  pageUrl,
  redirectUrl,
  imageUrl,
  imageWidth = 1200,
  imageHeight = 630,
  siteName,
}) {
  const img = imageUrl
    ? `<meta property="og:image" content="${esc(imageUrl)}">
  <meta property="og:image:width" content="${imageWidth}">
  <meta property="og:image:height" content="${imageHeight}">
  <meta property="og:image:type" content="image/png">`
    : '';
  const site = siteName ? `<meta property="og:site_name" content="${esc(siteName)}">` : '';
  const canonical = pageUrl || redirectUrl;
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${esc(title)}</title>
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonical)}">
  ${site}
  ${img}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  ${imageUrl ? `<meta name="twitter:image" content="${esc(imageUrl)}">` : ''}
  <link rel="canonical" href="${esc(canonical)}">
</head>
<body>
  <p><a href="${esc(redirectUrl)}">${esc(title)}</a></p>
  <script>location.replace(${JSON.stringify(redirectUrl)});</script>
</body>
</html>`;
}
