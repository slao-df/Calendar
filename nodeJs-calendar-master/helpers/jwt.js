const jwt = require('jsonwebtoken');

// JWT 토큰 생성 함수
const generateJWT = (uid, name) => {
  return new Promise((resolve, reject) => {
    const payload = { uid, name };

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
