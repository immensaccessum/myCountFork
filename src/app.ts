import { CounterHelper } from './lib/counter-helper';
import { DigitCounter } from './lib/digit-counter';
import { McDate } from './lib/mc-date';
import {
  type CounterEvent,
  loadEventCatalog,
  findEventById,
  findEventIndex,
  eventAtIndex,
  defaultEventIndex,
} from './lib/events';

const EVENT_COUNTRY = 'RU';
import {
  buildAppShareUrl,
  buildOgShareUrl,
  detectLang,
  langBasePath,
  parseUrlState,
  MAX_SHARE_TEXT,
  type ShareMode,
  type ViewMode,
} from './lib/url-state';
import { formatLocalDateLabel, resolveLocalBornTime, type LocalDateSpec } from './lib/local-date';
import { numToStr, tn } from './lib/utils';
import type { LocaleStrings } from './i18n/types';
import {
  TZ_OFFSETS_MIN,
  browserTzOffsetMin,
  defaultTzPacked,
  formatUtcOffset,
  gmtToSeconds,
  inferTzMode,
  secondsToGmt,
  type TzMode,
} from './lib/tz';
import { getLocale } from './i18n';
import { fetchLandingEvent, fetchPopularLandings } from './lib/landing-pages';
import { type CounterTheme, parseTheme, THEME_BACKGROUNDS, themeToParam } from './lib/counter-theme';
import { buildIcsFile, downloadIcs, icsFilename, isAnnualFromSpec } from './lib/ics';
import { deleteSavedCounter, loadSavedCounters, saveCounter, type SavedCounter } from './lib/saved-counters';
import { eventProgressPct } from './lib/progress';

const DEFAULT_BORN = 1332104400000;

export class App {
  private tx: LocaleStrings;
  private lang: 'ru' | 'en';
  private root: HTMLElement;
  private helper!: CounterHelper;
  private counter!: DigitCounter;
  private wm: ViewMode = 3;
  private text1 = '';
  private text2 = '';
  private eventWid = 1;
  private eventCatalog: CounterEvent[] = [];
  private currentEventEid = '';
  private settingsOpen = false;
  private eventOffset = 0;
  private raf = 0;
  private tzMode: TzMode = 1;
  private tzPanelOpen = false;
  private shareMode: ShareMode = 'instant';
  private localDateActive = false;
  private localSpec: LocalDateSpec | null = null;
  private lastCm = 0;
  private topTextEdited = false;
  private popularLandings: { slug: string; label: string; href: string }[] = [];
  private counterTheme: CounterTheme = 'default';
  private savedCounters: SavedCounter[] = loadSavedCounters();
  private landingH1 = '';
  private landingIntro = '';

  constructor(root: HTMLElement) {
    this.root = root;
    this.lang = detectLang(location.pathname);
    this.tx = getLocale(this.lang);
    document.documentElement.lang = this.lang;
    if (!window.__MC_PRESET) {
      document.title = this.tx.title;
    }
    this.initTheme();
    this.render();
    this.initFromUrl();
    this.onResize();
    this.loop();
    window.addEventListener('resize', () => this.onResize());
  }

  private initTheme(): void {
    const stored = localStorage.getItem('mc_theme') || 'light';
    document.documentElement.dataset.theme = stored;
  }

  private toggleTheme(): void {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('mc_theme', next);
    this.drawBg();
    this.applyCounterTheme();
  }

  private getDigitSprite(): string {
    return document.documentElement.dataset.theme === 'dark'
      ? '/cimg/001/c/white.png'
      : '/cimg/001/c/default.png';
  }

  private applyCounterTheme(): void {
    this.counter?.setTexture(this.getDigitSprite());
  }

  private initFromUrl(): void {
    const preset = window.__MC_PRESET;
    const url = parseUrlState(location.search);
    this.wm = (preset?.wm as ViewMode) || url.wm;
    if (preset?.h1) {
      this.landingH1 = preset.h1;
      this.landingIntro = preset.intro || '';
    }
    if (url.wid) this.eventWid = url.wid;
    if (url.t1) {
      this.text1 = url.t1;
      this.topTextEdited = true;
    }
    if (url.t2) this.text2 = url.t2;

    const fid = url.fid ?? 1;
    let born: number;
    let tz: number;

    if (url.lt && url.local) {
      this.localDateActive = true;
      this.localSpec = url.local;
      this.shareMode = 'local';
      const off = browserTzOffsetMin();
      born = resolveLocalBornTime(url.local, off);
      tz = defaultTzPacked();
    } else {
      tz = url.tz ?? defaultTzPacked();
      born = url.t ?? DEFAULT_BORN;
    }

    this.helper = new CounterHelper(born, tz, fid, this.tx, this.lang);
    const canvas = this.root.querySelector<HTMLCanvasElement>('#counter-canvas')!;
    this.counter = new DigitCounter(canvas, {
      w: 50,
      h: 64,
      tex: this.getDigitSprite(),
      spac: 50,
    });
    this.applyCounterTheme();
    this.counterTheme = parseTheme(url.th);
    this.applyCounterBackground();

    if (this.wm === 1) {
      this.applyViewMode();
      void this.bootstrapEvents(url);
    } else {
      const eventId = url.eid || preset?.eventId;
      if (eventId) {
        this.applyViewMode();
        void this.applyLandingEvent(eventId).then(() => {
          if (url.lt && url.local) {
            this.syncFormFromLocalSpec(url.local);
          } else {
            this.syncTzFormFromHelper();
            this.syncFormFromBorn(this.helper.bornTime);
          }
          this.applyViewMode();
          this.syncShareModeUI();
          this.refreshUI();
        });
      } else if (url.lt && url.local) {
        this.syncFormFromLocalSpec(url.local);
        this.applyViewMode();
        this.syncShareModeUI();
        this.refreshUI();
      } else {
        this.syncTzFormFromHelper();
        this.syncFormFromBorn(born);
        this.applyViewMode();
        this.syncShareModeUI();
        this.refreshUI();
      }
    }
    void this.loadPopularLandings();
    this.renderSavedCounters();
  }

