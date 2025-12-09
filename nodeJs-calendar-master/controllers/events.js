// controllers/events.js
const { response } = require('express');
const Event = require('../models/Event');
const Calendar = require('../models/Calendar');

/**
 * 특정 캘린더에 대해 사용자가 편집(쓰기) 권한을 가지고 있는지 확인
 * - 소유자(user)
 * - editors 배열에 포함된 사용자
 */
const userCanEdit = async (calendarId, userId) => {
  try {
    if (!calendarId || !userId) return false;

    const calendar = await Calendar.findById(calendarId);
    if (!calendar) return false;

    const isOwner = String(calendar.user) === String(userId);
    const isEditor = Array.isArray(calendar.editors)
      ? calendar.editors.some((e) => String(e) === String(userId))
      : false;

    return isOwner || isEditor;
  } catch (error) {
    console.error('권한 확인 중 오류:', error);
    return false;
  }
};

/**
 * 1) 내가 볼 수 있는 모든 이벤트 조회
 * - 내가 가진 캘린더(소유 / 편집 / 참여자)의 id
 *   + 그 캘린더들의 originalCalendarId 까지 모두 포함해서 조회
 */
const getEvents = async (req, res) => {
  const userId = req.uid;

  try {
    const myCalendars = await Calendar.find({
      $or: [
        { user: userId },        // 내가 소유한 캘린더
        { editors: userId },     // 편집 권한 있는 캘린더
        { participants: userId } // 참여자로 등록된 캘린더
      ],
    }).select('_id originalCalendarId');

    const idSet = new Set();
    myCalendars.forEach((cal) => {
      if (cal._id) idSet.add(String(cal._id));
      if (cal.originalCalendarId) idSet.add(String(cal.originalCalendarId));
    });

    const calendarIds = Array.from(idSet);

    const events = await Event.find({ calendar: { $in: calendarIds } })
      .populate('user', 'name')
      .populate('calendar', 'name color');

    res.json({ ok: true, events });
  } catch (error) {
    console.error('❌ 이벤트 로딩 오류 (getEvents):', error);
    res.status(500).json({ ok: false, msg: '서버 오류 발생' });
  }
};

/**
 * 2) 새 이벤트 생성 (소유자 / 편집자)
 * - 프론트에서 넘어온 calendarId 가 공유용 복제 캘린더인 경우,
 *   그 캘린더의 originalCalendarId 를 실제 이벤트의 calendar 로 사용.
 */
const createEvent = async (req, res = response) => {
  const userId = req.uid;
  const { calendar: rawCalendarId } = req.body;

  try {
    let targetCalendarId = rawCalendarId;

    // 만약 rawCalendarId 가 "복제 캘린더" 라면, 원본 캘린더 ID로 교체
    const calDoc = await Calendar.findById(rawCalendarId);
    if (calDoc && calDoc.originalCalendarId) {
      targetCalendarId = calDoc.originalCalendarId;
    }

    // 권한 체크 (원본 캘린더 기준)
    const canEdit = await userCanEdit(targetCalendarId, userId);
    if (!canEdit) {
      return res.status(401).json({
        ok: false,
        msg: '이 캘린더에 일정을 생성할 권한이 없습니다.',
      });
    }

    const event = new Event({
      ...req.body,
      calendar: targetCalendarId,
      user: userId,
    });

    const saved = await event.save();
    const populated = await Event.findById(saved._id)
      .populate('user', 'name')
      .populate('calendar', 'name color');

    res.json({
      ok: true,
      event: populated,
    });
  } catch (error) {
    console.error('❌ 이벤트 생성 오류 (createEvent):', error);
    res.status(500).json({
      ok: false,
      msg: '서버 오류가 발생했습니다. 관리자에게 문의하세요.',
    });
  }
};

/**
 * 3) 이벤트 수정 (소유자 / 편집자)
 * - 기존 event.calendar 는 절대 바꾸지 않는다.
 * - title, notes, start, end 만 수정.
 */
const updateEvent = async (req, res = response) => {
  const eventId = req.params.id;
  const uid = req.uid;

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        ok: false,
        msg: '해당 ID의 이벤트가 존재하지 않습니다.',
      });
    }

    // 이 이벤트가 속한 캘린더에 대한 편집 권한 확인 (원본 캘린더 기준)
    const canEdit = await userCanEdit(event.calendar, uid);
    if (!canEdit) {
      return res.status(401).json({
        ok: false,
        msg: '이 이벤트를 수정할 권한이 없습니다.',
      });
    }

    // calendar 필드는 건드리지 않고, 나머지 필드만 갱신
    if (req.body.title !== undefined) event.title = req.body.title;
    if (req.body.notes !== undefined) event.notes = req.body.notes;
    if (req.body.start !== undefined) event.start = req.body.start;
    if (req.body.end !== undefined) event.end = req.body.end;

    event.user = uid; // 최종 수정자

    await event.save();

    // populate는 별도 조회로 안전하게
    const populated = await Event.findById(eventId)
      .populate('user', 'name')
      .populate('calendar', 'name color');

    res.json({
      ok: true,
      event: populated,
    });
  } catch (error) {
    console.error('❌ 이벤트 수정 오류 (updateEvent):', error);
    res.status(500).json({
      ok: false,
      msg: '이벤트를 수정하는 중 서버 오류가 발생했습니다.',
    });
  }
};

/**
 * 4) 이벤트 삭제 (소유자 / 편집자)
 */
const deleteEvent = async (req, res) => {
  const eventId = req.params.id;
  const userId = req.uid;

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ ok: false, msg: '이벤트를 찾을 수 없습니다.' });
    }

    // 이 이벤트가 속한 캘린더에 대한 편집 권한 확인
    const canEdit = await userCanEdit(event.calendar, userId);
    if (!canEdit) {
      return res.status(401).json({ ok: false, msg: '이 이벤트를 삭제할 권한이 없습니다.' });
    }

    await Event.findByIdAndDelete(eventId);
    res.json({ ok: true, msg: '이벤트 삭제됨' });
  } catch (error) {
    console.error('❌ 이벤트 삭제 오류 (deleteEvent):', error);
    return res.status(500).json({ ok: false, msg: '서버 오류가 발생했습니다.' });
  }
};

module.exports = {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
};
