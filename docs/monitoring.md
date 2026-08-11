# Monitoring setup (manual)

## Health endpoint

`GET https://app4.letovrf.ru/api/health` returns `{"ok":true,"uptime":...}`.

## UptimeRobot (free)

1. Sign up at https://uptimerobot.com
2. Add monitor → HTTP(s)
3. URL: `https://app4.letovrf.ru/api/health`
4. Interval: 5 minutes
5. Alert contacts: email or Telegram integration

## Yandex.Webmaster & Google Search Console

1. **Yandex.Webmaster**: https://webmaster.yandex.ru → add `app4.letovrf.ru` → verify via DNS or HTML file → submit `https://app4.letovrf.ru/sitemap.xml`
2. **Google Search Console**: https://search.google.com/search-console → add property → verify → submit sitemap

## Yandex.Metrika

Replace `00000000` in `index.html` with your counter ID from https://metrika.yandex.ru

Goals to configure:
- `copy_short_link` — short link copied
- `add_to_calendar` — .ics downloaded
