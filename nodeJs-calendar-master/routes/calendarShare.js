//calendarShare.js
const { Router } = require('express');
const {
  generarEnlaceCompartir,
  accederCalendarioCompartido,
  updateSharePassword,
  aceptarInvitacionCalendario
} = require('../controllers/calendarShareController');
const { validarJWT } = require('../middlewares/validar-jwt');

const router = Router();

// 🔑 공유 링크 생성 (로그인 사용자만)
router.post('/share/:id', validarJWT, generarEnlaceCompartir);

// 🆕 공유 비밀번호 변경
router.put('/share/:id/password', validarJWT, updateSharePassword);

// 🔗 공유 캘린더 접근 (로그인 불필요)
router.get('/share-calendar/:token', accederCalendarioCompartido);
router.post('/share-calendar/:token/accept', validarJWT, aceptarInvitacionCalendario);
module.exports = router;
