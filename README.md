# myCount Fork

Форк ныне неработающего [myCount.org](https://mycount.org) — онлайн-счётчик времени до (или с) заданной даты.

**Продакшен:** https://app4.letovrf.ru/ru/

## Запуск

```bash
npm install
npm run dev          # http://localhost:5173/ru/
npm run build        # dist/ + SEO-страницы + sitemap
npm run preview      # предпросмотр production-сборки
npm test             # vitest
npm run server       # API, OG-карточки, короткие ссылки (порт 5199)
npm run deploy       # сборка + rsync на app4.letovrf.ru
```

- Русский: `/ru/`
- English: `/en/`
- SEO-лендинги: `/do/<slug>/` (ru), `/until/<slug>/` (en) — ~21 страниц, sitemap в `dist/sitemap.xml`
- Режимы в URL: `wm=1` события, `wm=3` редактор, `wm=4` embed (только счётчик)
- Параметры: `t`, `tz`, `fid`, `t1`/`t2` (base64), `event`/`eid`, `lt=1` + локальная дата, `th=` тема фона

## Возможности

- **Ближайшие события** — каталог с API (`/api/events/RU`), праздники Nager, посадочные события, milestones
- **Редактор** — дата/время, TZ, пресеты, таблица «круглых» вех, поиск по числу, `< 0 >` для листания вех
- **Embed** — ссылка `wm=4`: свой заголовок (`t1`) + строка с датой отсчёта
- **Короткие ссылки** — `POST /api/short` → `/s/:id`, живые OG-карточки с «осталось N дней»
- **Экспорт** — `.ics`, QR-кода короткой ссылки
- **Мои счётчики** — localStorage
- **Темы фона** счётчика (`th=`), прогресс-бар до события
- **PWA** — `manifest.webmanifest`, service worker (network-first для HTML)
- **Тёмная тема**, мобильная вёрстка, Яндекс.Метрика (placeholder в `index.html`)

## Сервер (`server/`)

Node на `:5199` (nginx проксирует `/api/`, `/og/`, `/s/`):

| Endpoint | Описание |
|----------|----------|
| `GET /api/events/:cc` | Каталог событий |
| `GET /api/landing/:idOrSlug` | Событие посадочной страницы |
| `GET /api/health` | Healthcheck |
| `POST /api/short` | Короткая ссылка |
| `GET /og/card.png?…` | OG-изображение |
| `GET /s/:id` | Редирект + OG |

Бэкап `short-links.json` — systemd timer (`server/mycount-backup.*`). Мониторинг: [docs/monitoring.md](docs/monitoring.md).

## Структура

```
src/                 — Vite + TypeScript (SPA)
  lib/               — даты, URL, события, PWA-утилиты
  i18n/              — ru/en
server/              — API, OG, landing-pages, events-catalog
scripts/             — deploy, build-seo-pages
public/              — статика, cimg, sw.js, иконки
legacy/              — замороженная v0.3 (не трогать)
```

## Legacy

```bash
npm run dev:legacy   # http://localhost:8081/ru/
```

## CI

GitHub Actions: тесты и сборка на push (`.github/workflows/ci.yml`).

## Лицензия

**Некоммерческая** с исключением для правообладателя — см. [LICENSE](LICENSE).

- Можно использовать, форкать и дорабатывать **бесплатно и некоммерчески**
- **Коммерческое использование** — только у автора (Alexey / [immensaccessum](https://github.com/immensaccessum))

Оригинальный бренд myCount.org принадлежал Internet Invest, Ltd.
