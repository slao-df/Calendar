// routes/calendars.js
const { Router } = require("express");
const { check } = require("express-validator");
const { validateFields } = require("../middlewares/validate-fields");
const { validateJWT } = require("../middlewares/validate-jwt");
const Calendar = require("../models/Calendar");
const {
  getCalendars,
  createCalendar,
  updateCalendar,
  deleteCalendar,
  getCalendarParticipants,
  
} = require('../controllers/calendars');

// updateSharePassword 컨트롤러 임포트
const {
  generateShareLink,
  regenerateShareCredentials,
  verifyAndAttachSharedCalendar,
  getShareInfo,
  joinSharedCalendar,
  grantEditPermission,
  revokeEditPermission,
  updateBulkPermissions,
} = require('../controllers/calendarShareController');


const router = Router();

// JWT 인증 필수
router.use(validateJWT);

/**
 * 전체 캘린더 불러오기
 */
router.get("/", getCalendars); // (컨트롤러로 분리된 코드를 사용하도록 수정)

/**
 * 새 캘린더 추가
 */
router.post(
  "/",
  [check("name", "캘린더 이름은 필수입니다.").not().isEmpty(), validateFields],
  createCalendar // (컨트롤러로 분리된 코드를 사용하도록 수정)
);

/**
 * 캘린더 수정
 */
router.put(
  '/:id',
  [
    check('name', '이름은 필수입니다.').not().isEmpty(),
    check('color', '색상은 필수입니다.').not().isEmpty(),
    validateFields,
  ],
  updateCalendar
);

/**
 * 캘린더 삭제
 */
router.delete("/:id", deleteCalendar); // (컨트롤러로 분리된 코드를 사용하도록 수정)


// --- 공유 관련 라우트 ---

// 공유 링크/비번 생성 (최초)
router.post('/:id/share', generateShareLink);



// 공유 정보 조회
router.get('/:id/share', getShareInfo);

// (선택) 재발급
router.post('/:id/share/regenerate', regenerateShareCredentials);

// 공유 링크로 참여
router.post("/share/:shareId", joinSharedCalendar);

// (이전 버전 호환용 - 필요시 유지)
router.post('/shared/:token/verify', verifyAndAttachSharedCalendar);

router.get('/:id/participants', getCalendarParticipants);

router.post('/:id/permissions', grantEditPermission);

// 캘린더 편집 권한 취소 (DELETE)
// (참고: HTTP DELETE는 body를 지원하지 않는 경우가 있어 POST를 쓰기도 하지만, 
//  axios 등은 body와 함께 DELETE 요청 가능)
router.delete('/:id/permissions', revokeEditPermission);

//여러 참여자 권한 일괄 변경
router.put('/:id/permissions/bulk', updateBulkPermissions);
module.exports = router;