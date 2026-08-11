import type { LocaleStrings } from './types';
import ruJson from './ru.json';

const engine: Partial<LocaleStrings> = {
  yearShort: 'г.',
  hourShort: 'ч.',
  minShort: 'м.',
  secShort: 'с.',
  days: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
  monthRp: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  secArray: ['секунд', 'секунда', 'секунды', 'секунды'],
  minArray: ['минут', 'минута', 'минуты', 'минуты'],
  hourArray: ['часов', 'час', 'часа', 'часы'],
  dayArray: ['дней', 'день', 'дня', 'дни'],
  weekArray: ['недель', 'неделя', 'недели', 'недели'],
  monthArray: ['месяцев', 'месяц', 'месяца', 'месяцы'],
  yearArray: ['лет', 'год', 'года', 'годы'],
  loading: 'загрузка...',
  current: 'текущий',
  bc: 'до н. э.',
  ad: '',
  change: 'Изменить',
  hideSettings: 'Скрыть настройки',
  adjustAndGetLink: 'Настроить и получить ссылку',
  dateOn: 'от ',
  dateWas: ' прошло:',
  dateUntil: 'до ',
  dateLeft: ' осталось:',
  dateDel: ' ',
  eventPrev: '←',
  eventNext: '→',
};

export const ru: LocaleStrings = {
  ...(ruJson as Omit<LocaleStrings, keyof typeof engine>),
  ...engine,
  lang: 'ru',
  footer: 'myCount Fork v1.0',
} as LocaleStrings;
