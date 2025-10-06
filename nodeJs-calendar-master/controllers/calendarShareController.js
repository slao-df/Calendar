const Calendar = require('../models/Calendar');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// 🔑 공유 링크 및 비밀번호 최초 생성
const generarEnlaceCompartir = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  const uid = req.uid;

  try {
    const calendar = await Calendar.findById(id);
    if (!calendar) return res.status(404).json({ ok: false, msg: '캘린더를 찾을 수 없습니다.' });

    if (calendar.user.toString() !== uid) return res.status(403).json({ ok: false, msg: '권한이 없습니다.' });

    // ✅ 이미 링크가 존재하면 기존 링크/비밀번호 유지
    if (calendar.shareToken && calendar.sharePassword) {
      return res.json({
        ok: true,
        shareLink: `${process.env.FRONTEND_URL}/shared/${calendar.shareToken}`,
        password: '(기존 비밀번호 유지됨)'
      });
    }

    // 🟢 최초 공유일 때만 링크/비밀번호 생성
    const token = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(password, 10);

    calendar.shareToken = token;
    calendar.sharePassword = hashedPassword;
    calendar.isShared = true;
    await calendar.save();

    res.json({
      ok: true,
      shareLink: `${process.env.FRONTEND_URL}/shared/${token}`,
      password
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, msg: '공유 링크 생성 중 오류 발생' });
  }
};

// 🆕 🔑 비밀번호 변경 API
const updateSharePassword = async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  const uid = req.uid;

  try {
    const calendar = await Calendar.findById(id);
    if (!calendar) return res.status(404).json({ ok: false, msg: '캘린더를 찾을 수 없습니다.' });

    if (calendar.user.toString() !== uid) return res.status(403).json({ ok: false, msg: '권한이 없습니다.' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    calendar.sharePassword = hashedPassword;

    await calendar.save();

    res.json({ ok: true, msg: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, msg: '비밀번호 변경 중 오류 발생' });
  }
};

// 🔗 공유 캘린더 접근
const accederCalendarioCompartido = async (req, res) => {
  const { token, password } = req.body;

  try {
    const calendar = await Calendar.findOne({ shareToken: token });
    if (!calendar) return res.status(404).json({ ok: false, msg: '잘못된 링크입니다.' });

    const isMatch = await bcrypt.compare(password, calendar.sharePassword);
    if (!isMatch) return res.status(401).json({ ok: false, msg: '비밀번호가 일치하지 않습니다.' });

    res.json({ ok: true, calendar });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, msg: '공유 캘린더 접근 중 오류 발생' });
  }
};

module.exports = { generarEnlaceCompartir, accederCalendarioCompartido, updateSharePassword };
