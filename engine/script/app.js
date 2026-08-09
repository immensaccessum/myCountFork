/**
 * Modern UI layer: themes, presets, copy link, view modes.
 */
const MC_UI = {
  strings: {},

  init(strings) {
    this.strings = strings || {};
    this.initTheme();
    this.initPresets();
    this.initCopyLink();
    this.bindEventNav();
  },

  initTheme() {
    const stored = localStorage.getItem('mc_theme');
    const theme = stored || 'light';
    document.documentElement.dataset.theme = theme;

    const btn = document.getElementById('theme_toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('mc_theme', next);
      if (typeof dBg !== 'undefined' && dBg.init) dBg.init();
    });
  },

  initPresets() {
    document.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.applyPreset(btn.dataset.preset);
      });
    });
  },

  applyPreset(name) {
    const now = new Date();
    let target = new Date(now);

    switch (name) {
      case 'now':
        target = now;
        break;
      case 'hour':
        target = new Date(now.getTime() + 3600000);
        break;
      case 'tomorrow': {
        target = new Date(now);
        target.setDate(target.getDate() + 1);
        target.setHours(0, 0, 0, 0);
        break;
      }
      case 'newyear': {
        let y = now.getFullYear();
        if (now.getMonth() === 11 && now.getDate() === 31) y += 1;
        else if (now.getMonth() > 0 || now.getDate() > 1) y += 1;
        target = new Date(y, 0, 1, 0, 0, 0, 0);
        break;
      }
      case '100m': {
        const step = 1e8;
        const ms = Math.ceil(now.getTime() / 1000 / step) * step * 1000;
        target = new Date(ms);
        break;
      }
      default:
        return;
    }

    this.setDateInputs(target);
    if (typeof prAr !== 'undefined') {
      prAr.touch('born_date');
      prAr.end();
    }
  },

  setDateInputs(d) {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.value = v;
    };
    set('mf_ba_y', d.getFullYear());
    set('mf_ba_m', d.getMonth());
    set('mf_ba_d', d.getDate());
    set('mf_ba_h', d.getHours());
    set('mf_ba_min', d.getMinutes());
    set('mf_ba_s', d.getSeconds());
    if (typeof prAr !== 'undefined') {
      prAr.set('mf_ba_h_en', 1);
      prAr.set('mf_ba_min_en', 1);
      prAr.set('mf_ba_s_en', 1);
    }
  },

  initCopyLink() {
    const btn = document.getElementById('mf_copy_link_btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const input = document.getElementById('mf_bat_label_area');
      if (!input) return;
      const text = input.value;
      try {
        await navigator.clipboard.writeText(text);
        const orig = btn.textContent;
        btn.textContent = this.strings.copied || 'Copied!';
        setTimeout(() => { btn.textContent = orig; }, 1500);
      } catch {
        input.select();
        document.execCommand('copy');
      }
    });
  },

  bindEventNav() {
    const prev = document.getElementById('mf_event_prev');
    const next = document.getElementById('mf_event_next');
    if (prev) prev.addEventListener('click', (e) => { e.preventDefault(); MC_navigateEvent(-1); });
    if (next) next.addEventListener('click', (e) => { e.preventDefault(); MC_navigateEvent(1); });
  },

  applyViewMode(vm) {
    document.body.dataset.mode = String(vm);

    const show = (id, on) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.display = on ? '' : 'none';
    };

    const isEmbed = vm === 4;
    const isEvents = vm === 1;
    const isEditor = vm === 3;

    show('section_editor', isEditor);
    show('section_events', isEvents);
    show('section_life_table', isEditor);
    show('section_settings', !isEmbed);
    show('mf_top_logo', !isEmbed);
    show('section_intro', isEditor);

    const ad = document.getElementById('section_ad');
    if (ad && !ad.classList.contains('mc_ad_enabled')) ad.style.display = 'none';

    if (isEmbed && typeof hideById === 'function') {
      hideById('counterSettingsPad');
    }

    if (isEvents && typeof MC_loadPresetEvent === 'function') {
      MC_loadPresetEvent(window.hc_event_wid || 1);
    }
  },
};

window.MC_UI = MC_UI;
window.MC_applyViewMode = (vm) => MC_UI.applyViewMode(vm);
window.MC_UI_init = (strings) => MC_UI.init(strings);
