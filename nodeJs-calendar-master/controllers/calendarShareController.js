// backend/controllers/calendarShareController.js

const { response } = require('express');
const Calendar = require('../models/Calendar');
const User = require('../models/Usuario'); // 👈 User 모델 import
const Event = require('../models/Evento');

// 공유 캘린더 접근 (GET)
const accederCalendarioCompartido = async (req, res = response) => {
    try {
        const { token } = req.params;
        const sharedCalendar = await Calendar.findOne({ shareToken: token });

        if (!sharedCalendar) {
            return res.status(404).json({
                ok: false,
                msg: '만료되었거나 유효하지 않은 공유 링크입니다.'
            });
        }

        const owner = await User.findById(sharedCalendar.user);
        if (!owner) {
            return res.status(404).json({
                ok: false,
                msg: '캘린더 소유자를 찾을 수 없습니다.'
            });
        }
        
        return res.json({
            ok: true,
            calendar: {
                id: sharedCalendar.id,
                title: sharedCalendar.title,
                notes: sharedCalendar.notes,
            },
            owner: {
                name: owner.name,
                uid: owner.id,
            }
        });

    } catch (error) {
        console.log('Error en accederCalendarioCompartido:', error);
        return res.status(500).json({
            ok: false,
            msg: '서버에 문제가 발생했습니다.'
        });
    }
};

// 공유 수락 (POST)
const aceptarInvitacionCalendario = async (req, res = response) => {
    try {
        const { token } = req.params;
        const userId = req.uid;

        // 1. 원본 캘린더를 찾습니다.
        const originalCalendar = await Calendar.findOne({ shareToken: token });
        if (!originalCalendar) {
            return res.status(404).json({ ok: false, msg: '공유 캘린더를 찾을 수 없습니다.' });
        }

        // 2. 캘린더 '껍데기'를 복사합니다. (color 속성 포함)
        const newCalendar = new Calendar({
            name: originalCalendar.name,
            notes: `(공유받음) ${originalCalendar.notes || ''}`,
            color: originalCalendar.color, // 👈 색상 복사 코드 추가
            user: userId,
        });
        await newCalendar.save();

        // 3. [핵심] 원본 캘린더에 속한 모든 '이벤트(내용물)'를 찾습니다.
        const originalEvents = await Event.find({ calendar: originalCalendar._id });

        // 4. 찾은 이벤트들을 새로운 캘린더 소속으로 복제합니다.
        if (originalEvents.length > 0) {
            const newEvents = originalEvents.map(event => ({
                title: event.title,
                notes: event.notes,
                start: event.start,
                end: event.end,
                user: userId, // 이벤트 소유자도 '나'로 설정
                calendar: newCalendar._id // 소속을 새로운 캘린더 ID로 변경
            }));
            
            // 복제된 이벤트들을 DB에 한 번에 저장합니다.
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

module.exports = {
    generarEnlaceCompartir,
    accederCalendarioCompartido,
    updateSharePassword,
    aceptarInvitacionCalendario
}
