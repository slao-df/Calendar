// routes/events.js
/*
    이벤트 라우터
    기본 경로: /api/events
*/

const { Router } = require('express');
const { check } = require('express-validator');

const { isDate } = require('../helpers/isDate');
const { validateFields } = require('../middlewares/validate-fields');
const { validateJWT } = require('../middlewares/validate-jwt');
const { getEvents, createEvent, updateEvent, deleteEvent } = require('../controllers/events');

const router = Router();

// 🔹 모든 요청은 JWT 검증을 거쳐야 함
router.use(validateJWT);

// 🔹 이벤트 전체 조회
router.get('/', getEvents);

// 🔹 이벤트 생성
router.post(
  '/',
  [
    check('title', '제목은 필수 입력 항목입니다.').not().isEmpty(),
    check('start', '시작 날짜는 필수 입력 항목입니다.').custom(isDate),
    check('end', '종료 날짜는 필수 입력 항목입니다.').custom(isDate),
    validateFields,
  ],
  createEvent
);

// 🔹 이벤트 수정
router.put(
  '/:id',
  [
    check('title', '제목은 필수 입력 항목입니다.').not().isEmpty(),
    check('start', '시작 날짜는 필수 입력 항목입니다.').custom(isDate),
    check('end', '종료 날짜는 필수 입력 항목입니다.').custom(isDate),
    validateFields,
  ],
  updateEvent
);

// 🔹 이벤트 삭제
router.delete('/:id', deleteEvent);

module.exports = router;
