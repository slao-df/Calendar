// routes/google.js
const express = require('express');
const router = express.Router();
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// 1️⃣ 구글 로그인 시작
router.get('/oauth', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ];
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });
  res.redirect(url);
});

// 2️⃣ 구글 콜백 처리 (토큰 발급)
router.get('/oauth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing authorization code');

  try {
    const { tokens } = await oauth2Client.getToken(code);
    req.session.tokens = tokens;
    console.log('[GOOGLE] Tokens stored in session');
    res.redirect('http://localhost:3000'); // 프론트 홈으로 리디렉션
  } catch (err) {
    console.error('[GOOGLE CALLBACK ERROR]', err);
    res.status(500).send('Failed to get tokens');
  }
});

// 3️⃣ 토큰 상태 확인용 (현재 확인 중인 부분)
router.get('/tokens', (req, res) => {
  const hasTokens = !!req.session.tokens;
  res.json({ hasTokens });
});

// 4️⃣ 캘린더 이벤트 목록 테스트용
router.get('/events', async (req, res) => {
  if (!req.session.tokens)
    return res.status(401).json({ error: 'Not authorized' });

  oauth2Client.setCredentials(req.session.tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const events = await calendar.events.list({
      calendarId: 'primary',
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime'
    });
    res.json(events.data.items);
  } catch (e) {
    console.error('[GOOGLE EVENTS ERROR]', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
