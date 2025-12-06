// models/Calendar.js
const { Schema, model } = require("mongoose");

const CalendarSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      default: "#a2b9ee",
    },
    memo: {
      type: String,
      default: "",
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 공유 기능 관련 필드 추가
    shareLink: {
      type: String,
      default: null,
    },
    sharePassword: {
      type: String,
      default: null,
    },
    participants: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    originalCalendarId: {
      type: Schema.Types.ObjectId,
      ref: 'Calendar', // 'Calendar' 모델 참조
      default: null
    },
    editors: [{ // 편집 가능자
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
  },
  { timestamps: true } // 여기 괄호 닫힘 주의!
);

module.exports = model("Calendar", CalendarSchema);