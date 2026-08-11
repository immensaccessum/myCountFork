/** Fixed-window per-IP rate limiter (in-memory, for the single-process sidecar). */

const WINDOW_MS = 60 * 1000;
const CLEANUP_EVERY = 5 * 60 * 1000;

/** @type {Map<string, { windowStart: number, count: number }>} */
const buckets = new Map();
let lastCleanup = Date.now();

export function clientIp(req) {
  const real = req.headers['x-real-ip'];
  if (typeof real === 'string' && real) return real;
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

/** Returns true when the request is allowed. */
export function allowRequest(key, limitPerMinute) {
  const now = Date.now();

  if (now - lastCleanup > CLEANUP_EVERY) {
    for (const [k, b] of buckets) {
      if (now - b.windowStart > WINDOW_MS) buckets.delete(k);
    }
    lastCleanup = now;
  }

  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { windowStart: now, count: 1 });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limitPerMinute;
}

export function sendTooMany(res) {
  res.statusCode = 429;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Retry-After', '60');
  res.end(JSON.stringify({ error: 'too many requests' }));
}
