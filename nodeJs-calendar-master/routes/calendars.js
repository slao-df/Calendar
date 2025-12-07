// routes/calendars.js
const { Router } = require("express");
const { check } = require("express-validator");
const { validateFields } = require("../middlewares/validate-fields");
const { validateJWT } = require("../middlewares/validate-jwt");

// 캘린더 기본 CRUD 컨트롤러
const {
  getCalendars,
  createCalendar,
  updateCalendar,
  deleteCalendar,
  getCalendarParticipants,
} = require("../controllers/calendars");

// 공유 / 권한 관련 컨트롤러
const {
  generateShareLink,
  regenerateShareCredentials,
  verifyAndAttachSharedCalendar,
  joinSharedCalendar,
  getShareInfo,
  grantEditPermission,
  revokeEditPermission,
  updateBulkPermissions,
} = require("../controllers/calendarShareController");

const router = Router();

// 모든 캘린더 라우트는 JWT 필수
router.use(validateJWT);

/**
 * 전체 캘린더 불러오기
 * - 소유자(user)
 * - 편집자(editors)
 * - 참여자(participants)
 */
router.get("/", getCalendars);

/**
 * 새 캘린더 생성
 */
router.post(
  "/",
  [
    check("name", "캘린더 이름은 필수입니다.").not().isEmpty(),
    validateFields,
  ],
  createCalendar
);

/**
 * 캘린더 수정
 * - 소유자 또는 편집자만 가능
 */
router.put(
  "/:id",
  [
    check("name", "이름은 필수입니다.").not().isEmpty(),
    check("color", "색상은 필수입니다.").not().isEmpty(),
    validateFields,
  ],
  updateCalendar
);

/**
 * 캘린더 삭제
 * - 소유자만 가능
 */
router.delete("/:id", deleteCalendar);

/* ======================  공유 및 권한 관련  ====================== */

/**
 * 공유 링크/비밀번호 생성 또는 수정
 * - 소유자만 가능
 * - POST /api/calendars/:id/share  { password }
 */
router.post("/:id/share", generateShareLink);

/**
 * 공유 정보 조회 (링크/비밀번호)
 * - 소유자만 가능
 * - GET /api/calendars/:id/share
 */
router.get("/:id/share", getShareInfo);

/**
 * 공유 자격 재발급 (현재는 미구현: 501)
 */
router.post("/:id/share/regenerate", regenerateShareCredentials);

/**
 * 공유 링크 참여
 * - POST /api/calendars/share/:shareId  { password }
 * - shareId = 원본 캘린더 _id
 */
router.post("/share/:shareId", joinSharedCalendar);

/**
 * (이전 버전 호환용) 공유 검증 + 추가 (미구현)
 */
router.post("/shared/:token/verify", verifyAndAttachSharedCalendar);

/**
 * 캘린더 참여자/편집자 목록 조회
 * - GET /api/calendars/:id/participants
 */
router.get("/:id/participants", getCalendarParticipants);

/**
 * 특정 참여자에게 편집 권한 부여
 * - POST /api/calendars/:id/permissions { participantId }
 */
router.post("/:id/permissions", grantEditPermission);

/**
 * 특정 참여자의 편집 권한 취소
 * - DELETE /api/calendars/:id/permissions { participantId }
 */
router.delete("/:id/permissions", revokeEditPermission);

/**
 * 여러 참여자의 권한을 한 번에 변경
 * - PUT /api/calendars/:id/permissions/bulk { changes: { userId1: true, userId2: false } }
 */
router.put("/:id/permissions/bulk", updateBulkPermissions);

module.exports = router;
