// // src/helpers/localizer.js
// import { dateFnsLocalizer } from "react-big-calendar";
// import { format, parse, startOfWeek, getDay } from "date-fns";
// import ko from "date-fns/locale/ko";

// const locales = { ko };

// export const localizer = dateFnsLocalizer({
//   format,
//   parse,
//   // react-big-calendar가 (date, culture)를 넘겨주기 때문에 인자를 받아야 함
//   startOfWeek: (date, culture) =>
//     startOfWeek(date, {
//       weekStartsOn: 1,                 // 월요일 시작
//       locale: locales[culture] || ko,
//     }),
//   getDay,
//   locales,
// });


// helpers/calendarLocalizer.js
import { dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import ko from 'date-fns/locale/ko';

// react-big-calendar 에서 쓸 locale 매핑
const locales = {
  ko,
};

// 핵심: rbc가 상단 월 헤더를 찍을 때 사용하는 포맷 문자열이 "MMMM yyyy" 라서
// 이 포맷이 들어오면 우리가 직접 "연도년 월월" 형태로 바꿔서 리턴한다.
const customFormat = (date, formatStr) => {
  if (formatStr === 'MMMM yyyy') {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}년 ${month}월`; // ← 여기서 연-월 순서로 강제
  }

  // 나머지는 기존처럼 한국어 locale로 처리
  return format(date, formatStr, { locale: ko });
};

export const localizer = dateFnsLocalizer({
  format: customFormat,
  parse: (value, formatStr) =>
    parse(value, formatStr, new Date(), { locale: ko }),
  startOfWeek: (date) => startOfWeek(date, { locale: ko }),
  getDay,
  locales,
});