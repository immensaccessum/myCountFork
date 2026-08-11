/** Preset events for wm=1 (nearest / notable dates). */
(function (global) {
  function utc(y, m, d, h, min, s) {
    return Date.UTC(y, m, d, h || 0, min || 0, s || 0);
  }

  function nextNewYearMs() {
    const now = new Date();
    let y = now.getUTCFullYear();
    const nye = Date.UTC(y, 0, 1, 0, 0, 0);
    if (now.getTime() >= nye) y += 1;
    return Date.UTC(y, 0, 1, 0, 0, 0);
  }

  function nextRoundSeconds(target) {
    const now = Date.now();
    const step = target;
    return Math.ceil(now / step) * step;
  }

  const STATIC = [
    {
      t: utc(1957, 9, 4, 19, 28, 34),
      tz: 0,
      title: {
        ru: 'Запуску первого искусственного спутника Земли:',
        en: 'Since the launch of Sputnik-1:'
      },
      desc: {
        ru: '4 октября 1957 года на орбиту выведен «Спутник-1» — начало космической эры.',
        en: 'On October 4, 1957, Sputnik-1 was launched — the dawn of the space age.'
      }
    },
    {
      t: utc(1969, 6, 20, 20, 17, 40),
      tz: 0,
      title: {
        ru: 'Высадке человека на Луну:',
        en: 'Since the Moon landing:'
      },
      desc: {
        ru: '20 июля 1969 года астронавты Apollo 11 впервые ступили на поверхность Луны.',
        en: 'On July 20, 1969, Apollo 11 astronauts first walked on the Moon.'
      }
    },
    {
      t: utc(1989, 10, 9, 18, 53, 0),
      tz: 0,
      title: {
        ru: 'Падению Берлинской стены:',
        en: 'Since the fall of the Berlin Wall:'
      },
      desc: {
        ru: '9 ноября 1989 года открылся свободный проход через Берлинскую стену.',
        en: 'On November 9, 1989, the Berlin Wall opened to free passage.'
      }
    },
    {
      t: utc(1970, 0, 1, 0, 0, 0),
      tz: 0,
      title: {
        ru: 'Началу Unix-времени:',
        en: 'Since the Unix epoch:'
      },
      desc: {
        ru: '1 января 1970, 00:00:00 UTC — точка отсчёта Unix time.',
        en: 'January 1, 1970, 00:00:00 UTC — the Unix epoch.'
      }
    },
    {
      t: utc(2000, 0, 1, 0, 0, 0),
      tz: 0,
      title: {
        ru: 'Наступлению года 2000:',
        en: 'Since the year 2000:'
      },
      desc: {
        ru: 'Полночь 1 января 2000 года по UTC.',
        en: 'Midnight UTC on January 1, 2000.'
      }
    },
    {
      t: utc(2022, 1, 24, 3, 0, 0),
      tz: 0,
      title: {
        ru: 'С начала событий 2022 года:',
        en: 'Since February 24, 2022:'
      },
      desc: {
        ru: 'Дата, которую многие отслеживают как точку отсчёта.',
        en: 'A date many people track as a point of reference.'
      }
    }
  ];

  function dynamicEvents() {
    return [
      {
        t: nextNewYearMs(),
        tz: 0,
        title: {
          ru: 'До Нового года:',
          en: 'Until New Year:'
        },
        desc: {
          ru: 'Ближайшее наступление 1 января, 00:00 UTC.',
          en: 'The next January 1 at 00:00 UTC.'
        }
      },
      {
        t: nextRoundSeconds(1e8),
        tz: 0,
        title: {
          ru: 'До 100 миллионов секунд Unix:',
          en: 'Until 100 million Unix seconds:'
        },
        desc: {
          ru: 'Ближайший «круглый» рубеж в 100 000 000 секунд от Unix epoch.',
          en: 'The next round milestone of 100,000,000 seconds since Unix epoch.'
        }
      },
      {
        t: nextRoundSeconds(2e9),
        tz: 0,
        title: {
          ru: 'До 2 миллиардов секунд Unix:',
          en: 'Until 2 billion Unix seconds:'
        },
        desc: {
          ru: 'Ближайший рубеж в 2 000 000 000 секунд от Unix epoch.',
          en: 'The next 2,000,000,000 seconds milestone since Unix epoch.'
        }
      }
    ];
  }

  global.MC_getEvents = function () {
    return STATIC.concat(dynamicEvents());
  };

  global.MC_loadPresetEvent = function (wid) {
    const events = global.MC_getEvents();
    const idx = Math.max(0, Math.min(events.length - 1, (wid || 1) - 1));
    const ev = events[idx];
    const lang = global.hc_lang || 'ru';
    const title = ev.title[lang] || ev.title.ru;
    const desc = ev.desc[lang] || ev.desc.ru;

    global.hc_text1 = title;
    global.hc_text2 = '';
    global.hc_event_wid = idx + 1;

    if (typeof global.setBornTime === 'function') {
      global.setBornTime(ev.t, ev.tz || 0, 1, 0, 0);
    } else {
      global.hc_bornTime = ev.t;
      global.hc_time_z = ev.tz || 0;
    }

    if (typeof global.setInnerHTML === 'function') {
      global.setInnerHTML('mf_text1', title);
      global.setInnerHTML('mf_text2', '');
      global.setInnerHTML('mf_event_desc', desc);
      const d = new Date(ev.t);
      global.setInnerHTML('mb_ba_dy', String(d.getUTCFullYear()));
      const monthNames = lang === 'en'
        ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        : ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
      global.setInnerHTML('mb_ba_dd', (d.getUTCDate()) + ' ' + monthNames[d.getUTCMonth()]);
      global.setInnerHTML('mb_ba_dt', '00:00 UTC');
    }

    return ev;
  };

  global.MC_navigateEvent = function (delta) {
    const cur = global.hc_event_wid || 1;
    const len = global.MC_getEvents().length;
    let next = ((cur - 1 + delta) % len + len) % len;
    global.MC_loadPresetEvent(next + 1);
    if (typeof global.hcc !== 'undefined' && global.hcc.draw) global.hcc.draw();
    if (typeof global.prAr !== 'undefined') global.prAr.touch('cnt_link');
    return false;
  };
})(typeof window !== 'undefined' ? window : globalThis);