  private applyCounterBackground(): void {
    const wrap = this.root.querySelector<HTMLElement>('.counter-wrap');
    if (!wrap) return;
    const bg = THEME_BACKGROUNDS[this.counterTheme];
    if (bg) {
      wrap.style.backgroundImage = `url(${bg})`;
      wrap.style.backgroundSize = 'cover';
      wrap.style.backgroundPosition = 'center';
      wrap.classList.add('counter-wrap--themed');
    } else {
      wrap.style.backgroundImage = '';
      wrap.classList.remove('counter-wrap--themed');
    }
  }

  private setCounterTheme(theme: CounterTheme): void {
    this.counterTheme = theme;
    this.applyCounterBackground();
    const link = this.root.querySelector<HTMLInputElement>('#share-link');
    if (link) link.value = this.shareUrl();
  }

  private renderSavedCounters(): void {
    const el = this.root.querySelector('#saved-counters-list');
    if (!el) return;
    if (!this.savedCounters.length) {
      el.innerHTML = `<p class="hint">${this.tx.myCountersEmpty}</p>`;
      return;
    }
    el.innerHTML = this.savedCounters
      .map(
        (c) =>
          `<div class="saved-item"><a href="${c.url}">${c.title}</a> <button type="button" data-del="${c.id}" class="btn-ghost">${this.tx.myCountersDelete}</button></div>`,
      )
      .join('');
    el.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.del!;
        this.savedCounters = deleteSavedCounter(id);
        this.renderSavedCounters();
      });
    });
  }

  private saveCurrentCounter(): void {
    const url = this.shareUrl();
    const title =
      (this.root.querySelector<HTMLInputElement>('#inp-text1')?.value || this.text1 || this.suggestedTopText()).trim();
    this.savedCounters = saveCounter({ url, title });
    this.renderSavedCounters();
  }

  private downloadCalendar(): void {
    const title =
      (this.root.querySelector<HTMLInputElement>('#inp-text1')?.value || this.text1 || this.suggestedTopText()).trim() ||
      'myCount';
    const annual = isAnnualFromSpec(
      this.localSpec,
      this.root.querySelector<HTMLInputElement>('#share-annual')?.checked ?? false,
    );
    downloadIcs(icsFilename(title), buildIcsFile(title, this.helper.bornTime, annual));
    this.trackGoal('add_to_calendar');
  }

  private async showQrCode(): Promise<void> {
    const url = await this.shortShareUrl();
    const modal = this.root.querySelector('#qr-modal');
    const canvas = this.root.querySelector<HTMLCanvasElement>('#qr-canvas');
    if (!modal || !canvas) return;
    try {
      const QRCode = await import('qrcode');
      await QRCode.toCanvas(canvas, url, { width: 220, margin: 2 });
      (modal as HTMLElement).hidden = false;
    } catch {
      window.prompt(this.tx.qrTitle, url);
    }
  }

  private trackGoal(name: string): void {
    const ym = (window as unknown as { ym?: (id: number, action: string, goal: string) => void }).ym;
    if (typeof ym === 'function') ym(0, 'reachGoal', name);
  }

  private async applyLandingEvent(eventId: string): Promise<void> {
    const ev = await fetchLandingEvent(eventId, this.lang);
    if (!ev) return;
    this.currentEventEid = ev.id;
    this.text1 = '';
    this.topTextEdited = false;
    if (!this.landingH1) {
      this.landingH1 = this.lang === 'ru' ? `Сколько дней до ${ev.name.ru}?` : `How many days until ${ev.name.en}?`;
      this.landingIntro = ev.desc[this.lang];
      this.applyLandingIntro();
    }
    this.helper.setBornTime(ev.t, ev.tz, 1, 0, 0, this.tx);
    const custom1 = this.root.querySelector<HTMLInputElement>('#inp-text1');
    if (custom1 && !custom1.value.trim()) {
      custom1.placeholder = `${ev.name[this.lang]} — ${this.helper.buildDateText(this.tx)}`;
    }
  }

  private applyLandingIntro(): void {
    const h1 = this.root.querySelector('#landing-h1');
    const intro = this.root.querySelector('#landing-intro');
    const section = this.root.querySelector('.section-landing-intro');
    if (h1) h1.textContent = this.landingH1;
    if (intro) intro.textContent = this.landingIntro;
    if (section) (section as HTMLElement).hidden = !this.landingH1 || this.wm !== 4;
  }

  private async loadPopularLandings(): Promise<void> {
    this.popularLandings = await fetchPopularLandings(this.lang);
    const el = this.root.querySelector('#popular-counters');
    if (!el) return;
    if (!this.popularLandings.length) {
      (el as HTMLElement).hidden = true;
      return;
    }
    const links = this.popularLandings
      .map((p) => `<a href="${p.href}" class="popular-link">${p.label}</a>`)
      .join('');
    el.innerHTML = `<h2>${this.tx.popularCounters}</h2><nav class="popular-nav">${links}</nav>`;
  }

  private async bootstrapEvents(url: ReturnType<typeof parseUrlState>): Promise<void> {
    this.setEventsLoading(true);

    try {
      this.eventCatalog = await loadEventCatalog(EVENT_COUNTRY);
      const wid = url.eid ? findEventIndex(this.eventCatalog, url.eid) : defaultEventIndex(this.eventCatalog);
      this.eventWid = wid;
      this.applyEventByWid(wid);
    } catch {
      this.eventCatalog = [];
    }

    this.setEventsLoading(false);
    this.applyViewMode();
    this.refreshUI();
  }

  private setEventsLoading(on: boolean): void {
    const el = this.root.querySelector('#events-loading');
    if (el) (el as HTMLElement).hidden = !on;
  }

  private applyEventByWid(wid: number): void {
    if (!this.eventCatalog.length) return;
    const ev = eventAtIndex(this.eventCatalog, wid);
    this.applyCounterEvent(ev, wid);
  }

  private applyCounterEvent(ev: CounterEvent, wid: number): void {
    this.eventWid = wid;
    this.currentEventEid = ev.id;
    this.text2 = '';
    this.helper.setBornTime(ev.t, ev.tz, 1, 0, 0, this.tx);

    const titleEl = this.root.querySelector('#event-title');
    if (titleEl) titleEl.textContent = ev.name[this.lang];

    const modeEl = this.root.querySelector('#event-mode');
    if (modeEl) {
      modeEl.textContent = this.helper.cm < 0 ? this.tx.eventModeUntil : this.tx.eventModeSince;
    }

    const desc = this.root.querySelector('#event-desc');
    if (desc) desc.textContent = ev.desc[this.lang];

    const sourceEl = this.root.querySelector('#event-source');
    if (sourceEl) {
      const labels: Record<string, string> = {
        history: this.tx.eventSourceHistory,
        annual: this.tx.eventSourceAnnual,
        milestone: this.tx.eventSourceMilestone,
        holiday: this.tx.eventSourceHoliday,
        landing: this.tx.eventSourceLanding,
      };
      sourceEl.textContent = labels[ev.source] || '';
    }

    const bs = this.helper.bs;
    const yearEl = this.root.querySelector('#event-date-year');
    const dayEl = this.root.querySelector('#event-date-day');
    const timeEl = this.root.querySelector('#event-date-time');
    if (yearEl) yearEl.textContent = String(bs.y);
    if (dayEl) dayEl.textContent = bs.dm.trim();
    if (timeEl) {
      const tz = bs.fknttz || bs.knttz || '';
      timeEl.textContent = `${bs.fts}${bs.rs}${tz ? ` ${tz}` : ''}`.trim();
    }

    const indexEl = this.root.querySelector('#event-index');
    if (indexEl) indexEl.textContent = `${wid} / ${this.eventCatalog.length}`;
  }

  private syncFormFromBorn(t: number): void {
    const mcd = new McDate();
    const tzSec = this.helper.tzen && !this.helper.tzunk ? this.helper.tz : 0;
    mcd.setTime(t + tzSec * 1000);
    const set = (sel: string, v: number | string) => {
      const el = this.root.querySelector<HTMLInputElement | HTMLSelectElement>(sel);
      if (el) el.value = String(v);
    };
    set('#inp-year', mcd.y);
    set('#inp-month', mcd.m);
    set('#inp-day', mcd.d + 1);
    set('#inp-hour', mcd.h);
    set('#inp-min', mcd.i);
    set('#inp-sec', mcd.s);
  }

  private syncFormFromLocalSpec(spec: LocalDateSpec): void {
    const set = (sel: string, v: number | string) => {
      const el = this.root.querySelector<HTMLInputElement | HTMLSelectElement>(sel);
      if (el) el.value = String(v);
    };
    set('#inp-year', spec.year);
    set('#inp-month', spec.month - 1);
    set('#inp-day', spec.day);
    set('#inp-hour', spec.hour);
    set('#inp-min', spec.min);
    set('#inp-sec', spec.sec);
    const annual = this.root.querySelector<HTMLInputElement>('#share-annual');
    if (annual) annual.checked = spec.annual;
  }

  private readFormLocalSpec(): LocalDateSpec {
    const get = (sel: string) => parseInt((this.root.querySelector<HTMLInputElement>(sel)?.value || '0'), 10);
    const month = parseInt((this.root.querySelector<HTMLSelectElement>('#inp-month')?.value || '0'), 10);
    return {
      year: get('#inp-year'),
      month: month + 1,
      day: get('#inp-day'),
      hour: get('#inp-hour'),
      min: get('#inp-min'),
      sec: get('#inp-sec'),
      annual: this.root.querySelector<HTMLInputElement>('#share-annual')?.checked ?? false,
    };
  }

  private suggestedTopText(): string {
    if (this.shareMode === 'local') {
      const spec = this.readFormLocalSpec();
      const label = formatLocalDateLabel(spec, this.lang, this.tx.months, this.tx.monthRp);
      return this.tx.shareLocalTemplate.replace('{date}', label);
    }
    return this.helper.buildDateText(this.tx);
  }

  private updateTopTextHint(): void {
    const custom1 = this.root.querySelector<HTMLInputElement>('#inp-text1');
    if (!custom1 || this.topTextEdited || custom1.value.trim()) return;
    custom1.placeholder = this.suggestedTopText();
  }

  private syncShareModeUI(): void {
    this.root.querySelectorAll<HTMLInputElement>('[name="share-mode"]').forEach((input) => {
      input.checked = input.value === this.shareMode;
    });
    const annualWrap = this.root.querySelector('#share-annual-wrap');
    if (annualWrap) (annualWrap as HTMLElement).hidden = this.shareMode !== 'local';
    this.updateShareLocalLabel();
    this.refreshSharePreview();
  }

  private updateShareLocalLabel(): void {
    const el = this.root.querySelector('#share-local-label');
    if (!el) return;
    const spec = this.readFormLocalSpec();
    const label = formatLocalDateLabel(spec, this.lang, this.tx.months, this.tx.monthRp);
    el.textContent = this.tx.shareLocalTemplate.replace('{date}', label);
  }

  private refreshSharePreview(): void {
    const el = this.root.querySelector('#share-preview');
    if (!el) return;
    if (this.shareMode !== 'local') {
      el.textContent = '';
      (el as HTMLElement).hidden = true;
      return;
    }
    (el as HTMLElement).hidden = false;
    const spec = this.readFormLocalSpec();
    const mskMin = 180;
    const bt = resolveLocalBornTime(spec, mskMin);
    const bs = this.helper.getDateStrEx(bt, false, mskMin * 60, 0, this.tx);
    const date = `${bs.dm.trim()}, ${bs.fts}${bs.rs}`.trim();
    el.textContent = this.tx.sharePreviewMoscow.replace('{date}', date);
  }

  private setShareMode(mode: ShareMode): void {
    this.shareMode = mode;
    this.localDateActive = mode === 'local';
    if (mode === 'local') this.localSpec = this.readFormLocalSpec();
    const annualWrap = this.root.querySelector('#share-annual-wrap');
    if (annualWrap) (annualWrap as HTMLElement).hidden = mode !== 'local';
    this.bornFromForm();
    this.updateShareLocalLabel();
    this.refreshSharePreview();
    this.updateTopTextHint();
  }

  private applyLocalBornIfNeeded(): void {
    if (!this.localDateActive || !this.localSpec) return;
    const off = browserTzOffsetMin();
    const bt = resolveLocalBornTime(this.localSpec, off);
    if (bt !== this.helper.bornTime) {
      this.helper.setBornTime(bt, off * 60, 1, 0, 0, this.tx);
    }
  }

  private readTzFromForm(): { tz: number; tzen: number; isGMT: number; tzunk: number } {
    switch (this.tzMode) {
      case 3:
        return { tz: 0, tzen: 0, isGMT: 0, tzunk: 0 };
      case 4:
        return { tz: 0, tzen: 1, isGMT: 0, tzunk: 1 };
      case 2: {
        const get = (sel: string) =>
          parseInt((this.root.querySelector<HTMLInputElement>(sel)?.value || '0'), 10);
        const tz = gmtToSeconds(get('#inp-gmt-h'), get('#inp-gmt-min'), get('#inp-gmt-s'));
        return { tz, tzen: 1, isGMT: 1, tzunk: 0 };
      }
      default: {
        const min = parseInt(
          (this.root.querySelector<HTMLSelectElement>('#inp-tz-select')?.value || '0'),
          10,
        );
        return { tz: min * 60, tzen: 1, isGMT: 0, tzunk: 0 };
      }
    }
  }

  private syncTzFormFromHelper(): void {
    this.tzMode = inferTzMode(this.helper.tzen, this.helper.isGMT, this.helper.tzunk);
    this.applyTzModeUI();
    if (this.tzMode === 1) {
      const sel = this.root.querySelector<HTMLSelectElement>('#inp-tz-select');
      if (sel) {
        const min = String(this.helper.tz / 60);
        const cur = String(browserTzOffsetMin());
        if (min === cur) {
          const browserOpt = sel.querySelector<HTMLOptionElement>('option[data-browser="1"]');
          if (browserOpt) browserOpt.selected = true;
        } else {
          sel.value = min;
        }
      }
    } else if (this.tzMode === 2) {
      const { h, min, s } = secondsToGmt(this.helper.tz);
      const set = (sel: string, v: number) => {
        const el = this.root.querySelector<HTMLInputElement>(sel);
        if (el) el.value = String(v);
      };
      set('#inp-gmt-h', h);
      set('#inp-gmt-min', min);
      set('#inp-gmt-s', s);
    }
    this.updateTzToggleLabel();
  }

  private applyTzModeUI(): void {
    const utc = this.root.querySelector('#tz-area-utc');
    const gmt = this.root.querySelector('#tz-area-gmt');
    if (utc) (utc as HTMLElement).hidden = this.tzMode !== 1;
    if (gmt) (gmt as HTMLElement).hidden = this.tzMode !== 2;
    this.root.querySelectorAll<HTMLButtonElement>('[data-tz-mode]').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.tzMode) === this.tzMode);
    });
  }

  private updateTextLimitHint(active?: HTMLInputElement): void {
    const el = this.root.querySelector('#text-limit-hint');
    if (!el) return;
    if (active && active.value.length > 0) {
      el.textContent = this.tx.textLimitLeft.replace('{n}', String(MAX_SHARE_TEXT - active.value.length));
    } else {
      el.textContent = this.tx.textLimitHint.replace('{n}', String(MAX_SHARE_TEXT));
    }
  }

  private updateTzToggleLabel(): void {
    const btn = this.root.querySelector('#tz-toggle');
    if (btn) btn.textContent = this.tzPanelOpen ? this.tx.hideSettings : this.tx.change;
  }

  private isBrowserTimezone(): boolean {
    if (this.tzMode !== 1 || this.helper.tzunk || !this.helper.tzen || this.helper.isGMT) return false;
    const sel = this.root.querySelector<HTMLSelectElement>('#inp-tz-select');
    return sel?.selectedOptions[0]?.dataset.browser === '1';
  }

  private buildTzSelectOptions(): string {
    const cur = browserTzOffsetMin();
    let html = `<option value="${cur}" data-browser="1">${this.tx.tzCurrent} ${formatUtcOffset(cur)}</option>`;
    for (const min of TZ_OFFSETS_MIN) {
      html += `<option value="${min}">${formatUtcOffset(min)}</option>`;
    }
    return html;
  }

  private bornFromForm(): void {
    if (this.shareMode === 'local' || this.localDateActive) {
      const spec = this.readFormLocalSpec();
      this.localSpec = spec;
      const off = browserTzOffsetMin();
      const bt = resolveLocalBornTime(spec, off);
      this.helper.ent = 4;
      this.helper.setBornTime(bt, off * 60, 1, 0, 0, this.tx);
      this.refreshUI();
      return;
    }

    const get = (sel: string) => parseInt((this.root.querySelector<HTMLInputElement>(sel)?.value || '0'), 10);
    const y = get('#inp-year');
    const m = get('#inp-month');
    const d = get('#inp-day');
    const h = get('#inp-hour');
    const min = get('#inp-min');
    const s = get('#inp-sec');
    const { tz, tzen, isGMT, tzunk } = this.readTzFromForm();
    const dobj = new McDate();
    dobj.setDate({ y, m, d: d - 1, h, i: min, s });
    const bt = dobj.getTime() - tz * 1000;
    this.helper.ent = 4;
    this.helper.setBornTime(bt, tz, tzen, isGMT, tzunk, this.tx);
    this.refreshUI();
  }

  private applyPreset(name: string): void {
    const now = new Date();
    let target = new Date(now);
    switch (name) {
      case 'now':
        target = now;
        break;
      case 'hour':
        target = new Date(now.getTime() + 3600000);
        break;
      case 'tomorrow':
        target.setDate(target.getDate() + 1);
        target.setHours(0, 0, 0, 0);
        break;
      case 'newyear': {
        let y = now.getFullYear();
        if (now.getMonth() > 0 || now.getDate() > 1) y += 1;
        target = new Date(y, 0, 1, 0, 0, 0, 0);
        break;
      }
      case '100m': {
        const step = 1e8;
        target = new Date(Math.ceil(now.getTime() / 1000 / step) * step * 1000);
        break;
      }
    }
    const set = (sel: string, v: number) => {
      const el = this.root.querySelector<HTMLInputElement>(sel);
      if (el) el.value = String(v);
    };
    set('#inp-year', target.getFullYear());
    set('#inp-month', target.getMonth());
    set('#inp-day', target.getDate());
    set('#inp-hour', target.getHours());
    set('#inp-min', target.getMinutes());
    set('#inp-sec', target.getSeconds());
    this.bornFromForm();
  }

  private applyViewMode(): void {
    document.body.dataset.mode = String(this.wm);
    const show = (sel: string, on: boolean) => {
      const el = this.root.querySelector(sel);
      if (el) (el as HTMLElement).hidden = !on;
    };
    show('.section-editor', this.wm === 3);
    show('.section-events', this.wm === 1);
    show('.section-life', this.wm === 3);
    show('.section-settings', this.wm !== 4);
    show('.section-header', true);
    show('.section-intro', this.wm === 3);
    show('.section-footer', this.wm !== 4);
    this.applyLandingIntro();
  }

  private appShareUrl(wm: ViewMode = 4): string {
    const t1 = (this.root.querySelector<HTMLInputElement>('#inp-text1')?.value || this.text1).trim();
    const t2 = (this.root.querySelector<HTMLInputElement>('#inp-text2')?.value || this.text2).trim();
    return buildAppShareUrl({
      basePath: langBasePath(this.lang),
      bornTime: this.helper.bornTime,
      getTZ: () => this.helper.getTZ(),
      format: this.helper.format,
      text1: t1,
      text2: t2,
      eid: this.currentEventEid || undefined,
      wm,
      omitTz: this.isBrowserTimezone(),
      shareMode: this.shareMode,
      local: this.shareMode === 'local' ? this.readFormLocalSpec() : undefined,
      theme: themeToParam(this.counterTheme),
    });
  }

  private shareUrl(): string {
    return this.appShareUrl(4);
  }

  private ogTitleDesc(): { title: string; desc: string } {
    const ev = findEventById(this.eventCatalog, this.currentEventEid);
    const dateText = this.suggestedTopText();

    if (ev) {
      return { title: `${ev.name[this.lang]} — ${dateText}`, desc: ev.desc[this.lang] || dateText };
    }

    const custom = (this.root.querySelector<HTMLInputElement>('#inp-text1')?.value || this.text1)
      .trim()
      .slice(0, MAX_SHARE_TEXT);
    if (custom) return { title: custom, desc: dateText };
    return { title: dateText, desc: dateText };
  }

  private ogShareUrl(): string {
    const { title, desc } = this.ogTitleDesc();
    return buildOgShareUrl(this.lang, this.appShareUrl(4), title, desc);
  }

  /** Short link /s/:id — OG preview for messengers + redirect. Falls back to the long OG url. */
  private async shortShareUrl(): Promise<string> {
    const appUrl = this.appShareUrl(4);
    const to = appUrl.startsWith(location.origin) ? appUrl.slice(location.origin.length) : appUrl;
    const { title, desc } = this.ogTitleDesc();
    try {
      const r = await fetch('/api/short', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, title, desc }),
      });
      if (!r.ok) throw new Error(String(r.status));
      const data = (await r.json()) as { id?: string };
      if (!data.id) throw new Error('no id');
      return `${location.origin}/s/${data.id}`;
    } catch {
      return this.ogShareUrl();
    }
  }

  private refreshUI(): void {
    this.helper.refreshBS(this.tx);
    const dateText = this.suggestedTopText();
    const t1El = this.root.querySelector('#text1');
    const t2El = this.root.querySelector('#text2');
    const custom1 = this.root.querySelector<HTMLInputElement>('#inp-text1');
    const custom2 = this.root.querySelector<HTMLInputElement>('#inp-text2');

    if (this.wm === 1) {
      if (t1El) t1El.textContent = this.helper.buildDateText(this.tx);
      if (t2El) t2El.textContent = this.text2;
      const modeEl = this.root.querySelector('#event-mode');
      if (modeEl) {
        modeEl.textContent = this.helper.cm < 0 ? this.tx.eventModeUntil : this.tx.eventModeSince;
      }
    } else if (this.wm === 4) {
      if (t1El) t1El.textContent = this.text1 || dateText;
      if (t2El) t2El.textContent = this.text2;
    } else {
      if (t1El) t1El.textContent = custom1?.value.trim() || dateText;
      if (t2El) t2El.textContent = custom2?.value || '';
      this.updateTopTextHint();
    }

    const link = this.root.querySelector<HTMLInputElement>('#share-link');
    if (link) link.value = this.shareUrl();

    const tzHint = this.root.querySelector('#tz-local-hint');
    if (tzHint) {
      tzHint.textContent = `${this.tx.tzLocalHint} ${formatUtcOffset(browserTzOffsetMin())}`;
    }

    const tzEl = this.root.querySelector('#tz-display');
    if (tzEl) tzEl.textContent = this.helper.bs.fknttz || this.helper.bs.knttz || '—';

    this.renderLifeTable();
    this.renderMetrics();
    this.updateShareLocalLabel();
    this.refreshSharePreview();
    this.updateProgressBar();
  }

  private updateProgressBar(): void {
    const bar = this.root.querySelector<HTMLElement>('#progress-bar');
    const fill = this.root.querySelector<HTMLElement>('#progress-fill');
    const label = this.root.querySelector('#progress-label');
    if (!bar || !fill || !label) return;
    if (this.helper.cm >= 0) {
      bar.hidden = true;
      label.textContent = '';
      return;
    }
    bar.hidden = false;
    const pct = eventProgressPct(this.helper.bornTime);
    fill.style.width = `${pct}%`;
    label.textContent = this.tx.progressLabel.replace('{pct}', String(pct));
  }

  private renderMetrics(): void {
    const ul = this.root.querySelector('#metrics');
    if (!ul) return;
    ul.innerHTML = '';
    for (let i = 1; i <= 7; i++) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#';
      a.textContent = this.tx.metrics[i - 1];
      if (i === this.helper.format) a.classList.add('active');
      a.addEventListener('click', (e) => {
        e.preventDefault();
        this.helper.format = i;
        this.refreshUI();
      });
      li.appendChild(a);
      ul.appendChild(li);
    }
    const cur = this.root.querySelector('#current-metric');
    if (cur) cur.textContent = this.helper.getMainMetric(null, this.tx);
  }

  private renderLifeTable(): void {
    const tbody = this.root.querySelector('#life-table tbody');
    if (!tbody) return;
    const raw = this.helper.getEventArray(this.eventOffset, 0);
    raw.pop();
    const events = raw.filter((e): e is { ev: number; em: string; es: number; efid: number } => typeof e !== 'number');
    events.sort((a: { es: number }, b: { es: number }) => a.es - b.es);
    tbody.innerHTML = '';
    for (let i = 0; i < 7; i++) {
      const tr = document.createElement('tr');
      const ev = events[i];
      if (ev) {
        const bs = this.helper.getDateStrEx(ev.es, true, -new Date().getTimezoneOffset() * 60, 0, this.tx);
        tr.innerHTML = `<td>${bs.dm}${this.tx.dateDel}${bs.knywy}</td><td>${bs.fts}<span class="rs">${bs.rs}</span></td><td><strong>${numToStr(ev.ev)}</strong> <a href="#" data-fid="${ev.efid}">${ev.em}</a></td>`;
        tr.querySelector('a')?.addEventListener('click', (e) => {
          e.preventDefault();
          this.helper.format = ev.efid;
          this.refreshUI();
        });
      } else {
        tr.innerHTML = '<td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>';
      }
      tbody.appendChild(tr);
    }
  }

  private drawBg(): void {
    const canvas = this.root.querySelector<HTMLCanvasElement>('#bg-canvas');
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const c = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;
    const grsw = 3500;
    const ofs = (w - grsw) / 2;
    const isDark = document.documentElement.dataset.theme === 'dark';
    const grd = c.createLinearGradient(ofs, 0, grsw + ofs, 0);
    if (isDark) {
      grd.addColorStop(0, 'rgb(10, 10, 14)');
      grd.addColorStop(0.4, 'rgb(28, 28, 36)');
      grd.addColorStop(0.6, 'rgb(28, 28, 36)');
      grd.addColorStop(1, 'rgb(10, 10, 14)');
    } else {
      grd.addColorStop(0, 'rgb(0, 0, 0)');
      grd.addColorStop(0.4, 'rgb(245, 245, 245)');
      grd.addColorStop(0.6, 'rgb(245, 245, 245)');
      grd.addColorStop(1, 'rgb(0, 0, 0)');
    }
    c.fillStyle = grd;
    c.fillRect(0, 0, w, h);
  }

  private onResize(): void {
    this.drawBg();
    const canvas = this.root.querySelector<HTMLCanvasElement>('#counter-canvas');
    if (!canvas || !this.counter) return;
    const wrap = this.root.querySelector<HTMLElement>('.counter-canvas-wrap');
    if (wrap && canvas) {
      const w = Math.max(wrap.clientWidth, 1);
      canvas.width = w;
      canvas.height = 85;
      this.counter.resize(w, 85);
    }
  }

  private loop(): void {
    this.applyLocalBornIfNeeded();
    this.helper.captureTime();
    // One-time date just passed (or vice versa): flip «осталось» / «прошло» texts live.
    if (this.helper.cm !== this.lastCm) {
      this.lastCm = this.helper.cm;
      this.refreshUI();
    }
    const mainValue = this.helper.getMainValue();
    this.counter.mv = mainValue;
    this.counter.cm = this.helper.cm;
    this.counter.draw();
    const subEl = this.root.querySelector('#sub-text');
    if (subEl) {
      subEl.innerHTML = `<strong>${this.helper.getMainMetric(this.helper.format === 1 ? 0 : mainValue, this.tx)}</strong><br>${this.helper.getSubText(this.tx)}`;
    }
    this.raf = requestAnimationFrame(() => this.loop());
  }

  private bind(): void {
    this.root.querySelector('#counter-canvas')?.addEventListener('click', () => {
      this.helper.format = (this.helper.format % 7) + 1;
      this.refreshUI();
    });
    this.root.querySelector('#theme-toggle')?.addEventListener('click', () => this.toggleTheme());
    this.root.querySelector('#nav-events')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.wm = 1;
      this.applyViewMode();
      if (!this.eventCatalog.length) void this.bootstrapEvents(parseUrlState(''));
      else this.refreshUI();
    });
    this.root.querySelector('#nav-new')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.wm = 3;
      this.applyViewMode();
      this.refreshUI();
    });
    this.root.querySelector('#event-prev')?.addEventListener('click', (e) => {
      e.preventDefault();
      const len = this.eventCatalog.length;
      if (!len) return;
      this.eventWid = ((this.eventWid - 2 + len) % len) + 1;
      this.applyEventByWid(this.eventWid);
      this.refreshUI();
    });
    this.root.querySelector('#event-next')?.addEventListener('click', (e) => {
      e.preventDefault();
      const len = this.eventCatalog.length;
      if (!len) return;
      this.eventWid = (this.eventWid % len) + 1;
      this.applyEventByWid(this.eventWid);
      this.refreshUI();
    });
    this.root.querySelector('#copy-og-link')?.addEventListener('click', async () => {
      const url = await this.shortShareUrl();
      try {
        await navigator.clipboard.writeText(url);
        const btn = this.root.querySelector('#copy-og-link');
        if (btn) {
          const orig = btn.textContent;
          btn.textContent = this.tx.copied;
          setTimeout(() => { btn.textContent = orig; }, 1500);
        }
        this.trackGoal('copy_short_link');
      } catch {
        window.prompt(this.tx.copyTelegram, url);
      }
    });
    this.root.querySelector('#add-calendar')?.addEventListener('click', () => this.downloadCalendar());
    this.root.querySelector('#show-qr')?.addEventListener('click', () => void this.showQrCode());
    this.root.querySelector('#qr-close')?.addEventListener('click', () => {
      const modal = this.root.querySelector('#qr-modal');
      if (modal) (modal as HTMLElement).hidden = true;
    });
    this.root.querySelector('#save-counter')?.addEventListener('click', () => this.saveCurrentCounter());
    this.root.querySelector('#theme-select')?.addEventListener('change', (e) => {
      const v = (e.target as HTMLSelectElement).value as CounterTheme;
      this.setCounterTheme(v);
    });
    const themeSel = this.root.querySelector<HTMLSelectElement>('#theme-select');
    if (themeSel) themeSel.value = this.counterTheme;
    this.root.querySelector('#toggle-settings')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.settingsOpen = !this.settingsOpen;
      const pad = this.root.querySelector('.settings-pad');
      if (pad) (pad as HTMLElement).hidden = !this.settingsOpen;
      const btn = this.root.querySelector('#toggle-settings');
      if (btn) btn.textContent = this.settingsOpen ? this.tx.hideSettings : this.tx.adjustAndGetLink;
    });
    this.root.querySelector('#copy-link')?.addEventListener('click', async () => {
      const input = this.root.querySelector<HTMLInputElement>('#share-link');
      if (!input) return;
      try {
        await navigator.clipboard.writeText(input.value);
        const btn = this.root.querySelector('#copy-link');
        if (btn) {
          const orig = btn.textContent;
          btn.textContent = this.tx.copied;
          setTimeout(() => { btn.textContent = orig; }, 1500);
        }
      } catch {
        input.select();
        document.execCommand('copy');
      }
    });
    this.root.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.applyPreset((btn as HTMLElement).dataset.preset!);
      });
    });
    ['#inp-year', '#inp-month', '#inp-day', '#inp-hour', '#inp-min', '#inp-sec'].forEach((sel) => {
      this.root.querySelector(sel)?.addEventListener('change', () => this.bornFromForm());
    });
    this.root.querySelector('#share-annual')?.addEventListener('change', () => {
      if (this.shareMode === 'local') this.bornFromForm();
      else this.refreshSharePreview();
    });
    this.root.querySelectorAll<HTMLInputElement>('[name="share-mode"]').forEach((input) => {
      input.addEventListener('change', () => {
        if (input.checked) this.setShareMode(input.value as ShareMode);
      });
    });
    this.root.querySelector('#inp-tz-select')?.addEventListener('change', () => this.bornFromForm());
    ['#inp-gmt-h', '#inp-gmt-min', '#inp-gmt-s'].forEach((sel) => {
      this.root.querySelector(sel)?.addEventListener('change', () => this.bornFromForm());
    });
    this.root.querySelector('#tz-toggle')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.tzPanelOpen = !this.tzPanelOpen;
      const panel = this.root.querySelector('#tz-panel');
      if (panel) (panel as HTMLElement).hidden = !this.tzPanelOpen;
      this.updateTzToggleLabel();
    });
    this.root.querySelectorAll('[data-tz-mode]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.tzMode = Number((btn as HTMLElement).dataset.tzMode) as TzMode;
        this.applyTzModeUI();
        this.bornFromForm();
      });
    });
    for (const sel of ['#inp-text1', '#inp-text2']) {
      const input = this.root.querySelector<HTMLInputElement>(sel);
      input?.addEventListener('input', () => {
        if (sel === '#inp-text1') {
          this.topTextEdited = input.value.trim().length > 0;
        }
        this.updateTextLimitHint(input);
        this.refreshUI();
      });
    }
    this.updateTextLimitHint();
    this.root.querySelector('#rest-toggle')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.helper.restMode = (this.helper.restMode + 1) % 2;
      this.refreshUI();
    });
    this.root.querySelector('#life-prev')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.eventOffset--;
      this.renderLifeTable();
    });
    this.root.querySelector('#life-next')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.eventOffset++;
      this.renderLifeTable();
    });
  }

  private render(): void {
    const months = this.tx.months.map((m: string, i: number) => `<option value="${i}">${m}</option>`).join('');
    const tzOptions = this.buildTzSelectOptions();
    this.root.innerHTML = `
      <canvas id="bg-canvas" class="bg-canvas" aria-hidden="true"></canvas>
      <div class="page">
        <header class="section-header">
          <a href="${langBasePath(this.lang)}" class="logo-link">
            <img src="/cimg/001/i/logo.png" alt="${this.tx.logoAlt}" width="180" height="48">
          </a>
          <nav class="nav">
            <a href="#" id="nav-events">${this.tx.navEvents}</a>
            <a href="#" id="nav-new">${this.tx.navNew}</a>
            <a href="/${this.lang === 'ru' ? 'en' : 'ru'}/" class="lang-switch">${this.lang === 'ru' ? 'EN' : 'RU'}</a>
            <button type="button" id="theme-toggle" class="btn-ghost">${this.tx.themeToggle}</button>
          </nav>
        </header>

        <section class="section-landing-intro card" hidden>
          <h1 id="landing-h1"></h1>
          <p id="landing-intro"></p>
        </section>

        <section class="section-intro card">
          <h1>${this.tx.introTitle}</h1>
          <p>${this.tx.introText}</p>
        </section>

        <section class="section-events card" hidden>
          <h2 class="events-heading">${this.tx.navEvents}</h2>
          <p class="events-hint">${this.tx.eventsHint}</p>
          <p id="events-loading" class="events-loading" hidden>${this.tx.eventsLoading}</p>
          <div id="events-panel">
            <div class="event-date-row">
              <button type="button" id="event-prev" class="event-arrow" aria-label="${this.tx.eventPrev}">‹</button>
              <div class="event-date-box">
                <div id="event-date-year" class="event-date-year"></div>
                <div id="event-date-day" class="event-date-day"></div>
                <div id="event-date-time" class="event-date-time"></div>
              </div>
              <button type="button" id="event-next" class="event-arrow" aria-label="${this.tx.eventNext}">›</button>
            </div>
            <p id="event-title" class="event-title"></p>
            <p id="event-mode" class="event-mode"></p>
            <p id="event-source" class="event-source"></p>
            <p id="event-desc" class="event-desc"></p>
            <p id="event-index" class="event-index"></p>
          </div>
        </section>

        <section class="section-editor card">
          <h2>${this.tx.dateHeader}</h2>
          <div class="presets">
            <span>${this.tx.presetsLabel}</span>
            <button type="button" data-preset="now">${this.tx.presetNow}</button>
            <button type="button" data-preset="hour">${this.tx.presetHour}</button>
            <button type="button" data-preset="tomorrow">${this.tx.presetTomorrow}</button>
            <button type="button" data-preset="newyear">${this.tx.presetNewYear}</button>
            <button type="button" data-preset="100m">${this.tx.preset100m}</button>
          </div>
          <div class="date-form">
            <div class="date-group date-group--date">
              <label class="date-field date-field--year">${this.tx.year}<input type="number" id="inp-year" value="2012"></label>
              <label class="date-field date-field--month">${this.tx.month}<select id="inp-month">${months}</select></label>
              <label class="date-field date-field--day">${this.tx.day}<input type="number" id="inp-day" min="1" max="31" value="18"></label>
            </div>
            <div class="date-group date-group--time">
              <label class="date-field date-field--time">${this.tx.hour}<input type="number" id="inp-hour" min="0" max="23" value="0"></label>
              <label class="date-field date-field--time">${this.tx.min}<input type="number" id="inp-min" min="0" max="59" value="0"></label>
              <label class="date-field date-field--time">${this.tx.sec}<input type="number" id="inp-sec" min="0" max="59" value="0"></label>
            </div>
          </div>
          <div class="tz-row tz-simple">
            <span id="tz-local-hint" class="tz-local-hint"></span>
            <button type="button" id="tz-toggle" class="btn-link">${this.tx.change}</button>
          </div>
          <div id="tz-panel" class="tz-panel" hidden>
            <p class="hint tz-panel-label">${this.tx.tzLabel} <span id="tz-display" class="tz-current"></span></p>
            <div class="tz-modes">
              <button type="button" data-tz-mode="1" class="tz-mode-btn active">UTC</button>
              <button type="button" data-tz-mode="2" class="tz-mode-btn">GMT</button>
              <button type="button" data-tz-mode="3" class="tz-mode-btn">${this.tx.tzNone}</button>
              <button type="button" data-tz-mode="4" class="tz-mode-btn">${this.tx.tzUnknown}</button>
            </div>
            <div id="tz-area-utc" class="tz-area">
              <select id="inp-tz-select" class="wide">${tzOptions}</select>
            </div>
            <div id="tz-area-gmt" class="tz-area" hidden>
              <div class="gmt-grid">
                <label>${this.tx.hour}<input type="number" id="inp-gmt-h" value="0"></label>
                <label>${this.tx.min}<input type="number" id="inp-gmt-min" min="0" max="59" value="0"></label>
                <label>${this.tx.sec}<input type="number" id="inp-gmt-s" min="0" max="59" value="0"></label>
              </div>
            </div>
          </div>
        </section>

        <section class="counter-wrap">
          <p id="text1" class="counter-text"></p>
          <ul id="metrics" class="metrics"></ul>
          <div class="counter-area">
            <div class="counter-row">
              <div class="counter-canvas-wrap">
                <canvas id="counter-canvas" width="800" height="85"></canvas>
              </div>
              <div id="sub-text" class="sub-text"></div>
            </div>
          </div>
          <div id="progress-bar" class="progress-bar" hidden>
            <div id="progress-fill" class="progress-fill"></div>
          </div>
          <p id="progress-label" class="progress-label"></p>
          <p id="text2" class="counter-text"></p>
        </section>

        <section class="section-life card">
          <p id="current-metric" class="current-metric"></p>
          <table id="life-table" class="life-table"><thead><tr><th>${this.tx.dateHeader}</th><th></th><th>${this.tx.search}</th></tr></thead><tbody></tbody></table>
          <div class="life-nav">
            <button type="button" id="life-prev">‹</button>
            <button type="button" id="life-next">›</button>
          </div>
        </section>

        <section class="section-settings card">
          <button type="button" id="toggle-settings" class="btn-link">${this.tx.adjustAndGetLink}</button>
          <div class="settings-pad" hidden>
            <h2>${this.tx.settingsHeader}</h2>
            <p>${this.tx.restMode}
              <button type="button" id="rest-toggle" class="btn-ghost">${this.tx.restDecimal}</button>
            </p>
            <label class="settings-field">${this.tx.topText}<input type="text" id="inp-text1" class="wide" maxlength="${MAX_SHARE_TEXT}"></label>
            <label class="settings-field">${this.tx.bottomText}<input type="text" id="inp-text2" class="wide" maxlength="${MAX_SHARE_TEXT}"></label>
            <p class="hint text-limit-hint" id="text-limit-hint">${this.tx.textLimitHint.replace('{n}', String(MAX_SHARE_TEXT))}</p>
            <h2>${this.tx.linkHeader}</h2>
            <fieldset class="share-mode">
              <legend>${this.tx.shareWhenLabel}</legend>
              <label class="share-option">
                <input type="radio" name="share-mode" value="instant" checked>
                <span>${this.tx.shareInstant}</span>
              </label>
              <p class="hint">${this.tx.shareInstantHint}</p>
              <label class="share-option">
                <input type="radio" name="share-mode" value="local">
                <span id="share-local-label"></span>
              </label>
              <p class="hint">${this.tx.shareLocalHint}</p>
              <div id="share-annual-wrap" hidden>
                <label class="share-annual">
                  <input type="checkbox" id="share-annual">
                  ${this.tx.shareAnnual}
                </label>
                <p class="hint">${this.tx.shareOnceHint}</p>
              </div>
            </fieldset>
            <p id="share-preview" class="share-preview" hidden></p>
            <label class="settings-field">${this.tx.counterTheme}
              <select id="theme-select" class="wide">
                <option value="default">${this.tx.themeDefault}</option>
                <option value="cosmo">${this.tx.themeCosmo}</option>
                <option value="fisic">${this.tx.themePhysics}</option>
                <option value="lit">${this.tx.themeLit}</option>
              </select>
            </label>
            <div class="link-row">
              <input type="text" id="share-link" class="wide" readonly>
              <button type="button" id="copy-link">${this.tx.copyLink}</button>
              <button type="button" id="copy-og-link">${this.tx.copyTelegram}</button>
              <button type="button" id="add-calendar">${this.tx.addToCalendar}</button>
              <button type="button" id="show-qr">${this.tx.showQr}</button>
            </div>
            <div id="qr-modal" class="qr-modal" hidden>
              <p><strong>${this.tx.qrTitle}</strong></p>
              <canvas id="qr-canvas"></canvas>
              <button type="button" id="qr-close" class="btn-ghost">×</button>
            </div>
            <p class="hint">${this.tx.linkHint}</p>
            <h2>${this.tx.myCounters}</h2>
            <div id="saved-counters-list"></div>
            <button type="button" id="save-counter" class="btn-ghost">${this.tx.myCounters}</button>
          </div>
        </section>

        <footer class="section-footer">
          <section id="popular-counters" class="popular-counters card" hidden></section>
          <p>${this.tx.footer}</p>
        </footer>
      </div>
    `;
    this.bind();
    this.drawBg();
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
  }
}
