const { response } = require('express');
const { validationResult } = require('express-validator');

// 요청 데이터 유효성 검사 미들웨어
const validateFields = (req, res = response, next) => {
  const errors = validationResult(req);

  // 요청 데이터에 에러가 있는 경우
  if (!errors.isEmpty()) {
    return res.status(400).json({
      ok: false,
      errors: errors.mapped(),
    });
  }

  // 다음 미들웨어로 이동
  next();
};

module.exports = {
  validateFields,
};
