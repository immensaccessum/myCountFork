import './styles/main.css';
import { daysBetween, monthsApprox, parseYmd, ymdLocal } from './lib/days-between';

function detectLang(): 'ru' | 'en' {
  return /\/until\//.test(location.pathname) ? 'en' : 'ru';
}

const TX = {
  ru: {
    title: 'Калькулятор дней между датами',
    from: 'С даты:',
    to: 'По дату:',
    resultDays: 'Между датами:',
    days: 'дней',
    weeks: 'недель',
    monthsApprox: '≈ месяцев',
    and: 'и',
    openCounter: 'Открыть счётчик до второй даты',
    home: 'На главную',
    hint: 'Рабочие дни не считаются — только календарные. Обе даты включительно не суммируются: разница — полные сутки между полуночами.',
  },
  en: {
    title: 'Days between dates calculator',
    from: 'From:',
    to: 'To:',
    resultDays: 'Between the dates:',
    days: 'days',
    weeks: 'weeks',
    monthsApprox: '≈ months',
    and: 'and',
    openCounter: 'Open a countdown to the second date',
    home: 'Home',
    hint: 'Business days are not counted — calendar days only. The difference is full midnights between the two dates.',
  },
} as const;

function fmtNum(n: number, lang: 'ru' | 'en'): string {
  return Math.abs(n).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US');
}

function main(): void {
  const lang = detectLang();
  const tx = TX[lang];
  document.documentElement.lang = lang;
  document.title = tx.title;

  const stored =
    localStorage.getItem('mc_theme') ||
    (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = stored;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const jan1 = new Date(today.getFullYear(), 0, 1);

  const root = document.getElementById('between-app');
  if (!root) return;

  const homeHref = lang === 'ru' ? '/ru/' : '/en/';

  root.innerHTML = `
    <div class="page">
      <header class="section-header">
        <a href="${homeHref}" class="logo-link">
          <img src="/cimg/001/i/logo.png" alt="myCount" width="180" height="48">
        </a>
        <nav class="nav">
          <a href="${homeHref}">${tx.home}</a>
        </nav>
      </header>
      <section class="card section-landing-intro">
        <h1>${tx.title}</h1>
        <p class="hint">${tx.hint}</p>
      </section>
      <section class="card">
        <div class="date-form" style="flex-direction:column;align-items:stretch;gap:1rem">
          <label class="settings-field">${tx.from}
            <input type="date" id="bd-from" class="wide" value="${ymdLocal(jan1)}">
          </label>
          <label class="settings-field">${tx.to}
            <input type="date" id="bd-to" class="wide" value="${ymdLocal(today)}">
          </label>
        </div>
        <div id="bd-result" class="share-preview" style="margin-top:1rem" hidden></div>
        <p style="margin-top:1rem">
          <a href="#" id="bd-open" class="popular-link" hidden>${tx.openCounter}</a>
        </p>
      </section>
    </div>
  `;

  const fromEl = root.querySelector<HTMLInputElement>('#bd-from')!;
  const toEl = root.querySelector<HTMLInputElement>('#bd-to')!;
  const resultEl = root.querySelector<HTMLElement>('#bd-result')!;
  const openEl = root.querySelector<HTMLAnchorElement>('#bd-open')!;

  const update = () => {
    const a = parseYmd(fromEl.value);
    const b = parseYmd(toEl.value);
    if (!a || !b) {
      resultEl.hidden = true;
      openEl.hidden = true;
      return;
    }
    const days = daysBetween(a, b);
    const abs = Math.abs(days);
    const weeks = Math.floor(abs / 7);
    const remDays = abs % 7;
    const months = Math.abs(monthsApprox(a, b));
    const sign = days < 0 ? '−' : '';
    resultEl.hidden = false;
    resultEl.innerHTML = `
      <strong>${tx.resultDays}</strong>
      ${sign}${fmtNum(abs, lang)} ${tx.days}
      ${weeks ? `· ${sign}${weeks} ${tx.weeks}${remDays ? ` ${tx.and} ${remDays} ${tx.days}` : ''}` : ''}
      ${months ? `· ${sign}${months} ${tx.monthsApprox}` : ''}
    `;
    const target = days >= 0 ? b : a;
    const t = target.getTime();
    openEl.href = `${homeHref}?wm=4&fid=4&t=${t}`;
    openEl.hidden = false;
  };

  fromEl.addEventListener('change', update);
  toEl.addEventListener('change', update);
  fromEl.addEventListener('input', update);
  toEl.addEventListener('input', update);
  update();
}

main();
