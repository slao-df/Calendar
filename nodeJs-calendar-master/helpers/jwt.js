// helpers/jwt.js
const jwt = require('jsonwebtoken');

// JWT 토큰 생성 함수 (email은 선택값)
const generateJWT = (uid, name, email = null) => {
  return new Promise((resolve, reject) => {
    // 기본 payload
    const payload = { uid, name };

    // email이 넘어온 경우에만 payload에 추가
    if (email) {
      payload.email = email;
    }

    jwt.sign(
      payload,
      process.env.SECRET_JWT_SEED,
      {
        expiresIn: '2h', // 토큰 유효 기간: 2시간
      },
      (err, token) => {
        if (err) {
          console.log(err);
          reject('토큰을 생성할 수 없습니다.');
        }

        resolve(token);
      }
    );
  });
};

module.exports = {
  generateJWT,
};
