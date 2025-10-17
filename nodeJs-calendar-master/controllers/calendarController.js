// controllers/calendarController.js

const Calendar = require('../models/Calendar');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

/**
 * 🟢 공유 수락 (캘린더 소유자는 그대로, 수락자는 참여자에 추가)
 */
// controllers/calendarController.js
const acceptSharedCalendar = async (req, res) => {
  try {
    const { token } = req.params;
    const uid = req.uid;

    const calendar = await Calendar.findOne({ shareToken: token })
      .populate('user', 'name email');
    if (!calendar) {
      return res.status(404).json({ ok: false, msg: '공유된 캘린더를 찾을 수 없습니다.' });
    }

    if (calendar.user._id.toString() === uid) {
      return res.status(400).json({ ok: false, msg: '본인 캘린더는 공유받을 수 없습니다.' });
    }

    if (calendar.participants?.some(p => p.toString() === uid)) {
      return res.status(200).json({
        ok: true,
        msg: '공유 수락 완료',
        calendars: [populatedCopy], // ✅ 배열 형태로 반환
        });
    }

    calendar.participants.push(uid);
    await calendar.save();

    // 🔹 공유받은 사용자의 목록에도 복사본 추가
    const sharedCopy = new Calendar({
      name: calendar.name,
      description: calendar.description,
      color: calendar.color,
      user: calendar.user,
      isShared: true,
      participants: calendar.participants,
      originalId: calendar._id,
    });
    await sharedCopy.save();

    // ✅ 공유 복사본을 populate 후 반환 (프론트에서 표시 가능하도록)
    const populatedCopy = await Calendar.findById(sharedCopy._id)
      .populate('user', 'name email')
      .populate('participants', 'name email');

    return res.json({
      ok: true,
      msg: '공유 수락 완료',
      calendar: populatedCopy,
      owner: calendar.user,
      participants: calendar.participants,
    });
  } catch (error) {
    console.error('❌ 공유 수락 중 오류:', error);
    return res.status(500).json({ ok: false, msg: '공유 수락 중 서버 오류' });
  }
};

/**
 * 🟣 특정 캘린더의 소유자와 참여자 목록 조회
 */
const getCalendarParticipants = async (req, res) => {
  try {
    const { id } = req.params;
    const calendar = await Calendar.findById(id)
      .populate('user', 'name email')
      .populate('participants', 'name email');

    if (!calendar) {
      return res.status(404).json({ ok: false, msg: '캘린더를 찾을 수 없습니다.' });
    }

    return res.json({
      ok: true,
      owner: calendar.user,
      participants: calendar.participants || [],
    });
  } catch (error) {
    console.error('❌ 참여자 목록 조회 오류:', error);
    return res.status(500).json({ ok: false, msg: '참여자 조회 중 오류' });
  }
};

module.exports = {
  acceptSharedCalendar,
  getCalendarParticipants,
};
