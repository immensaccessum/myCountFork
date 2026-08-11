import { CounterHelper } from './lib/counter-helper';
import { DigitCounter } from './lib/digit-counter';
import { McDate } from './lib/mc-date';
import {
  type CounterEvent,
  loadEventCatalog,
  findEventById,
  findEventIndex,
  eventAtIndex,
  defaultUpcomingEventIndex,
  getStoredCountry,
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
import { resolveDynamicRule } from './lib/dynamic-date';
import { numToStr, tn } from './lib/utils';
import type { LocaleStrings } from './i18n/types';
import {
  TZ_OFFSETS_MIN,
  browserTzOffsetMin,
  defaultTzPacked,
  formatUtcOffset,
} from './lib/tz';
import { getLocale } from './i18n';
import { fetchLandingEvent, fetchPopularLandings } from './lib/landing-pages';
import { buildIcsFile, downloadIcs, icsFilename, isAnnualFromSpec } from './lib/ics';
import { deleteSavedCounter, loadSavedCounters, saveCounter, type SavedCounter } from './lib/saved-counters';
import { daysBetween, monthsApprox, parseYmd, ymdLocal } from './lib/days-between';
import {
  cellFromPoint,
  cellStartDate,
  cellsLived,
  colsForUnit,
  lifeMilestones,
  parseLifeGridUnit,
  totalCells,
  type LifeGridUnit,
  type LifeMilestone,
} from './lib/life-grid';
import { ALLOWED_YEARS, loadLifeGridPrefs, saveLifeGridPrefs } from './lib/life-grid-store';

const DEFAULT_BORN = 1332104400000;

type AppView = 'events' | 'new' | 'counter' | 'between' | 'lifegrid';

export class App {
  private tx: LocaleStrings;
  private lang: 'ru' | 'en';
  private root: HTMLElement;
  private helper!: CounterHelper;
  private counter!: DigitCounter;
  private wm: ViewMode = 3;
  private betweenMode = false;
  private lifeGridMode = false;
  private lifeGridFullscreen = false;
  private lifeGridUnit: LifeGridUnit = 'weeks';
  private lifeGridCellW = 0;
  private lifeGridCellH = 0;
  private lifeGridGap = 1;
  private lifeGridCols = 52;
  private lifeGridRows = 80;
  private lifeGridSelected: number | null = null;
  private lifeGridMarks = new Map<number, LifeMilestone>();
  private text1 = '';
  private text2 = '';
  private eventWid = 1;
  private eventCatalog: CounterEvent[] = [];
  private currentEventEid = '';
  private settingsOpen = false;
  private eventOffset = 0;
  private raf = 0;
  private tzPanelOpen = false;
  private shareMode: ShareMode = 'instant';
  private localDateActive = false;
  private localSpec: LocalDateSpec | null = null;
  private lastCm = 0;
  private topTextEdited = false;
  private popularLandings: { slug: string; label: string; href: string }[] = [];
  private savedCounters: SavedCounter[] = loadSavedCounters();
  private landingH1 = '';
  private landingIntro = '';
  private dateInputTimer = 0;
  private navResizeObserver: ResizeObserver | null = null;
  private navLayoutTimer = 0;

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
    window.addEventListener('popstate', () => this.restoreFromLocation());
  }

  private initTheme(): void {
    const stored =
      localStorage.getItem('mc_theme') ||
      (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = stored;
  }

  private toggleTheme(): void {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('mc_theme', next);
    this.drawBg();
    this.applyCounterTheme();
    if (this.lifeGridMode) this.drawLifeGrid();
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
    if (url.rm) this.helper.restMode = 1;
    const canvas = this.root.querySelector<HTMLCanvasElement>('#counter-canvas')!;
    this.counter = new DigitCounter(canvas, {
      w: 50,
      h: 64,
      tex: this.getDigitSprite(),
      spac: 50,
    });
    this.applyCounterTheme();

    const viewParam = new URLSearchParams(location.search).get('view');
    if (viewParam === 'lifegrid' || viewParam === 'between') {
      this.restoreToolView(viewParam);
      void this.loadPopularLandings();
      this.renderSavedCounters();
      return;
    }

    if (this.wm === 1) {
      this.applyViewMode();
      void this.bootstrapEvents(url);
    } else if (preset?.kind === 'tool' && !url.t && !url.lt && !url.eid) {
      this.applyViewMode();
      void this.bootstrapToolLanding(preset.mode).then(() => {
        this.syncShareModeUI();
        this.refreshUI();
      });
    } else if (preset?.kind === 'dynamic' && preset.rule && preset.eventId && !url.t && !url.lt) {
      this.applyViewMode();
      this.applyDynamicLanding(preset.rule, preset.eventId);
      this.syncShareModeUI();
      this.refreshUI();
    } else {
      const eventId = url.eid || preset?.eventId;
      if (eventId) {
        this.applyViewMode();
        void this.applyLandingEvent(eventId).then(() => {
          if (url.lt && url.local) {
            this.syncFormFromLocalSpec(url.local);
          } else if (preset?.kind === 'dynamic' && preset.rule) {
            this.applyDynamicLanding(preset.rule, eventId);
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
      } else if (this.shouldBootstrapDefaultDate(url, preset?.eventId)) {
        this.applyViewMode();
        void this.bootstrapDefaultDate().then(() => {
          this.syncShareModeUI();
          this.refreshUI();
        });
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
    let ev = await fetchLandingEvent(eventId, this.lang);
    if (!ev) {
      const slug = location.pathname.match(/\/(?:do|until)\/([^/]+)\/?$/)?.[1];
      if (slug) ev = await fetchLandingEvent(slug, this.lang);
    }
    if (!ev) return;
    this.eventOffset = 0;
    this.currentEventEid = ev.id;
    this.text1 = '';
    this.topTextEdited = false;
    if (!this.landingH1) {
      this.landingH1 = this.lang === 'ru' ? `Сколько дней до ${ev.name.ru}?` : `How many days until ${ev.name.en}?`;
      this.landingIntro = ev.desc[this.lang];
      this.applyLandingIntro();
    }
    if (ev.kind === 'dynamic' && ev.rule) {
      this.applyDynamicLanding(ev.rule, ev.id);
      return;
    }
    this.helper.ent = 4;
    this.helper.setBornTime(ev.t, ev.tz, 1, 0, 0, this.tx);
    this.syncTzFormFromHelper();
    this.syncFormFromBorn(ev.t);
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
    if (section) (section as HTMLElement).hidden = !this.landingH1;
  }

  /** Tool landings: open the editor with a sensible default date. */
  private async bootstrapToolLanding(mode?: string): Promise<void> {
    this.currentEventEid = '';
    this.eventOffset = 0;
    this.shareMode = 'instant';
    this.localDateActive = false;
    this.localSpec = null;
    this.applyLandingIntro();

    if (mode === 'since') {
      const off = browserTzOffsetMin();
      const now = new Date();
      // Jan 1 of the current local year at 00:00 — counter shows «how much has passed».
      const localMidnight = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0).getTime();
      this.helper.ent = 4;
      this.helper.setBornTime(localMidnight, off * 60, 1, 0, 0, this.tx);
      this.helper.format = 4; // days
      this.syncTzFormFromHelper();
      this.syncFormFromBorn(localMidnight);
      return;
    }

    await this.bootstrapDefaultDate();
  }

  /** Dynamic landings: recompute the rule in the visitor's timezone. */
  private applyDynamicLanding(rule: string, eventId: string): void {
    if (!rule) return;
    const off = browserTzOffsetMin();
    const t = resolveDynamicRule(rule, Date.now(), off);
    this.eventOffset = 0;
    this.currentEventEid = eventId;
    this.shareMode = 'instant';
    this.localDateActive = false;
    this.localSpec = null;
    this.helper.ent = 4;
    this.helper.setBornTime(t, off * 60, 1, 0, 0, this.tx);
    this.syncTzFormFromHelper();
    this.syncFormFromBorn(t);
    this.applyLandingIntro();
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
    (el as HTMLElement).hidden = this.betweenMode || this.lifeGridMode || this.wm !== 3;
  }

  private shouldBootstrapDefaultDate(
    url: ReturnType<typeof parseUrlState>,
    presetEventId?: string,
  ): boolean {
    return this.wm === 3 && !url.t && !url.lt && !url.eid && !presetEventId;
  }

  private async bootstrapDefaultDate(): Promise<void> {
    try {
      const cc = getStoredCountry(this.lang);
      this.eventCatalog = await loadEventCatalog(cc);
      const wid = defaultUpcomingEventIndex(this.eventCatalog);
      this.eventWid = wid;
      const ev = eventAtIndex(this.eventCatalog, wid);
      this.text1 = '';
      this.text2 = '';
      this.topTextEdited = false;
      this.shareMode = 'instant';
      this.localDateActive = false;
      this.localSpec = null;
      // Предустановка — только префилл формы, не «счётчик события»: дата ниже
      // интерпретируется в поясе посетителя и уже не совпадает с датой события.
      this.currentEventEid = '';
      this.eventOffset = 0;
      // Предустановка — календарная дата: берём стеночное время события (полночь МСК
      // для «начала сентября» и т.п.) и интерпретируем его в поясе посетителя.
      const localSec = browserTzOffsetMin() * 60;
      const t = ev.t + (ev.tz - localSec) * 1000;
      this.helper.ent = 4;
      this.helper.setBornTime(t, localSec, 1, 0, 0, this.tx);
      this.syncTzFormFromHelper();
      this.syncFormFromBorn(t);
    } catch {
      this.eventCatalog = [];
    }
  }

  private async bootstrapEvents(url: ReturnType<typeof parseUrlState>): Promise<void> {
    this.setEventsLoading(true);

    try {
      this.eventCatalog = await loadEventCatalog(EVENT_COUNTRY);
      const wid = url.eid
        ? findEventIndex(this.eventCatalog, url.eid)
        : defaultUpcomingEventIndex(this.eventCatalog);
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
    this.eventOffset = 0;
    this.eventWid = wid;
    this.currentEventEid = ev.id;
    this.text2 = '';
    this.shareMode = 'instant';
    this.localDateActive = false;
    this.localSpec = null;
    this.helper.ent = 4;
    this.helper.setBornTime(ev.t, ev.tz, 1, 0, 0, this.tx);
    this.syncTzFormFromHelper();
    this.syncFormFromBorn(ev.t);
    this.renderEventsPanel(ev, wid);
  }

  private renderEventsPanel(ev: CounterEvent, wid: number): void {
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

  private syncEventsPanelFromCatalog(): void {
    if (!this.eventCatalog.length) return;
    const ev = eventAtIndex(this.eventCatalog, this.eventWid);
    this.currentEventEid = ev.id;
    this.renderEventsPanel(ev, this.eventWid);
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
    const min = parseInt(
      (this.root.querySelector<HTMLSelectElement>('#inp-tz-select')?.value || '0'),
      10,
    );
    return { tz: min * 60, tzen: 1, isGMT: 0, tzunk: 0 };
  }

  private syncTzFormFromHelper(): void {
    // Легаси-режимы старых ссылок (GMT со смещением, «не существует», «неизвестен»)
    // отображаются движком как раньше; форма же всегда предлагает пояс из списка.
    const sel = this.root.querySelector<HTMLSelectElement>('#inp-tz-select');
    if (sel) {
      const min = String(Math.round(this.helper.tz / 60));
      const cur = String(browserTzOffsetMin());
      if (min === cur) {
        const browserOpt = sel.querySelector<HTMLOptionElement>('option[data-browser="1"]');
        if (browserOpt) browserOpt.selected = true;
      } else {
        sel.value = min;
      }
    }
    this.updateTzToggleLabel();
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
    if (this.helper.tzunk || !this.helper.tzen || this.helper.isGMT) return false;
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

  /** «31 февраля» не должно молча перетекать в март: ограничиваем день длиной месяца. */
  private clampDayField(): void {
    const yInp = this.root.querySelector<HTMLInputElement>('#inp-year');
    const mInp = this.root.querySelector<HTMLSelectElement>('#inp-month');
    const dInp = this.root.querySelector<HTMLInputElement>('#inp-day');
    if (!dInp) return;
    const y = parseInt(yInp?.value || '2000', 10);
    const m = parseInt(mInp?.value || '0', 10);
    const dt = new Date(2000, 0, 1);
    dt.setFullYear(Number.isFinite(y) ? y : 2000, m + 1, 0);
    const dim = dt.getDate() || 31;
    dInp.max = String(dim);
    const d = parseInt(dInp.value || '1', 10);
    if (Number.isFinite(d) && d > dim) dInp.value = String(dim);
    else if (Number.isFinite(d) && d < 1) dInp.value = '1';
  }

  private bornFromForm(): void {
    this.eventOffset = 0;
    // Ручное изменение даты отвязывает счётчик от события каталога/лендинга:
    // иначе eid в ссылке перезапишет пользовательскую дату у получателя.
    this.currentEventEid = '';
    this.clampDayField();
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
    document.body.dataset.mode = this.lifeGridMode
      ? 'lifegrid'
      : this.betweenMode
        ? 'between'
        : String(this.wm);
    const show = (sel: string, on: boolean) => {
      const el = this.root.querySelector(sel);
      if (el) (el as HTMLElement).hidden = !on;
    };
    const main = !this.betweenMode && !this.lifeGridMode;
    show('.section-between', this.betweenMode);
    show('.section-lifegrid', this.lifeGridMode);
    show('.section-editor', main && this.wm === 3);
    show('.section-events', main && this.wm === 1);
    show('.section-life', main && this.wm === 3);
    show('.section-settings', main && this.wm !== 4);
    show('.section-header', true);
    show('.section-intro', main && this.wm === 3 && !this.landingH1);
    show('.section-footer', main && this.wm !== 4);
    show('.counter-wrap', main);
    show('#popular-counters', main && this.wm === 3 && this.popularLandings.length > 0);
    this.root.querySelector('#nav-events')?.classList.toggle('nav-active', main && this.wm === 1);
    this.root.querySelector('#nav-new')?.classList.toggle('nav-active', main && this.wm === 3);
    this.root.querySelector('#nav-between')?.classList.toggle('nav-active', this.betweenMode);
    this.root.querySelector('#nav-lifegrid')?.classList.toggle('nav-active', this.lifeGridMode);
    this.updateNavMenuLabel();
    this.scheduleNavCompact();
    if (main) this.applyLandingIntro();
    else {
      const intro = this.root.querySelector('.section-landing-intro');
      if (intro) (intro as HTMLElement).hidden = true;
    }
    if (this.lifeGridMode) {
      requestAnimationFrame(() => this.drawLifeGrid());
    }
  }

  private activeNavLabel(): string {
    if (this.lifeGridMode) return this.tx.navLifeGrid;
    if (this.betweenMode) return this.tx.navBetween;
    if (this.wm === 1) return this.tx.navEvents;
    if (this.wm === 3) return this.tx.navNew;
    return this.tx.navMenu;
  }

  private updateBetweenResult(): void {
    const fromEl = this.root.querySelector<HTMLInputElement>('#bd-from');
    const toEl = this.root.querySelector<HTMLInputElement>('#bd-to');
    const resultEl = this.root.querySelector<HTMLElement>('#bd-result');
    const openEl = this.root.querySelector<HTMLAnchorElement>('#bd-open');
    if (!fromEl || !toEl || !resultEl || !openEl) return;

    if (!fromEl.value || !toEl.value) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const jan1 = new Date(today.getFullYear(), 0, 1);
      if (!fromEl.value) fromEl.value = ymdLocal(jan1);
      if (!toEl.value) toEl.value = ymdLocal(today);
    }

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
    const loc = this.lang === 'ru' ? 'ru-RU' : 'en-US';
    const fmt = (n: number) => Math.abs(n).toLocaleString(loc);
    resultEl.hidden = false;
    resultEl.innerHTML = `
      <strong>${this.tx.betweenResult}</strong>
      ${sign}${fmt(abs)} ${this.tx.betweenDays}
      ${weeks ? `· ${sign}${weeks} ${this.tx.betweenWeeks}${remDays ? ` ${this.tx.betweenAnd} ${remDays} ${this.tx.betweenDays}` : ''}` : ''}
      ${months ? `· ${sign}${months} ${this.tx.betweenMonths}` : ''}
    `;
    const target = days >= 0 ? b : a;
    openEl.href = `${langBasePath(this.lang)}?wm=4&fid=4&t=${target.getTime()}`;
    openEl.hidden = false;
  }

  private getLifeGridBirth(): Date | null {
    const el = this.root.querySelector<HTMLInputElement>('#lg-birth');
    if (!el?.value) return null;
    return parseYmd(el.value);
  }

  private getLifeGridYears(): number {
    const el = this.root.querySelector<HTMLSelectElement>('#lg-years');
    const y = Number(el?.value || 80);
    return ALLOWED_YEARS.includes(y as (typeof ALLOWED_YEARS)[number]) ? y : 80;
  }

  private persistLifeGridPrefs(): void {
    const el = this.root.querySelector<HTMLInputElement>('#lg-birth');
    if (!el?.value) return;
    saveLifeGridPrefs({
      birth: el.value,
      years: this.getLifeGridYears(),
      unit: this.lifeGridUnit,
    });
  }

  private syncLifeGridFormFromStore(): void {
    const prefs = loadLifeGridPrefs();
    const birthEl = this.root.querySelector<HTMLInputElement>('#lg-birth');
    const yearsEl = this.root.querySelector<HTMLSelectElement>('#lg-years');
    if (birthEl && prefs?.birth) birthEl.value = prefs.birth;
    if (yearsEl) yearsEl.value = String(prefs?.years || 80);
    if (prefs?.unit) this.lifeGridUnit = prefs.unit;
    this.syncLifeGridUnitTabs();
  }

  private syncLifeGridUnitTabs(): void {
    this.root.querySelectorAll<HTMLButtonElement>('[data-lg-unit]').forEach((btn) => {
      const on = btn.dataset.lgUnit === this.lifeGridUnit;
      btn.classList.toggle('lifegrid-unit--active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const daysHint = this.root.querySelector<HTMLElement>('#lifegrid-days-hint');
    if (daysHint) daysHint.hidden = this.lifeGridUnit !== 'days';
  }

  private setLifeGridUnit(unit: LifeGridUnit, pushUrl = true): void {
    if (this.lifeGridUnit === unit) return;
    this.lifeGridUnit = unit;
    this.lifeGridSelected = null;
    const info = this.root.querySelector<HTMLElement>('#lifegrid-cell-info');
    if (info) {
      info.hidden = true;
      info.classList.remove('lifegrid-cell-info--top');
    }
    this.syncLifeGridUnitTabs();
    this.persistLifeGridPrefs();
    this.drawLifeGrid();
    if (pushUrl && this.lifeGridMode) this.writeAddressBar('push');
    else if (this.lifeGridMode) this.writeAddressBar('replace');
  }

  private lifeGridUnitLabel(): string {
    if (this.lifeGridUnit === 'months') return this.tx.lifeGridUnitMonths;
    if (this.lifeGridUnit === 'days') return this.tx.lifeGridUnitDays;
    return this.tx.lifeGridUnitWeeks;
  }

  private lifeGridCellLabelTpl(): string {
    if (this.lifeGridUnit === 'months') return this.tx.lifeGridMonthOf;
    if (this.lifeGridUnit === 'days') return this.tx.lifeGridDayOf;
    return this.tx.lifeGridWeekOf;
  }

  private updateLifeGridSummary(): void {
    const summary = this.root.querySelector('#lifegrid-summary');
    if (!summary) return;
    const birth = this.getLifeGridBirth();
    if (!birth) {
      summary.textContent = '';
      return;
    }
    const years = this.getLifeGridYears();
    const total = totalCells(this.lifeGridUnit, years);
    const lived = Math.min(cellsLived(this.lifeGridUnit, birth), total);
    const pct = total ? Math.min(100, Math.round((lived / total) * 100)) : 0;
    const loc = this.lang === 'ru' ? 'ru-RU' : 'en-US';
    summary.textContent = this.tx.lifeGridSummary
      .replace('{lived}', lived.toLocaleString(loc))
      .replace('{total}', total.toLocaleString(loc))
      .replace('{unit}', this.lifeGridUnitLabel())
      .replace('{pct}', String(pct));
  }

  private showLifeGridCell(index: number | null, preferTop = false): void {
    const info = this.root.querySelector<HTMLElement>('#lifegrid-cell-info');
    const label = this.root.querySelector('#lifegrid-cell-label');
    const openEl = this.root.querySelector<HTMLAnchorElement>('#lifegrid-open');
    if (!info || !label || !openEl) return;

    // Повторный клик по той же клетке — скрыть плашку.
    if (index != null && index === this.lifeGridSelected && !info.hidden) {
      this.lifeGridSelected = null;
      info.hidden = true;
      info.classList.remove('lifegrid-cell-info--top');
      this.drawLifeGrid();
      return;
    }

    this.lifeGridSelected = index;
    const birth = this.getLifeGridBirth();
    if (index == null || !birth) {
      info.hidden = true;
      info.classList.remove('lifegrid-cell-info--top');
      this.drawLifeGrid();
      return;
    }
    const start = cellStartDate(this.lifeGridUnit, birth, index);
    const loc = this.lang === 'ru' ? 'ru-RU' : 'en-US';
    const dateStr = start.toLocaleDateString(loc, {
      year: 'numeric',
      month: 'long',
      day: this.lifeGridUnit === 'months' ? undefined : 'numeric',
    });
    label.textContent = this.lifeGridCellLabelTpl().replace('{date}', dateStr);
    const mark = this.lifeGridMarks.get(index);
    const markEl = this.root.querySelector('#lifegrid-cell-mark');
    if (markEl) {
      if (mark) {
        const tpl = mark.kind === 'decade' ? this.tx.lifeGridMarkDecade : this.tx.lifeGridMarkBirthday;
        markEl.textContent = tpl.replace('{age}', String(mark.age));
        (markEl as HTMLElement).hidden = false;
      } else {
        markEl.textContent = '';
        (markEl as HTMLElement).hidden = true;
      }
    }
    openEl.href = `${langBasePath(this.lang)}?wm=4&fid=4&t=${start.getTime()}`;
    info.classList.toggle('lifegrid-cell-info--top', preferTop);
    info.hidden = false;
    this.drawLifeGrid();
  }

  private setLifeGridFullscreen(on: boolean): void {
    this.lifeGridFullscreen = on;
    document.body.classList.toggle('lifegrid-fullscreen', on);
    const exitBtn = this.root.querySelector<HTMLButtonElement>('#lifegrid-fs-exit');
    if (exitBtn) exitBtn.hidden = !on;
    const enterBtn = this.root.querySelector<HTMLButtonElement>('#lifegrid-fs-enter');
    if (enterBtn) enterBtn.hidden = on;
    if (!on && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
    requestAnimationFrame(() => this.drawLifeGrid());
  }

  private drawLifeGrid(): void {
    const canvas = this.root.querySelector<HTMLCanvasElement>('#lifegrid-canvas');
    const wrap = this.root.querySelector<HTMLElement>('.lifegrid-canvas-wrap');
    if (!canvas || !wrap || !this.lifeGridMode) return;

    const birth = this.getLifeGridBirth();
    const years = this.getLifeGridYears();
    const rows = Math.max(1, Math.floor(years));
    const cols = colsForUnit(this.lifeGridUnit);
    const total = totalCells(this.lifeGridUnit, years);
    const lived = birth ? Math.min(cellsLived(this.lifeGridUnit, birth), total) : 0;
    this.lifeGridCols = cols;
    this.lifeGridRows = rows;

    const fs = this.lifeGridFullscreen;
    const cssW = Math.max(fs ? window.innerWidth : wrap.clientWidth, 1);
    const cssH = fs ? Math.max(window.innerHeight, 1) : 0;
    // В режиме дней клетки мелкие — гэп только если хватает места.
    const gap =
      fs || this.lifeGridUnit === 'days'
        ? 0
        : cssW < 400
          ? 1
          : 2;

    let cellW: number;
    let cellH: number;
    let width: number;
    let height: number;

    if (fs) {
      cellW = cssW / cols;
      cellH = cssH / rows;
      width = cssW;
      height = cssH;
    } else {
      cellW = Math.max(this.lifeGridUnit === 'days' ? 1 : 2, (cssW - gap * (cols - 1)) / cols);
      cellH = cellW;
      width = cssW;
      height = rows * cellH + (rows - 1) * gap;
    }

    this.lifeGridCellW = cellW;
    this.lifeGridCellH = cellH;
    this.lifeGridGap = gap;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const isDark = document.documentElement.dataset.theme === 'dark';
    const livedFill = isDark ? '#6a9fff' : '#2a5db0';
    const futureStroke = isDark ? '#444' : '#ccc';
    const futureFill = isDark ? '#1a1a22' : '#f0f0f0';
    const currentFill = isDark ? '#ffcc66' : '#e6a817';
    const selectedStroke = isDark ? '#fff' : '#101010';
    const birthdayDot = isDark ? '#ffd666' : '#d48806';
    const decadeDot = isDark ? '#ff8fab' : '#c41e5c';
    const drawStroke = !fs && this.lifeGridUnit !== 'days' && cellW >= 3 && cellH >= 3;
    this.lifeGridMarks = birth ? lifeMilestones(this.lifeGridUnit, birth, years) : new Map();

    for (let i = 0; i < total; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * (cellW + gap);
      const y = row * (cellH + gap);
      const w = col === cols - 1 ? Math.max(0, width - x) : cellW;
      const h = row === rows - 1 ? Math.max(0, height - y) : cellH;
      if (i < lived) {
        ctx.fillStyle = livedFill;
        ctx.fillRect(x, y, w, h);
      } else if (i === lived && birth) {
        ctx.fillStyle = currentFill;
        ctx.fillRect(x, y, w, h);
      } else {
        ctx.fillStyle = futureFill;
        ctx.fillRect(x, y, w, h);
        if (drawStroke) {
          ctx.strokeStyle = futureStroke;
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, w - 1), Math.max(0, h - 1));
        }
      }
      const mark = this.lifeGridMarks.get(i);
      if (mark) {
        const minSide = Math.min(w, h);
        const showDot = mark.kind === 'decade' ? minSide >= 2 : minSide >= 3.5;
        if (showDot) {
          const r = Math.max(1, minSide * (mark.kind === 'decade' ? 0.28 : 0.17));
          ctx.beginPath();
          ctx.arc(x + w * 0.5, y + h * 0.5, r, 0, Math.PI * 2);
          ctx.fillStyle = mark.kind === 'decade' ? decadeDot : birthdayDot;
          ctx.fill();
        }
      }
      if (this.lifeGridSelected === i) {
        ctx.strokeStyle = selectedStroke;
        ctx.lineWidth = Math.max(1, Math.floor(Math.min(cellW, cellH) / 4));
        ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, w - 1), Math.max(0, h - 1));
      }
    }
    this.updateLifeGridSummary();
  }

  private onLifeGridCanvasClick(e: MouseEvent): void {
    const canvas = e.currentTarget as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const years = this.getLifeGridYears();
    const cols = this.lifeGridCols;
    const rows = this.lifeGridRows;
    const logicalW = this.lifeGridCellW * cols + this.lifeGridGap * Math.max(0, cols - 1);
    const logicalH = this.lifeGridCellH * rows + this.lifeGridGap * Math.max(0, rows - 1);
    const x = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * logicalW;
    const y = ((e.clientY - rect.top) / Math.max(rect.height, 1)) * logicalH;
    const index = cellFromPoint(
      x,
      y,
      this.lifeGridCellW,
      this.lifeGridCellH,
      this.lifeGridGap,
      cols,
      rows,
    );
    // Если клетка в нижней части экрана — плашку сверху, чтобы не перекрывала выбор.
    const preferTop = e.clientY > window.innerHeight * 0.55;
    this.showLifeGridCell(index, preferTop);
  }

  private updateNavMenuLabel(): void {
    const label = this.root.querySelector('#nav-menu-label');
    const nav = this.root.querySelector('#main-nav');
    const toggle = this.root.querySelector('#nav-menu-toggle');
    const compact = !!nav?.classList.contains('nav--compact');
    const icon = !!nav?.classList.contains('nav--icon');
    if (label) label.textContent = compact && !icon ? this.activeNavLabel() : this.tx.navMenu;
    if (toggle) {
      const aria = !compact || icon ? this.tx.navMenu : this.activeNavLabel();
      toggle.setAttribute('aria-label', aria);
    }
  }

  private setNavOpen(open: boolean): void {
    const nav = this.root.querySelector('#main-nav');
    const toggle = this.root.querySelector('#nav-menu-toggle');
    if (nav) nav.classList.toggle('nav--open', open);
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  /** Переносит основные вкладки в выпадающее меню или обратно в ряд. */
  private placeNavPrimary(compact: boolean): void {
    const primary = this.root.querySelector('#nav-primary');
    const items = this.root.querySelector('#nav-items');
    const events = this.root.querySelector('#nav-events');
    const neu = this.root.querySelector('#nav-new');
    if (!primary || !items || !events || !neu) return;
    if (compact) {
      items.prepend(neu);
      items.prepend(events);
    } else {
      primary.append(events);
      primary.append(neu);
    }
  }

  /** Ширина flex-ряда со стилями `.nav a` (клон обязан быть внутри `.nav`). */
  private measureFlexRowWidth(row: HTMLElement): number {
    const wrap = document.createElement('div');
    wrap.className = 'nav';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.cssText =
      'position:absolute;left:-99999px;top:0;display:flex;visibility:hidden;pointer-events:none;';
    const probe = row.cloneNode(true) as HTMLElement;
    probe.className = row.className || 'nav-primary';
    probe.style.cssText = 'display:flex;flex-wrap:nowrap;gap:0.75rem;width:max-content;';
    wrap.appendChild(probe);
    document.body.appendChild(wrap);
    const width = Math.ceil(probe.getBoundingClientRect().width);
    wrap.remove();
    return width;
  }

  private syncNavCompact(): void {
    const header = this.root.querySelector<HTMLElement>('.section-header');
    const nav = this.root.querySelector<HTMLElement>('#main-nav');
    const primary = this.root.querySelector<HTMLElement>('#nav-primary');
    const toggle = this.root.querySelector<HTMLButtonElement>('#nav-menu-toggle');
    const logo = this.root.querySelector<HTMLElement>('.logo-link');
    if (!header || !nav || !primary || !toggle || !logo) return;

    const styles = getComputedStyle(header);
    const headerGap = parseFloat(styles.columnGap || styles.gap) || 0;
    const navGap = parseFloat(getComputedStyle(nav).columnGap || getComputedStyle(nav).gap) || 12;
    const logoW = Math.ceil(logo.getBoundingClientRect().width);
    const safety = 12;
    const available = Math.floor(header.clientWidth - logoW - headerGap - safety);

    // Для замера ряда вкладок временно возвращаем их на место.
    const wasCompact = nav.classList.contains('nav--compact');
    this.setNavOpen(false);
    this.placeNavPrimary(false);
    nav.classList.remove('nav--compact', 'nav--icon');
    toggle.hidden = false;

    const primaryW = this.measureFlexRowWidth(primary);
    const burgerW = Math.ceil(toggle.getBoundingClientRect().width) || 40;
    const neededWide = primaryW + navGap + burgerW;
    let compact = neededWide > available;

    if (!compact && !wasCompact) {
      const headerRight = header.getBoundingClientRect().right;
      const navRight = nav.getBoundingClientRect().right;
      compact = navRight > headerRight + 1;
    }

    if (compact) {
      nav.classList.add('nav--compact');
      nav.classList.remove('nav--icon');
      this.placeNavPrimary(true);
      this.updateNavMenuLabel();
      const toggleW = Math.ceil(toggle.getBoundingClientRect().width);
      if (toggleW > available) {
        nav.classList.add('nav--icon');
        toggle.setAttribute('aria-label', this.tx.navMenu);
      }
    } else {
      this.placeNavPrimary(false);
      nav.classList.remove('nav--compact', 'nav--icon');
      this.updateNavMenuLabel();
    }
  }

  private scheduleNavCompact(): void {
    clearTimeout(this.navLayoutTimer);
    this.navLayoutTimer = window.setTimeout(() => {
      requestAnimationFrame(() => this.syncNavCompact());
    }, 0);
  }

  private bindNavMenu(): void {
    const toggle = this.root.querySelector('#nav-menu-toggle');
    const nav = this.root.querySelector('#main-nav');
    const header = this.root.querySelector('.section-header');
    toggle?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.setNavOpen(!nav?.classList.contains('nav--open'));
    });
    this.root.querySelector('#nav-items')?.addEventListener('click', () => {
      this.setNavOpen(false);
    });
    document.addEventListener('click', (e) => {
      if (!nav?.classList.contains('nav--open')) return;
      if (nav.contains(e.target as Node)) return;
      this.setNavOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.setNavOpen(false);
    });
    if (typeof ResizeObserver !== 'undefined' && header) {
      this.navResizeObserver = new ResizeObserver(() => this.scheduleNavCompact());
      this.navResizeObserver.observe(header);
    }
    window.addEventListener('resize', () => this.scheduleNavCompact());
    requestAnimationFrame(() => this.syncNavCompact());
  }

  private appShareUrl(wm: ViewMode = 4): string {
    const t1 = (this.root.querySelector<HTMLInputElement>('#inp-text1')?.value || this.text1).trim();
    const t2 = (this.root.querySelector<HTMLInputElement>('#inp-text2')?.value || this.text2).trim();
    const fromCatalog = !!this.currentEventEid;
    const shareMode = fromCatalog ? 'instant' : this.shareMode;
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
      shareMode,
      local: shareMode === 'local' ? this.readFormLocalSpec() : undefined,
      restMode: this.helper.restMode,
    });
  }

  private shareUrl(): string {
    return this.appShareUrl(4);
  }

  private ogTitleDesc(): { title: string; desc: string } {
    const ev = findEventById(this.eventCatalog, this.currentEventEid);

    if (ev) {
      return { title: ev.name[this.lang], desc: this.helper.buildDateText(this.tx) };
    }

    const dateText = this.suggestedTopText();
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
      this.syncEventsPanelFromCatalog();
    } else if (this.wm === 4) {
      const custom1 = this.text1.trim();
      const custom2 = this.text2.trim();
      if (t1El) t1El.textContent = custom1 || dateText;
      if (t2El) t2El.textContent = custom1 ? custom2 || dateText : custom2;
    } else {
      if (t1El) t1El.textContent = custom1?.value.trim() || dateText;
      if (t2El) t2El.textContent = custom2?.value || '';
      this.updateTopTextHint();
    }

    const link = this.root.querySelector<HTMLInputElement>('#share-link');
    if (link) link.value = this.shareUrl();

    const tzHint = this.root.querySelector('#tz-local-hint');
    if (tzHint) {
      const browserMin = browserTzOffsetMin();
      if (this.localDateActive || (this.helper.tzen && !this.helper.tzunk && this.helper.tz === browserMin * 60)) {
        tzHint.textContent = `${this.tx.tzLocalHint} ${formatUtcOffset(browserMin)}`;
      } else if (!this.helper.tzen || this.helper.tzunk) {
        tzHint.textContent = `${this.tx.tzLabel} ${this.tx.tzNotSet}`;
      } else {
        tzHint.textContent = `${this.tx.tzLabel} ${formatUtcOffset(this.helper.tz / 60)}`;
      }
    }

    const tzEl = this.root.querySelector('#tz-display');
    if (tzEl) tzEl.textContent = this.helper.bs.fknttz || this.helper.bs.knttz || '—';

    this.renderLifeTable();
    this.renderMetrics();
    this.updateShareLocalLabel();
    this.refreshSharePreview();
    this.syncAddressBar();
  }

  /** Адресная строка: живые правки — replace; смена экрана — push (см. navigateTo). */
  private syncAddressBar(): void {
    this.writeAddressBar('replace');
  }

  private currentView(): AppView {
    if (this.lifeGridMode) return 'lifegrid';
    if (this.betweenMode) return 'between';
    if (this.wm === 1) return 'events';
    if (this.wm === 4) return 'counter';
    return 'new';
  }

  private buildViewUrl(view: AppView): string {
    const base = langBasePath(this.lang);
    if (view === 'lifegrid') {
      const q = new URLSearchParams();
      q.set('view', 'lifegrid');
      if (this.lifeGridUnit !== 'weeks') q.set('unit', this.lifeGridUnit);
      return `${base}?${q.toString()}`;
    }
    if (view === 'between') return `${base}?view=between`;
    if (view === 'events') {
      const q = new URLSearchParams();
      q.set('wm', '1');
      if (this.eventWid > 0) q.set('wid', String(this.eventWid));
      return `${base}?${q.toString()}`;
    }
    const wm = view === 'counter' ? 4 : 3;
    const q = this.appShareUrl(wm).split('?')[1] || '';
    return base + (q ? `?${q}` : '');
  }

  private writeAddressBar(mode: 'replace' | 'push'): void {
    if (location.pathname !== langBasePath(this.lang)) return;
    const next = this.buildViewUrl(this.currentView());
    if (location.pathname + location.search === next) return;
    if (mode === 'push') history.pushState({ mc: 1 }, '', next);
    else history.replaceState({ mc: 1 }, '', next);
  }

  private restoreToolView(view: 'lifegrid' | 'between'): void {
    this.lifeGridMode = view === 'lifegrid';
    this.betweenMode = view === 'between';
    if (view === 'lifegrid') {
      this.lifeGridSelected = null;
      this.syncLifeGridFormFromStore();
      const params = new URLSearchParams(location.search);
      if (params.has('unit')) {
        this.lifeGridUnit = parseLifeGridUnit(params.get('unit'));
      }
      this.syncLifeGridUnitTabs();
      this.applyViewMode();
      const info = this.root.querySelector<HTMLElement>('#lifegrid-cell-info');
      if (info) info.hidden = true;
    } else {
      this.applyViewMode();
      this.updateBetweenResult();
    }
  }

  /** Восстановить экран из текущего URL (кнопка «Назад» / «Вперёд»). */
  private restoreFromLocation(): void {
    const viewParam = new URLSearchParams(location.search).get('view');
    if (viewParam === 'lifegrid' || viewParam === 'between') {
      if (viewParam !== 'lifegrid' && this.lifeGridFullscreen) {
        this.setLifeGridFullscreen(false);
      }
      this.restoreToolView(viewParam);
      return;
    }

    if (this.lifeGridFullscreen) this.setLifeGridFullscreen(false);
    this.lifeGridMode = false;
    this.betweenMode = false;
    const url = parseUrlState(location.search);
    this.wm = url.wm;
    if (url.fid) this.helper.format = url.fid;
    if (url.rm) this.helper.restMode = 1;
    else this.helper.restMode = 0;
    if (url.t1) {
      this.text1 = url.t1;
      this.topTextEdited = true;
    }
    if (url.t2) this.text2 = url.t2;

    if (url.lt && url.local) {
      this.localDateActive = true;
      this.localSpec = url.local;
      this.shareMode = 'local';
      const off = browserTzOffsetMin();
      const born = resolveLocalBornTime(url.local, off);
      this.helper.setBornTime(born, defaultTzPacked(), 1, 0, 0, this.tx);
      this.syncFormFromLocalSpec(url.local);
    } else if (url.t != null) {
      this.localDateActive = false;
      this.shareMode = 'instant';
      const tz = url.tz ?? defaultTzPacked();
      this.helper.setBornTime(url.t, tz, 1, 0, 0, this.tx);
      this.syncTzFormFromHelper();
      this.syncFormFromBorn(url.t);
    }

    this.applyViewMode();
    if (this.wm === 1) {
      if (url.wid) this.eventWid = url.wid;
      if (!this.eventCatalog.length) void this.bootstrapEvents(url);
      else {
        this.applyEventByWid(this.eventWid);
        this.refreshUI();
      }
    } else {
      this.syncShareModeUI();
      this.refreshUI();
    }
  }

  private navigateTo(view: AppView): void {
    const prev = this.currentView();
    if (view !== 'lifegrid' && this.lifeGridFullscreen) {
      this.setLifeGridFullscreen(false);
    }
    this.lifeGridMode = view === 'lifegrid';
    this.betweenMode = view === 'between';
    if (view === 'events') this.wm = 1;
    else if (view === 'counter') this.wm = 4;
    else if (view === 'new') this.wm = 3;

    if (view === 'lifegrid') {
      this.lifeGridSelected = null;
      this.syncLifeGridFormFromStore();
      this.syncLifeGridUnitTabs();
      this.applyViewMode();
      const info = this.root.querySelector<HTMLElement>('#lifegrid-cell-info');
      if (info) info.hidden = true;
    } else if (view === 'between') {
      this.applyViewMode();
      this.updateBetweenResult();
    } else {
      this.applyViewMode();
    }

    this.writeAddressBar(prev === view ? 'replace' : 'push');
  }

  private openCounterAt(t: number): void {
    if (this.lifeGridFullscreen) this.setLifeGridFullscreen(false);
    this.localDateActive = false;
    this.shareMode = 'instant';
    const tz = defaultTzPacked();
    this.helper.setBornTime(t, tz, 1, 0, 0, this.tx);
    this.helper.format = 4;
    this.syncTzFormFromHelper();
    this.syncFormFromBorn(t);
    this.navigateTo('counter');
    this.refreshUI();
  }

  private readLifeFindValue(): number {
    const raw = this.root.querySelector<HTMLInputElement>('#life-find')?.value.trim() || '';
    if (!raw) return 0;
    const n = parseFloat(raw.replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }

  private updateLifeFindIcon(): void {
    const input = this.root.querySelector<HTMLInputElement>('#life-find');
    const icon = this.root.querySelector<HTMLImageElement>('#life-find-icon');
    if (!input || !icon) return;
    const raw = input.value.trim();
    if (!raw) {
      icon.src = '/cimg/001/i/find.png';
      input.classList.remove('life-find-input--error');
      return;
    }
    const n = this.readLifeFindValue();
    if (n > 0) {
      icon.src = '/cimg/001/i/find_ok.png';
      input.classList.remove('life-find-input--error');
    } else {
      icon.src = '/cimg/001/i/find_er.png';
      input.classList.add('life-find-input--error');
    }
  }

  private changeLifeOffset(offset: number): void {
    this.eventOffset = offset;
    this.renderLifeTable();
  }

  private renderLifeNav(eventCount: number): void {
    const nav = this.root.querySelector('.life-nav');
    if (!nav) return;
    const findVal = this.readLifeFindValue();
    (nav as HTMLElement).hidden = findVal > 0;
    if (findVal > 0) return;
    const prev = nav.querySelector<HTMLButtonElement>('#life-prev');
    const next = nav.querySelector<HTMLButtonElement>('#life-next');
    if (prev) prev.disabled = eventCount === 0 && this.eventOffset <= 0;
    if (next) next.disabled = eventCount === 0 && this.eventOffset >= 0;
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
  }

  private renderLifeTable(): void {
    const tbody = this.root.querySelector('#life-table-body');
    if (!tbody) return;
    const findVal = this.readLifeFindValue();
    const raw = this.helper.getEventArray(this.eventOffset, findVal);
    raw.pop();
    const events = raw.filter((e): e is { ev: number; em: string; es: number; efid: number } => typeof e !== 'number');
    events.sort((a: { es: number }, b: { es: number }) => a.es - b.es);
    tbody.innerHTML = '';
    for (let i = 0; i < 7; i++) {
      const tr = document.createElement('tr');
      const ev = events[i];
      if (ev) {
        if (ev.efid === this.helper.format) tr.classList.add('life-table-row--active');
        tr.classList.add('life-table-row--clickable');
        const bs = this.helper.getDateStrEx(ev.es, true, -new Date().getTimezoneOffset() * 60, 0, this.tx);
        tr.innerHTML = `<td>${bs.dm}${this.tx.dateDel}${bs.knywy}</td><td>${bs.fts}<span class="rs">${bs.rs}</span></td><td><strong>${numToStr(ev.ev)}</strong> <a href="#" data-fid="${ev.efid}">${ev.em}</a></td>`;
        tr.addEventListener('click', (e) => {
          e.preventDefault();
          this.helper.format = ev.efid;
          this.refreshUI();
        });
      } else {
        tr.innerHTML = '<td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>';
      }
      tbody.appendChild(tr);
    }
    this.renderLifeNav(events.length);
    this.updateLifeFindIcon();
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
    if (this.lifeGridMode) this.drawLifeGrid();
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
      this.navigateTo('events');
      if (!this.eventCatalog.length) void this.bootstrapEvents(parseUrlState(location.search));
      else this.refreshUI();
    });
    this.root.querySelector('#nav-new')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.navigateTo('new');
      void this.bootstrapDefaultDate().then(() => this.refreshUI());
    });
    this.root.querySelector('#nav-between')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.navigateTo('between');
    });
    this.root.querySelector('#nav-lifegrid')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.navigateTo('lifegrid');
    });
    const onLifeGridChange = () => {
      this.persistLifeGridPrefs();
      this.lifeGridSelected = null;
      const info = this.root.querySelector<HTMLElement>('#lifegrid-cell-info');
      if (info) info.hidden = true;
      this.drawLifeGrid();
    };
    this.root.querySelector('#lg-birth')?.addEventListener('change', onLifeGridChange);
    this.root.querySelector('#lg-birth')?.addEventListener('input', onLifeGridChange);
    this.root.querySelector('#lg-years')?.addEventListener('change', onLifeGridChange);
    this.root.querySelector('#lifegrid-canvas')?.addEventListener('click', (e) =>
      this.onLifeGridCanvasClick(e as MouseEvent),
    );
    this.root.querySelector('#lifegrid-fs-enter')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.setLifeGridFullscreen(true);
    });
    this.root.querySelector('#lifegrid-fs-exit')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.setLifeGridFullscreen(false);
    });
    this.root.querySelectorAll('[data-lg-unit]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const unit = parseLifeGridUnit((btn as HTMLElement).dataset.lgUnit);
        this.setLifeGridUnit(unit, true);
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.lifeGridFullscreen) {
        e.preventDefault();
        this.setLifeGridFullscreen(false);
      }
    });
    this.root.querySelector('#lifegrid-open')?.addEventListener('click', (e) => {
      e.preventDefault();
      const href = (e.currentTarget as HTMLAnchorElement).getAttribute('href');
      if (!href || href === '#') return;
      const t = parseUrlState(new URL(href, location.origin).search).t;
      if (t != null) this.openCounterAt(t);
    });
    this.root.querySelector('#bd-from')?.addEventListener('change', () => this.updateBetweenResult());
    this.root.querySelector('#bd-to')?.addEventListener('change', () => this.updateBetweenResult());
    this.root.querySelector('#bd-from')?.addEventListener('input', () => this.updateBetweenResult());
    this.root.querySelector('#bd-to')?.addEventListener('input', () => this.updateBetweenResult());
    this.root.querySelector('#bd-open')?.addEventListener('click', (e) => {
      e.preventDefault();
      const href = (e.currentTarget as HTMLAnchorElement).getAttribute('href');
      if (!href || href === '#') return;
      const t = parseUrlState(new URL(href, location.origin).search).t;
      if (t != null) this.openCounterAt(t);
    });
    this.bindNavMenu();
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
    const closeQr = () => {
      const modal = this.root.querySelector('#qr-modal');
      if (modal) (modal as HTMLElement).hidden = true;
    };
    this.root.querySelector('#qr-close')?.addEventListener('click', closeQr);
    this.root.querySelector('#qr-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeQr();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeQr();
    });
    this.root.querySelector('#save-counter')?.addEventListener('click', () => {
      this.saveCurrentCounter();
      const btn = this.root.querySelector('#save-counter');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = this.tx.savedOk;
        setTimeout(() => { btn.textContent = orig; }, 1500);
      }
    });
    this.root.querySelector<HTMLInputElement>('#share-link')?.addEventListener('focus', (e) => {
      (e.target as HTMLInputElement).select();
    });
    this.root.querySelector('#toggle-settings')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.settingsOpen = !this.settingsOpen;
      const pad = this.root.querySelector('.settings-pad');
      if (pad) (pad as HTMLElement).hidden = !this.settingsOpen;
      const btn = this.root.querySelector('#toggle-settings');
      if (btn) btn.textContent = this.settingsOpen ? this.tx.hideSettings : this.tx.adjustAndGetLink;
    });
    this.root.querySelector('#open-link')?.addEventListener('click', () => {
      const url = this.root.querySelector<HTMLInputElement>('#share-link')?.value || this.shareUrl();
      if (!url) return;
      window.open(url, '_blank', 'noopener,noreferrer');
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
      const el = this.root.querySelector(sel);
      el?.addEventListener('change', () => this.bornFromForm());
      // Live preview while typing (debounced so partial input like «20» doesn't jump around).
      el?.addEventListener('input', () => {
        clearTimeout(this.dateInputTimer);
        this.dateInputTimer = window.setTimeout(() => this.bornFromForm(), 500);
      });
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
    this.root.querySelector('#tz-toggle')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.tzPanelOpen = !this.tzPanelOpen;
      const panel = this.root.querySelector('#tz-panel');
      if (panel) (panel as HTMLElement).hidden = !this.tzPanelOpen;
      this.updateTzToggleLabel();
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
    this.root.querySelector('#sub-text')?.addEventListener('click', () => {
      this.helper.restMode = (this.helper.restMode + 1) % 2;
      this.refreshUI();
    });
    this.root.querySelector('#life-prev')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.changeLifeOffset(this.eventOffset - 1);
    });
    this.root.querySelector('#life-zero')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.changeLifeOffset(0);
    });
    this.root.querySelector('#life-next')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.changeLifeOffset(this.eventOffset + 1);
    });
    this.root.querySelector('#life-find')?.addEventListener('input', () => this.renderLifeTable());
    this.root.querySelector('#life-find')?.addEventListener('change', () => this.renderLifeTable());
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
          <nav class="nav" id="main-nav">
            <div class="nav-primary" id="nav-primary">
              <a href="#" id="nav-events">${this.tx.navEvents}</a>
              <a href="#" id="nav-new">${this.tx.navNew}</a>
            </div>
            <button type="button" id="nav-menu-toggle" class="nav-menu-toggle" aria-expanded="false" aria-controls="nav-items" aria-label="${this.tx.navMenu}">
              <span class="nav-menu-burger" aria-hidden="true"><span></span><span></span><span></span></span>
              <span id="nav-menu-label" class="nav-menu-label">${this.tx.navMenu}</span>
              <span class="nav-menu-arrow" aria-hidden="true">▾</span>
            </button>
            <div class="nav-items" id="nav-items">
              <a href="#" id="nav-between">${this.tx.navBetween}</a>
              <a href="#" id="nav-lifegrid">${this.tx.navLifeGrid}</a>
              <a href="/${this.lang === 'ru' ? 'en' : 'ru'}/" class="lang-switch" aria-label="${this.lang === 'ru' ? 'Switch to English' : 'Переключить на русский'}" title="${this.lang === 'ru' ? 'Switch to English' : 'Переключить на русский'}">${this.lang === 'ru' ? '🇷🇺' : '🇬🇧'}</a>
              <button type="button" id="theme-toggle" class="btn-ghost" aria-label="${this.tx.themeToggle}" title="${this.tx.themeToggle}">🌓</button>
            </div>
          </nav>
        </header>

        <section class="section-between card" hidden>
          <h2>${this.tx.navBetween}</h2>
          <p class="hint">${this.tx.betweenHint}</p>
          <div class="date-form between-form">
            <label class="settings-field">${this.tx.betweenFrom}
              <input type="date" id="bd-from" class="wide">
            </label>
            <label class="settings-field">${this.tx.betweenTo}
              <input type="date" id="bd-to" class="wide">
            </label>
          </div>
          <div id="bd-result" class="share-preview between-result" hidden></div>
          <p class="between-open-wrap">
            <a href="#" id="bd-open" class="popular-link" hidden>${this.tx.betweenOpenCounter}</a>
          </p>
        </section>

        <section class="section-lifegrid card" hidden>
          <div class="lifegrid-heading">
            <h2>${this.tx.navLifeGrid}</h2>
            <button type="button" id="lifegrid-fs-enter" class="btn-ghost">${this.tx.lifeGridFullscreen}</button>
          </div>
          <div class="lifegrid-units" role="group" aria-label="${this.tx.navLifeGrid}">
            <button type="button" class="lifegrid-unit" data-lg-unit="weeks" aria-pressed="true">${this.tx.lifeGridTabWeeks}</button>
            <button type="button" class="lifegrid-unit" data-lg-unit="months" aria-pressed="false">${this.tx.lifeGridTabMonths}</button>
            <button type="button" class="lifegrid-unit" data-lg-unit="days" aria-pressed="false">${this.tx.lifeGridTabDays}</button>
          </div>
          <p class="hint">${this.tx.lifeGridHint}</p>
          <p class="hint lifegrid-marks-hint">${this.tx.lifeGridMarksHint}</p>
          <p id="lifegrid-days-hint" class="hint lifegrid-days-hint" hidden>${this.tx.lifeGridDaysHint}</p>
          <div class="date-form lifegrid-form">
            <label class="settings-field">${this.tx.lifeGridBirth}
              <input type="date" id="lg-birth" class="wide">
            </label>
            <label class="settings-field">${this.tx.lifeGridYears}
              <select id="lg-years" class="wide">
                ${ALLOWED_YEARS.map((y) => `<option value="${y}">${y} ${this.tx.lifeGridYearsUnit}</option>`).join('')}
              </select>
            </label>
          </div>
          <p id="lifegrid-summary" class="lifegrid-summary"></p>
          <div class="lifegrid-canvas-wrap">
            <canvas id="lifegrid-canvas" aria-label="${this.tx.navLifeGrid}"></canvas>
            <button type="button" id="lifegrid-fs-exit" class="lifegrid-fs-exit btn-ghost" hidden>${this.tx.lifeGridFullscreenExit}</button>
            <div id="lifegrid-cell-info" class="lifegrid-cell-info" hidden>
              <p id="lifegrid-cell-label"></p>
              <p id="lifegrid-cell-mark" class="lifegrid-cell-mark" hidden></p>
              <p><a href="#" id="lifegrid-open" class="popular-link">${this.tx.lifeGridOpenCounter}</a></p>
            </div>
          </div>
        </section>

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
            <div class="tz-area">
              <select id="inp-tz-select" class="wide">${tzOptions}</select>
            </div>
            <p class="hint tz-hint">${this.tx.tzHint}</p>
          </div>
        </section>

        <section class="counter-wrap">
          <p id="text1" class="counter-text"></p>
          <ul id="metrics" class="metrics"></ul>
          <div class="counter-area">
            <div class="counter-row">
              <div class="counter-canvas-wrap">
                <canvas id="counter-canvas" width="800" height="85" title="${this.tx.counterClickHint}"></canvas>
              </div>
              <div id="sub-text" class="sub-text" title="${this.tx.restClickHint}"></div>
            </div>
          </div>
          <p id="text2" class="counter-text"></p>
        </section>

        <section class="section-life card">
          <p class="hint life-hint">${this.tx.lifeHint}</p>
          <div class="life-toolbar">
            <span class="life-date-heading">${this.tx.dateHeader}</span>
            <label class="life-search">
              <img src="/cimg/001/i/find.png" alt="" width="18" height="18" id="life-find-icon" class="life-find-icon">
              <input type="text" id="life-find" class="life-find-input" inputmode="numeric" autocomplete="off" aria-label="${this.tx.search}" placeholder="${this.tx.searchPlaceholder}">
            </label>
          </div>
          <div class="life-table-wrap">
            <table id="life-table" class="life-table">
              <tbody id="life-table-body"></tbody>
            </table>
          </div>
          <div class="life-nav">
            <button type="button" id="life-prev">&lt;</button>
            <button type="button" id="life-zero">0</button>
            <button type="button" id="life-next">&gt;</button>
          </div>
        </section>

        <section class="section-settings card">
          <button type="button" id="toggle-settings" class="btn-link">${this.tx.adjustAndGetLink}</button>
          <div class="settings-pad" hidden>
            <h2>${this.tx.settingsHeader}</h2>
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
            <div class="link-row">
              <input type="text" id="share-link" class="wide" readonly>
              <button type="button" id="open-link">${this.tx.openLink}</button>
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
            <button type="button" id="save-counter" class="btn-ghost">${this.tx.myCountersSave}</button>
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
    this.navResizeObserver?.disconnect();
    this.navResizeObserver = null;
    cancelAnimationFrame(this.raf);
  }
}
