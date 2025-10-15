const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
// ❗️ 1. (핵심) 컨트롤러에서 getSharedCalendar 함수를 import 목록에 추가합니다.
const { getCalendars, createCalendar, updateCalendar, deleteCalendar, getSharedCalendar } = require('../controllers/calendars');
const { validarJWT } = require('../middlewares/validar-jwt');
const { generarEnlaceCompartir, accederCalendarioCompartido } = require('../controllers/calendarShareController');

const router = Router();


// --- 공개 라우트 (JWT 검증 불필요) ---
// ❗️ 2. 이 라우트는 로그아웃한 사용자도 접근해야 하므로, JWT 검증 미들웨어 위로 옮깁니다.
router.get('/share/:token', getSharedCalendar);


// --- 인증 필요 라우트 (아래의 모든 라우트는 JWT 검증을 거칩니다.) ---
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
router.post('/:id/share', generarEnlaceCompartir); // validarJWT는 router.use로 이미 적용됨

// 🔗 초대받은 사용자가 공유 캘린더에 접근
router.post('/shared/access', accederCalendarioCompartido); // validarJWT는 router.use로 이미 적용됨


module.exports = router;
