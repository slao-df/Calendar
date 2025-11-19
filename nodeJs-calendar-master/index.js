// nodeJs-calendar-master/index.js (최종 전체본)

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { dbConnection } = require('./database/config');

const app = express();

/* ===== 디버그 로그 ===== */
console.log('[env]', {
  PORT: process.env.PORT || 4000,
  MONGO_CNN: process.env.MONGO_CNN ? '(set)' : undefined,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ? '(set)' : undefined,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? '(set)' : undefined,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? '(set)' : undefined,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI ? '(set)' : undefined,
});
console.log('[which-uri]', {
  useMONGO_CNN: !!process.env.MONGO_CNN,
  useDB_CNN: !!process.env.DB_CNN,
  uriSample: (process.env.MONGO_CNN || process.env.DB_CNN || '').slice(0, 60) + '...',
});
/* ====================== */

// 기본 미들웨어
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// 세션 (OAuth 토큰 임시 저장용)
app.use(
  session({
    secret: process.env.SECRET_JWT_SEED || 'dev-secret',
    resave: false,
    saveUninitialized: false,
  })
);

// 헬스체크
app.get('/api/health', (_, res) => res.json({ ok: true }));

// 부트스트랩
(async () => {
  try {
    // DB 연결
    await dbConnection();

    // 라우트 로드
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/events', require('./routes/events'));
    app.use('/api/calendars', require('./routes/calendars'));
    app.use('/api/assistant', require('./routes/assistant'));
    app.use('/api/google', require('./routes/google')); // OAuth/Calendar 연결 라우트

    const port = Number(process.env.PORT) || 4000;
    app.listen(port, '0.0.0.0', () => console.log(`서버 포트 ${port}`));
  } catch (e) {
    console.error('[BOOT]', e);
    process.exit(1);
  }
})();

// 전역 에러 로그 (원인 추적용)
process.on('unhandledRejection', (r) =>
  console.error('[unhandledRejection]', r)
);
process.on('uncaughtException', (e) => {
  console.error('[uncaughtException]', e);
  process.exit(1);
});
