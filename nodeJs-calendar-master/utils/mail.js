// utils/mail.js
const nodemailer = require("nodemailer");

const MAIL_USER = process.env.MAIL_USER; // 예: 공용 발신 계정 (no-reply@...)
const MAIL_PASS = process.env.MAIL_PASS; // SMTP 비밀번호 또는 앱 비밀번호

if (!MAIL_USER || !MAIL_PASS) {
  console.warn(
    "[MAIL] MAIL_USER / MAIL_PASS 환경변수가 설정되어 있지 않습니다. 이메일 발송이 동작하지 않을 수 있습니다."
  );
}

// 기본 트랜스포터 (Gmail 기준, 다른 서비스면 설정 변경)
const transporter = nodemailer.createTransport({
  service: "gmail", // 네이버 / 기타를 쓰면 service 대신 host/port/security 설정
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASS,
  },
});

/**
 * 캘린더 공유 메일 발송
 * @param {Object} opts
 * @param {string} opts.to             - 수신자 이메일
 * @param {string} opts.fromName       - 보낸 사람 이름 (로그인 사용자 이름)
 * @param {string} opts.fromEmail      - 보낸 사람 이메일 (로그인 사용자 이메일)
 * @param {string} opts.calendarName   - 캘린더 이름
 * @param {string} opts.shareUrl       - 공유 접속 URL
 * @param {string} [opts.password]     - 공유 비밀번호(있으면)
 */
async function sendCalendarShareMail({
  to,
  fromName,
  fromEmail,
  calendarName,
  shareUrl,
  password,
}) {
  const safeFromName = fromName || "캘린더 사용자";
  const safeFromEmail = fromEmail || "알 수 없음";

  const subject = `[${safeFromName}] ${calendarName} 캘린더 공유 링크입니다.`;

  const text = `
안녕하세요.

${safeFromName} (${safeFromEmail}) 님이 '${calendarName}' 캘린더를 공유했습니다.

아래 링크를 클릭하면 캘린더를 추가하실 수 있습니다.

링크: ${shareUrl}
비밀번호: ${password || "(비밀번호 없음)"}

※ 이 메일은 시스템에서 자동 발송되었습니다.
`;

  await transporter.sendMail({
    from: `"${safeFromName}" <${MAIL_USER}>`, // 실제 SMTP 발신자는 공용 계정
    to,
    subject,
    text,
  });
}

module.exports = {
  sendCalendarShareMail,
};
