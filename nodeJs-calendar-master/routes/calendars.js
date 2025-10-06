const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { getCalendars, createCalendar, updateCalendar, deleteCalendar } = require('../controllers/calendars');
const { validarJWT } = require('../middlewares/validar-jwt');
const { generarEnlaceCompartir, accederCalendarioCompartido } = require('../controllers/calendarShareController');

const router = Router();

// 아래의 모든 라우트는 JWT 검증을 거칩니다.
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


// 🔗 공유 링크 생성
router.post('/:id/share', validarJWT, generarEnlaceCompartir);

// 🔗 초대받은 사용자가 공유 캘린더에 접근
router.post('/shared/access', validarJWT, accederCalendarioCompartido);

module.exports = router;
