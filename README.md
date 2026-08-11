# myCount

Неофициальный преемник [myCount.org](https://mycount.org) — онлайн-счётчик времени до (или с) заданной даты.

Это **не** официальный сайт Internet Invest. Технически репозиторий — git-fork архива [elite-nick/myCount_fork](https://github.com/elite-nick/myCount_fork), но приложение **переписано** (Vite + TypeScript, Node API). Архив v0.3 в `legacy/` (MIT).

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
- SEO-лендинги: `/do/<slug>/` (ru), `/until/<slug>/` (en)
- Режимы: `wm=1` события, `wm=3` редактор, `wm=4` embed
- Параметры: `t`, `tz`, `fid`, `t1`/`t2`, `event`/`eid`, `lt=1`, `th=`

## Возможности

- Каталог **ближайших событий** (`/api/events/RU`), праздники, посадочные страницы
- Редактор, embed-ссылки, короткие `/s/:id`, живые OG-карточки
- `.ics`, QR, «мои счётчики», темы фона, PWA, тёмная тема

Подробнее — [docs/monitoring.md](docs/monitoring.md) (деплой, healthcheck, бэкап).

## Структура

```
src/                 — Vite + TypeScript (SPA)     [LICENSE]
server/              — API, OG, каталог событий    [LICENSE]
legacy/              — архив HTML v0.3             [MIT]
public/              — статика, cimg, PWA
```

## Legacy

```bash
npm run dev:legacy   # http://localhost:8081/ru/
```

## Происхождение и лицензии

| Что | Лицензия |
|-----|----------|
| Новый код (`src/`, `server/`, …) | [LICENSE](LICENSE) — некоммерческая, коммерция только у автора |
| `legacy/` | [MIT](legacy/LICENSE) |
| Ассеты, бренд, цепочка форков | [NOTICE](NOTICE) |

- Оригинальный **myCount.org** — Internet Invest, Ltd. (сайт не работает).
- Промежуточный архив — MIT-форк на GitHub.
- **Этот проект** — переписанная версия; не претендует на официальный бренд.

## CI

GitHub Actions: `.github/workflows/ci.yml`

## Контакты

Alexey — [immensaccessum](https://github.com/immensaccessum)
