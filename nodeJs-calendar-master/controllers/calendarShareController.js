import Calendar from '../models/Calendar.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// 🔗 공유 링크 생성
export const generarEnlaceCompartir = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;  // 사용자가 지정한 비밀번호
  const uid = req.uid;

  try {
    const calendar = await Calendar.findById(id);
    if (!calendar) {
      return res.status(404).json({ ok: false, msg: '캘린더를 찾을 수 없습니다.' });
    }

    if (calendar.user.toString() !== uid) {
      return res.status(403).json({ ok: false, msg: '공유 권한이 없습니다.' });
    }

    // 🔑 토큰 및 비밀번호 생성
    const token = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(password, 10);

    calendar.shareToken = token;
    calendar.sharePassword = hashedPassword;
    calendar.isShared = true;

    await calendar.save();

    const shareLink = `${process.env.FRONTEND_URL}/shared/${token}`;

    res.json({
      ok: true,
      shareLink,
      password
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, msg: '공유 링크 생성 중 오류 발생' });
  }
};

// 🔗 초대받은 사용자가 공유 캘린더 접근
export const accederCalendarioCompartido = async (req, res) => {
  const { token, password } = req.body;
  const uid = req.uid;

  try {
    const calendar = await Calendar.findOne({ shareToken: token });
    if (!calendar) {
      return res.status(404).json({ ok: false, msg: '잘못된 링크입니다.' });
    }

    const isMatch = await bcrypt.compare(password, calendar.sharePassword);
    if (!isMatch) {
      return res.status(401).json({ ok: false, msg: '비밀번호가 일치하지 않습니다.' });
    }

    // ✅ 사용자의 계정에 공유 캘린더를 추가
    // (필요하다면 연결 테이블 or User 모델에 캘린더 배열 추가)
    res.json({ ok: true, calendar });

  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, msg: '공유 캘린더 접근 중 오류 발생' });
  }
};
