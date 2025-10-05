import {dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay} from 'date-fns';
import ko from 'date-fns/locale/ko'; //한국어


const locales = {
  'ko': ko,//한국어
}

export const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});