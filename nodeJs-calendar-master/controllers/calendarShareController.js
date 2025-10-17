// backend/controllers/calendarShareController.js

const { response } = require('express');
const Calendar = require('../models/Calendar');
const User = require('../models/Usuario'); // 👈 User 모델 import
const Event = require('../models/Evento');

// 공유 캘린더 접근 (GET)
const accederCalendarioCompartido = async (req, res) => {
  const { calendarId, token } = req.params;
  const { password } = req.body;
  const uid = req.uid; // 🔹 로그인한 사용자 (공유받은 사람)

  try {
    const calendar = await Calendar.findById(calendarId);
    if (!calendar || !calendar.shareToken)
      return res.status(404).json({ ok: false, msg: '공유된 캘린더를 찾을 수 없습니다.' });

    if (calendar.shareToken !== token)
      return res.status(403).json({ ok: false, msg: '잘못된 링크입니다.' });

    const isMatch = await bcrypt.compare(password, calendar.sharePassword);
    if (!isMatch)
      return res.status(401).json({ ok: false, msg: '비밀번호가 일치하지 않습니다.' });

    // ✅ 이미 참여자인지 확인
    const alreadyParticipant = calendar.participants.some(
      (p) => p.toString() === uid
    );

    // ✅ 참여자 추가 (중복 방지)
    if (!alreadyParticipant) {
      calendar.participants.push(uid);
      await calendar.save();
    }

    // ✅ 캘린더 데이터 반환 (owner는 고정, participants는 갱신됨)
    res.json({
      ok: true,
      calendar: {
        id: calendar._id,
        title: calendar.title,
        owner: calendar.user, // 소유자는 그대로 유지
        participants: calendar.participants,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, msg: '공유 캘린더 접근 중 오류 발생' });
  }
};

// 공유 수락 (POST)
const aceptarInvitacionCalendario = async (req, res = response) => {
    try {
        const { token } = req.params;
        const userId = req.uid;

        const originalCalendar = await Calendar.findOne({ shareToken: token }).populate('user', 'name');
        if (!originalCalendar) {
            return res.status(404).json({ ok: false, msg: '공유 캘린더를 찾을 수 없습니다.' });
        }
        
        // 원본 캘린더 소유자의 이름을 변수에 저장합니다.
        const originalOwnerName = originalCalendar.user.name;

        const newCalendar = new Calendar({
            name: originalCalendar.name,
            notes: `(공유받음) ${originalCalendar.notes || ''}`,
            color: originalCalendar.color,
            user: userId,
        });
        await newCalendar.save();

        const originalEvents = await Event.find({ calendar: originalCalendar._id });

        if (originalEvents.length > 0) {
            const newEvents = originalEvents.map(event => ({
                title: event.title,
                notes: event.notes,
                start: event.start,
                end: event.end,
                user: userId,
                calendar: newCalendar._id,
                // 👇 [핵심] 복제된 이벤트에 원본 작성자의 이름을 저장합니다.
                creatorName: originalOwnerName 
            }));
            
            await Event.insertMany(newEvents);
        }

        return res.json({
            ok: true,
            msg: '캘린더와 모든 일정이 당신의 목록에 성공적으로 추가되었습니다.',
            calendar: newCalendar
        });

    } catch (error) {
        console.log('Error en aceptarInvitacionCalendario:', error);
        return res.status(500).json({ ok: false, msg: '서버 오류가 발생했습니다.' });
    }
}


const generarEnlaceCompartir = (req, res = response) => {
    // TODO: Implement this function
    res.status(501).json({ ok: false, msg: 'Not implemented yet' });
}

const updateSharePassword = (req, res = response) => {
    // TODO: Implement this function
    res.status(501).json({ ok: false, msg: 'Not implemented yet' });
}

const deleteCalendar = async (req, res = response) => {
    const calendarId = req.params.id;
    const uid = req.uid;

    try {
        const calendar = await Calendar.findById(calendarId);

        if (!calendar) {
            return res.status(404).json({ ok: false, msg: '캘린더를 찾을 수 없습니다.' });
        }

        // 캘린더 소유자만 삭제할 수 있도록 확인합니다.
        if (calendar.user.toString() !== uid) {
            return res.status(401).json({ ok: false, msg: '이 캘린더를 삭제할 권한이 없습니다.' });
        }

        // [핵심] 캘린더를 삭제하기 전에, 관련된 모든 이벤트를 먼저 삭제합니다.
        await Event.deleteMany({ calendar: calendarId });

        // 이벤트를 모두 삭제한 후, 캘린더를 삭제합니다.
        await Calendar.findByIdAndDelete(calendarId);
        
        res.json({ ok: true, msg: '캘린더가 성공적으로 삭제되었습니다.' });

    } catch (error) {
        console.log(error);
        res.status(500).json({ ok: false, msg: '서버 오류가 발생했습니다.' });
    }
}

const getCalendarParticipants = async (req, res = response) => {
    const calendarId = req.params.id;

    try {
        const calendar = await Calendar.findById(calendarId)
            .populate('user', 'name email') // 소유자 정보 (이름, 이메일)
            .populate('participants', 'name email'); // 참여자 목록 정보 (이름, 이메일)

        if (!calendar) {
            return res.status(404).json({ ok: false, msg: '캘린더를 찾을 수 없습니다.' });
        }

        res.json({
            ok: true,
            owner: calendar.user,
            participants: calendar.participants
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ ok: false, msg: '서버 오류가 발생했습니다.' });
    }
}

const getSharedCalendar = async (req, res = response) => {
  try {
    const { token } = req.params;

    const calendar = await Calendar.findOne({ share_id: token })
      .populate('user', 'name email'); // 소유자 정보 포함

    if (!calendar) {
      return res.status(404).json({
        ok: false,
        msg: '만료되었거나 잘못된 공유 링크입니다.'
      });
    }

    res.json({
      ok: true,
      calendar: {
        id: calendar.id,
        name: calendar.name,
        description: calendar.description,
        color: calendar.color,
      },
      owner: calendar.user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: '서버 오류가 발생했습니다.',
    });
  }
};

module.exports = {
    generarEnlaceCompartir,
    accederCalendarioCompartido,
    updateSharePassword,
    aceptarInvitacionCalendario,
    deleteCalendar,
    getCalendarParticipants,
    getSharedCalendar,
}
