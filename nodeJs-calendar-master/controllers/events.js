const { response } = require('express');
const Event = require('../models/Event');
const Calendar = require('../models/Calendar'); // 캘린더 모델 임포트

// 편집 권한 확인 헬퍼 함수
/**
 * 사용자가 특정 캘린더에 대해 편집 권한(소유자 또는 편집자)이 있는지 확인합니다.
 * @param {string} calendarId - 확인할 캘린더의 ID
 * @param {string} userId - 확인할 사용자의 ID
 * @returns {Promise<boolean>} - 편집 권한이 있으면 true, 없으면 false
 */
const userCanEdit = async (calendarId, userId) => {
  try {
    const calendar = await Calendar.findById(calendarId);
    if (!calendar) return false; // 캘린더가 없으면 권한 없음

    // 1. 캘린더 소유자인지 확인
    const isOwner = calendar.user.toString() === userId;
    // 2. 캘린더 편집자 목록(editors)에 포함되어 있는지 확인
    const isEditor = calendar.editors.includes(userId);

    // 소유자이거나 편집자이면 true 반환
    return isOwner || isEditor;

  } catch (error) {
    console.error('권한 확인 중 오류:', error);
    return false; // 오류 발생 시 안전하게 '권한 없음' 반환
  }
};

// 이벤트 컨트롤러 함수
// 모든 이벤트 조회 (권한: 소유자, 편집자, 참여자)
const getEvents = async (req, res) => {
  const userId = req.uid; 

  try {
    // [유지] 이 로직은 사용자가 '볼 수 있는' 모든 캘린더 ID를 가져옵니다. (정상)
    const myCalendars = await Calendar.find({
      $or: [
        { user: userId },         
        { participants: userId }  
      ]
    }).select('_id'); 

    const myCalendarIds = myCalendars.map(cal => cal._id);

    // [유지] 볼 수 있는 캘린더에 속한 모든 이벤트를 조회합니다. (정상)
    const events = await Event.find({ calendar: { $in: myCalendarIds } })
                              .populate('user', 'name') 
                              .populate('calendar', 'name color');

    res.json({ ok: true, events });

  } catch (error) {
    console.error('❌ 이벤트 로딩 오류 (getEvents):', error);
    res.status(500).json({ ok: false, msg: '서버 오류 발생' }); // ok: false 추가
  }
};

// 새 이벤트 생성 (권한: 소유자, 편집자)
const createEvent = async (req, res = response) => {
  const event = new Event(req.body);
  const userId = req.uid;

  try {
    // 이 캘린더(event.calendar)에 현재 사용자(userId)가 쓸 권한이 있는지 확인
    const canEdit = await userCanEdit(event.calendar, userId);
    if (!canEdit) {
      return res.status(401).json({
        ok: false,
        msg: '이 캘린더에 일정을 생성할 권한이 없습니다.',
      });
    }

    // 권한이 있으면 이벤트 생성
    event.user = userId; // 작성자 기록 (이벤트 생성자)
    const savedEvent = await event.save();

    res.json({
      ok: true,
      event: savedEvent,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: '서버 오류가 발생했습니다. 관리자에게 문의하세요.',
    });
  }
};

// 이벤트 수정 (권한: 소유자, 편집자)
const updateEvent = async (req, res = response) => {
  const eventId = req.params.id;
  const uid = req.uid; // 현재 사용자 ID

  try {
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        ok: false,
        msg: '해당 ID의 이벤트가 존재하지 않습니다.',
      });
    }

    // 변경: 이 이벤트가 속한 *캘린더*를 수정할 권한이 있는지 확인
    const canEdit = await userCanEdit(event.calendar, uid);
    if (!canEdit) {
      return res.status(401).json({
        ok: false,
        msg: '이 이벤트를 수정할 권한이 없습니다.',
      });
    }

    // 권한이 있으면 수정 진행
    const newEvent = {
      ...req.body,
      user: uid, // user 필드를 '최종 수정자'로 업데이트
    };

    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      newEvent,
      { new: true } // 업데이트된 문서를 반환
    );

    res.json({
      ok: true,
      event: updatedEvent,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: '서버 오류가 발생했습니다. 관리자에게 문의하세요.',
    });
  }
};

// 이벤트 삭제 (권한: 소유자, 편집자)
const deleteEvent = async (req, res) => {
    const eventId = req.params.id;
    const userId = req.uid; 

    try {
      const event = await Event.findById(eventId); 

      if (!event) {
        return res.status(404).json({ ok: false, msg: '이벤트를 찾을 수 없습니다.' });
      }

      // 이 이벤트가 속한 *캘린더*를 삭제할 권한이 있는지 확인
      const canEdit = await userCanEdit(event.calendar, userId);
      if (!canEdit) {
        return res.status(401).json({ ok: false, msg: '이 이벤트를 삭제할 권한이 없습니다.' });
      }

      // 권한이 있으면 삭제 진행
      await Event.findByIdAndDelete(eventId);
      res.json({ ok: true, msg: '이벤트 삭제됨' });
      
    } catch (error) {
      console.log(error);
      return res.status(500).json({ ok: false, msg: '서버 오류가 발생했습니다.' });
    }
  };

module.exports = {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
};