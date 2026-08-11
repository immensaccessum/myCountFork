# myCount.org Fork

Форк ныне неработающего [myCount.org](https://mycount.org) — счётчика времени до заданной даты.

## Запуск (новая версия — Vite + TypeScript)

```bash
npm install
npm run dev          # http://localhost:5173/ru/
npm run build        # сборка в dist/
npm run preview      # предпросмотр production-сборки
npm test             # vitest
```

- Русский: http://localhost:5173/ru/
- English: http://localhost:5173/en/
- События: `?wm=1`
- Редактор: `?wm=3`
- Embed (только счётчик): `?wm=4&t=…&tz=…&fid=…`

## Legacy (оригинальная v0.3, архив)

Полная копия старой версии сохранена в `legacy/` и не изменяется:

```bash
npm run dev:legacy   # http://localhost:8081/ru/
```

## Возможности (v1.0)

- **Ближайшие события** — пресеты (Спутник, Луна, Новый год, круглые секунды…)
- **Режим embed** — ссылка без формы ввода
- **Копировать ссылку** — кнопка в настройках
- **Быстрые даты** — сейчас, +1 час, завтра, Новый год, 100M сек
- **Тёмная тема** — кнопка в шапке, запоминается в localStorage
- **Мобильная вёрстка** — адаптивная сетка
- **Совместимость URL** — формат `?wm=4&t=…&tz=…` сохранён

## Структура

```
src/                 — Vite + TypeScript приложение
  lib/               — движок дат, URL, canvas-счётчик
  i18n/              — ru/en строки
  styles/            — CSS с переменными темы
legacy/              — замороженная копия v0.3 (HTML + engine/)
public/cimg/         — спрайты цифр и иконки
```

## Лицензия

**Некоммерческая** с исключением для правообладателя — см. [LICENSE](LICENSE).

- Можно использовать, форкать и дорабатывать **бесплатно и некоммерчески**
- **Коммерческое использование** (продажа, платный доступ, реклама как основной продукт и т.п.) — только у автора (Alexey / [immensaccessum](https://github.com/immensaccessum))

Оригинальный бренд myCount.org принадлежал Internet Invest, Ltd.

## Деплой

```bash
npm run deploy   # сборка + rsync на app4.letovrf.ru
```
