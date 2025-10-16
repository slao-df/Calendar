// C:\Users\user\SharedCalendar\nodeJs-calendar-master\models\index.js

const User = require('./user'); // user.js 파일이 있다고 가정
const Calendar = require('./Calendar'); // calendar.js 파일이 있다고 가정
const CalendarMember = require('./calendarMember'); // calendarMember.js 파일이 있다고 가정

// 필요한 모델들을 여기에 추가...

module.exports = {
    User,
    Calendar,
    CalendarMember,
};
