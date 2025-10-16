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

module.exports = {
    generarEnlaceCompartir,
    accederCalendarioCompartido,
    updateSharePassword,
    aceptarInvitacionCalendario,
    deleteCalendar,
}
