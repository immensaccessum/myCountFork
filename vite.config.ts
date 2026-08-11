import { defineConfig } from 'vitest/config';
import { buildOgHtml } from './src/lib/og-html';
import { parseOgQuery } from './src/lib/url-state';
import { handleApiRequest } from './server/handlers.mjs';
import { handleShortRoutes } from './server/short-links.mjs';

function ogMiddleware(
  req: { url?: string; headers: { host?: string } },
  res: {
    statusCode: number;
    setHeader: (k: string, v: string) => void;
    end: (b: string) => void;
  },
  next: () => void,
): void {
  const url = req.url || '';
  const path = url.split('?')[0];
  const m = path.match(/^\/og\/(ru|en)\/?$/);
  if (!m) {
    next();
    return;
  }
  const q = url.includes('?') ? url.slice(url.indexOf('?')) : '';
  const parsed = parseOgQuery(q);
  if (!parsed) {
    res.statusCode = 400;
    res.end('Missing to or title');
    return;
  }
  const host = req.headers.host || 'localhost:5173';
  const forwarded = (req.headers as Record<string, string | undefined>)['x-forwarded-proto'];
  const proto =
    forwarded?.split(',')[0]?.trim() ||
    (host.includes('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
  const html = buildOgHtml({
    title: parsed.title,
    description: parsed.desc,
    pageUrl: `${proto}://${host}${path}${q}`,
    redirectUrl: parsed.to,
    imageUrl: `${proto}://${host}/og-card.png`,
    imageWidth: 1200,
    imageHeight: 630,
    siteName: 'myCount',
  });
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
}

function apiMiddleware(
  req: { url?: string },
  res: {
    statusCode: number;
    setHeader: (k: string, v: string) => void;
    end: (b: string) => void;
  },
  next: () => void,
): void {
  void handleApiRequest(req, res, next);
}

function shortMiddleware(req: unknown, res: unknown, next: () => void): void {
  void (handleShortRoutes as (req: unknown, res: unknown) => Promise<boolean>)(req, res).then(
    (handled) => {
      if (!handled) next();
    },
  );
}

export default defineConfig({
  publicDir: 'public',
  server: {
    port: 5173,
  },
  build: { outDir: 'dist' },
  test: {
    environment: 'node',
  },
  plugins: [
    {
      name: 'og-preview',
      configureServer(server) {
        server.middlewares.use((req, res, next) => ogMiddleware(req, res, next));
        server.middlewares.use((req, res, next) => shortMiddleware(req, res, next));
        server.middlewares.use((req, res, next) => apiMiddleware(req, res, next));
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => ogMiddleware(req, res, next));
        server.middlewares.use((req, res, next) => shortMiddleware(req, res, next));
        server.middlewares.use((req, res, next) => apiMiddleware(req, res, next));
      },
    },
    {
      name: 'lang-routes',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const url = req.url || '';
          if (/^\/(ru|en)\/?(\?.*)?$/.test(url.split('#')[0])) {
            const q = url.includes('?') ? url.slice(url.indexOf('?')) : '';
            req.url = '/index.html' + q;
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, _res, next) => {
          const url = req.url || '';
          if (/^\/(ru|en)\/?(\?.*)?$/.test(url.split('#')[0])) {
            const q = url.includes('?') ? url.slice(url.indexOf('?')) : '';
            req.url = '/index.html' + q;
          }
          next();
        });
      },
    },
  ],
});
