// src/helpers/localizer.js
import { dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import ko from "date-fns/locale/ko";

const locales = { ko };

export const localizer = dateFnsLocalizer({
  format,
  parse,
  // ✅ react-big-calendar가 (date, culture)를 넘겨주기 때문에 인자를 받아야 함
  startOfWeek: (date, culture) =>
    startOfWeek(date, {
      weekStartsOn: 1,                      // 월요일 시작
      locale: locales[culture] || ko,
    }),
  getDay,
  locales,
});
