// C:\Users\user\SharedCalendar\nodeJs-calendar-master\models\calendarMember.js

const { Schema, model } = require('mongoose');

const CalendarMemberSchema = Schema({
    // 어떤 사용자인지 Users 컬렉션의 ID를 참조합니다.
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // 어떤 캘린더인지 Calendars 컬렉션의 ID를 참조합니다.
    calendar_id: {
        type: Schema.Types.ObjectId,
        ref: 'Calendar',
        required: true
    },
    // 나중에 권한 (읽기/쓰기)을 확장하기 위한 필드입니다.
    role: {
        type: String,
        default: 'viewer' // 기본값은 '보기 전용'
    }
});

module.exports = model('CalendarMember', CalendarMemberSchema);
