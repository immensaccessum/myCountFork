# myCount.org Fork

Форк ныне неработающего [myCount.org](https://mycount.org) — счётчика времени до заданной даты.

## Запуск

```bash
npm start        # сборка + сервер на :3000
npm run build    # только пересобрать HTML из шаблона
npm run dev      # сервер без сборки
```

- Русский: http://localhost:3000/ru/
- English: http://localhost:3000/en/
- События: `?wm=1`
- Редактор: `?wm=3`
- Embed (только счётчик): `?wm=4&t=…&tz=…&fid=…`

## Возможности (v0.3)

- **Ближайшие события** — пресеты (Спутник, Луна, Новый год, круглые секунды…)
- **Режим embed** — ссылка без формы ввода
- **Копировать ссылку** — кнопка в настройках
- **Быстрые даты** — сейчас, +1 час, завтра, Новый год, 100M сек
- **Тёмная тема** — кнопка ◐, запоминается в localStorage
- **Мобильная вёрстка** — адаптив до 480px
- **Один шаблон** — `src/template.html` + `src/i18n/*.json` → `npm run build`
- **Один движок** — `engine/` (старые 024/030 удалены)

## Структура

```
src/template.html    — единый HTML-шаблон
src/i18n/ru.json     — строки RU
src/i18n/en.json     — строки EN
scripts/build.mjs    — сборка страниц
engine/              — JS/CSS движка счётчика
engine/script/app.js — тема, пресеты, режимы (современный JS)
```

## Реклама

В шаблоне есть placeholder `.mc_ad_slot` — подключите AdSense или другую сеть в `src/template.html`, затем `npm run build`.

## Лицензия

**MIT** — см. [LICENSE](LICENSE). Можно форкать, публиковать, монетизировать рекламой.

Исключение: `engine/script/excanvas.compiled.js` — Apache 2.0 (Google).

Оригинальный бренд myCount.org принадлежал Internet Invest, Ltd. Для коммерческого использования их торговой марки — отдельное разрешение.

## Дальше (план)

- GitHub Pages / ваш сервер
- PWA (manifest + service worker)
