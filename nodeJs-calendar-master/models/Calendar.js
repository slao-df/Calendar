// models/Calendar.js
const { Schema, model } = require("mongoose");

const CalendarSchema = new Schema(
  {
    // 캘린더 이름
    name: {
      type: String,
      required: true,
    },

    // 색상 (기본값 유지)
    color: {
      type: String,
      default: "#a2b9ee",
    },

    // 메모
    memo: {
      type: String,
      default: "",
    },

    // 소유자(캘린더 만든 사람)
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ───────── 공유 기능 관련 필드 ─────────

    // 공유 링크 (프론트에서 사용할 URL 문자열)
    shareLink: {
      type: String,
      default: null,
    },

    // 공유 비밀번호(현재는 평문으로 저장 중 – 필요시 해시로 변경 가능)
    sharePassword: {
      type: String,
      default: null,
    },

    // 이 캘린더에 참여한 사용자들 (읽기 권한 이상)
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // 이 캘린더가 다른 캘린더의 "복제본/참여용 캘린더"인 경우, 원본 캘린더 ID
    originalCalendarId: {
      type: Schema.Types.ObjectId,
      ref: "Calendar",
      default: null,
    },

    // 편집 권한이 있는 사용자들
    editors: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true, // createdAt, updatedAt 자동 추가
  }
);

//
// ───── 인스턴스 메서드: 권한 관련 로직 ─────
//  controllers/calendars.js 에서 사용하는 isOwner / canEdit / canView 를 여기서 정의
//

/**
 * 사용자가 이 캘린더의 소유자인지 확인
 * @param {string|ObjectId} uid
 * @returns {boolean}
 */
CalendarSchema.methods.isOwner = function (uid) {
  if (!uid) return false;
  return String(this.user) === String(uid);
};

/**
 * 사용자가 이 캘린더를 편집할 수 있는지 확인
 *  - 소유자이거나
 *  - editors 배열에 포함된 경우
 */
CalendarSchema.methods.canEdit = function (uid) {
  if (!uid) return false;

  // 소유자는 항상 편집 가능
  if (this.isOwner(uid)) return true;

  // editors 배열에 포함되어 있으면 편집 가능
  if (Array.isArray(this.editors)) {
    return this.editors.some((e) => String(e) === String(uid));
  }

  return false;
};

/**
 * 사용자가 이 캘린더를 볼 수 있는지 확인
 *  - 소유자
 *  - 편집자
 *  - participants 에 포함된 사용자
 */
CalendarSchema.methods.canView = function (uid) {
  if (!uid) return false;

  if (this.isOwner(uid)) return true;
  if (this.canEdit(uid)) return true;

  if (Array.isArray(this.participants)) {
    if (this.participants.some((p) => String(p) === String(uid))) {
      return true;
    }
  }

  return false;
};

module.exports = model("Calendar", CalendarSchema);
