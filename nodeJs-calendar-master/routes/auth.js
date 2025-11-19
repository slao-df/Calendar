// routes/auth.js
/*
    사용자 인증 라우터
    기본 경로: host + /api/auth
*/
const { Router } = require('express');
const { check } = require('express-validator');
const { validateFields } = require('../middlewares/validate-fields');
const { createUser, loginUser, revalidateToken } = require('../controllers/auth');
const { validateJWT } = require('../middlewares/validate-jwt');

const router = Router();

// 🔹 회원가입
router.post(
  '/new',
  [
    // 미들웨어
    check('name', '이름은 필수 입력 항목입니다.').not().isEmpty(),
    check('email', '이메일은 필수 입력 항목입니다.').isEmail(),
    check('password', '비밀번호는 최소 6자 이상이어야 합니다.').isLength({ min: 6 }),
    validateFields,
  ],
  createUser
);

// 🔹 로그인
router.post(
  '/',
  [
    // 미들웨어
    check('email', '이메일은 필수 입력 항목입니다.').isEmail(),
    check('password', '비밀번호는 최소 6자 이상이어야 합니다.').isLength({ min: 6 }),
    validateFields,
  ],
  loginUser
);

// 🔹 토큰 재검증 (재발급)
router.get('/renew', validateJWT, revalidateToken);

module.exports = router;
