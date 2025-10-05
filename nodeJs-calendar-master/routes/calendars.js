// routes/calendars.js
const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { getCalendars, createCalendar, updateCalendar, deleteCalendar } = require('../controllers/calendars');
const { validarJWT } = require('../middlewares/validar-jwt');

const router = Router();

// 이 아래의 모든 라우트는 JWT 검증을 거칩니다.
router.use(validarJWT);

// 캘린더 목록 가져오기
router.get('/', getCalendars);

// 새 캘린더 만들기
router.post(
    '/new',
    [
        check('name', '이름은 필수 항목입니다.').not().isEmpty(),
        validarCampos
    ],
    createCalendar 
);

// 캘린더 수정
router.put('/:id', updateCalendar);

// 캘린더 삭제
router.delete('/:id', deleteCalendar);

module.exports = router;