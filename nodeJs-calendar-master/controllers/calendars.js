// controllers/calendars.js
const Calendar = require('../models/Calendar');
const Event = require('../models/Event'); // 👈 [추가] 이벤트 삭제를 위해 Event 모델 임포트

// 모든 캘린더 불러오기
const getCalendars = async (req, res) => {
  try {
    // 내가 소유하거나 참여한 모든 캘린더 조회
    const calendars = await Calendar.find({ user: req.uid })
      .populate('user', 'name') // 👑 소유자 정보 (이름)
      .populate('participants', 'name'); // 👤 참여자 목록 (이름)

    res.json({ ok: true, calendars });
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: '캘린더를 불러오지 못했습니다.' });
  }
};

// 새 캘린더 생성
const createCalendar = async (req, res) => {
  try {
    // [수정] 캘린더 생성 시 사용자 정보(req.uid) 추가
    const calendar = new Calendar({
      ...req.body,
      user: req.uid
    });
    await calendar.save();
    res.json({ ok: true, calendar });
  } catch (error) {
    console.log(error);
    res.status(500).json({ ok: false, msg: '캘린더 생성 중 오류가 발생했습니다.' });
  }
};

// 캘린더 수정 (소유자 또는 편집자 가능, 공유 캘린더 전체 동기화)
const updateCalendar = async (req, res) => {
  const calendarId = req.params.id;
  const userId = req.uid;

  try {
    const calendar = await Calendar.findById(calendarId);

    if (!calendar) {
      return res.status(404).json({ ok: false, msg: '캘린더를 찾을 수 없습니다.' });
    }

    // 소유자 또는 편집자만 수정 가능
    const isOwner = calendar.user.toString() === userId;
    const isEditor = calendar.editors?.some((ed) => ed.toString() === userId);

    if (!isOwner && !isEditor) {
      return res.status(403).json({ ok: false, msg: '수정 권한이 없습니다.' });
    }

    // 변경 사항 적용
    calendar.name = req.body.name || calendar.name;
    calendar.color = req.body.color || calendar.color;
    calendar.memo = req.body.memo || calendar.memo;
    await calendar.save();

    // 공유된 캘린더(껍데기들)도 모두 동기화
    // 원본 캘린더라면 originalCalendarId가 없음 → 자식 공유캘린더들 찾아서 업데이트
    if (!calendar.originalCalendarId) {
      await Calendar.updateMany(
        { originalCalendarId: calendar._id },
        {
          $set: {
            name: calendar.name,
            color: calendar.color,
            memo: calendar.memo,
          },
        }
      );
    } else {
      // 만약 이게 껍데기 캘린더(공유받은)라면 원본 캘린더에도 반영하도록 한다.
      await Calendar.findByIdAndUpdate(calendar.originalCalendarId, {
        $set: {
          name: calendar.name,
          color: calendar.color,
          memo: calendar.memo,
        },
      });

      // 그리고 원본의 다른 공유본들도 업데이트
      await Calendar.updateMany(
        { originalCalendarId: calendar.originalCalendarId },
        {
          $set: {
            name: calendar.name,
            color: calendar.color,
            memo: calendar.memo,
          },
        }
      );
    }

    return res.json({
      ok: true,
      msg: '캘린더 수정 및 공유 동기화 완료',
      calendar,
    });
  } catch (error) {
    console.error('❌ 캘린더 수정 오류:', error);
    res.status(500).json({ ok: false, msg: '서버 오류 발생' });
  }
};


// 캘린더 삭제
const deleteCalendar = async (req, res) => {
  const calendarIdToDelete = req.params.id; // 삭제할 캘린더 ID (예: '[공유] 1'의 ID)
  const userId = req.uid; // 현재 로그인한 사용자 ID

  try {
    // 삭제할 캘린더 문서를 찾습니다.
    const calendarToDelete = await Calendar.findById(calendarIdToDelete);

    if (!calendarToDelete) {
      return res.status(404).json({ ok: false, msg: '캘린더를 찾을 수 없습니다.' });
    }

    // [소유권 확인] 내가 이 캘린더(껍데기 또는 원본)의 소유자인지 확인합니다.
    if (calendarToDelete.user.toString() !== userId) {
      return res.status(401).json({ ok: false, msg: '이 캘린더를 삭제할 권한이 없습니다.' });
    }

    // 만약 이 캘린더가 '공유받은 캘린더(껍데기)'라면,
    if (calendarToDelete.originalCalendarId) {
      // 원본 캘린더'를 찾아서 내 ID를 'participants' 배열에서 제거합니다.
      await Calendar.findByIdAndUpdate(
        calendarToDelete.originalCalendarId, // 원본 캘린더 ID
        { $pull: { participants: userId } } // participants 배열에서 내 userId 제거
      );

    } else {
      // --- (기존 로직: 내가 '원본' 캘린더를 삭제하는 경우) ---
      //이 캘린더가 '원본'이면, 이 캘린더에 속한 모든 '일정(Event)'도 삭제합니다.
      // (주의: 공유받은 사람이 있다면 그들의 캘린더 목록에서도 사라지게 됩니다.)
      await Event.deleteMany({ calendar: calendarIdToDelete });

      // 이 원본 캘린더를 참조하는 모든 '[공유]' 캘린더(껍데기)도 삭제할 수 있습니다.
      // await Calendar.deleteMany({ originalCalendarId: calendarIdToDelete });
    }
    // --- [로직 추가 끝] ---

    // 요청된 캘린더(껍데기 또는 원본) 자체를 삭제합니다.
    await Calendar.findByIdAndDelete(calendarIdToDelete);

    res.json({ ok: true, msg: '캘린더가 삭제되었습니다.' }); // (메시지 수정)

  } catch (error) {
    console.error('캘린더 삭제 오류:', error); // (콘솔 로그 개선)
    res.status(500).json({ ok: false, msg: '캘린더 삭제 중 서버 오류 발생' }); // (메시지 수정)
  }
};

const getCalendarParticipants = async (req, res) => {
  const { id } = req.params;

  try {
    const calendarToShow = await Calendar.findById(id);
    if (!calendarToShow) {
      return res.status(404).json({ ok: false, msg: '캘린더를 찾을 수 없습니다.' });
    }

    const targetCalendarId = calendarToShow.originalCalendarId
      ? calendarToShow.originalCalendarId
      : calendarToShow._id;

    // 원본 캘린더 조회 시 'editors' 필드도 가져옵니다. (populate는 선택)
    const targetCalendar = await Calendar.findById(targetCalendarId)
      .populate('user', 'name')
      .populate('participants', 'name');
    // .populate('editors', 'name'); // 필요하다면 편집자 이름도 populate

    if (!targetCalendar) {
      return res.status(404).json({ ok: false, msg: '원본 캘린더 정보를 찾을 수 없습니다.' });
    }

    // 응답 JSON에 'editors' ID 배열을 포함시킵니다.
    res.json({
      ok: true,
      owner: targetCalendar.user,
      participants: targetCalendar.participants,
      editors: targetCalendar.editors || [] // 👈 editors 배열 추가 (없으면 빈 배열)
    });

  } catch (error) {
    console.error('참여자 목록 조회 오류:', error);
    res.status(500).json({ ok: false, msg: '서버 오류 발생' });
  }
};

module.exports = {
  getCalendars,
  createCalendar,
  updateCalendar,
  deleteCalendar,
  getCalendarParticipants,
};
