const { response } = require('express');
const Calendar = require('../models/Calendar'); 
const Evento = require('../models/Evento');

const getCalendars = async (req, res = response) => {
    try {
        // JWT에서 인증된 사용자 ID(req.uid)를 사용하여 해당 사용자의 캘린더만 찾습니다.
        const calendars = await Calendar.find({ user: req.uid });

        res.json({
            ok: true,
            calendars
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: '캘린더를 불러오는 중 오류가 발생했습니다.'
        });
    }
}

const createCalendar = async (req, res = response) => {
    const calendar = new Calendar(req.body);
    try {
        calendar.user = req.uid;
        const savedCalendar = await calendar.save();

        // This is the most important part
        res.status(201).json({
            ok: true,
            calendar: savedCalendar // 👈 Make sure you are returning the saved object
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: '새 캘린더를 생성하는 중 오류가 발생했습니다.'
        });
    }
}

const updateCalendar = async (req, res = response) => {
    
    const calendarId = req.params.id;
    const uid = req.uid;

    try {
        const calendar = await Calendar.findById(calendarId);
        if (!calendar) {
            return res.status(404).json({ ok: false, msg: '캘린더를 찾을 수 없습니다.' });
        }
        if (calendar.user.toString() !== uid) {
            return res.status(401).json({ ok: false, msg: '수정 권한이 없습니다.' });
        }

        const newCalendarData = { ...req.body, user: uid };
        const updatedCalendar = await Calendar.findByIdAndUpdate(calendarId, newCalendarData, { new: true });

        res.json({ ok: true, calendar: updatedCalendar });

    } catch (error) {
        console.log(error);
        res.status(500).json({ ok: false, msg: '캘린더 수정 중 오류 발생' });
    }
}

const deleteCalendar = async (req, res = response) => {
    const calendarId = req.params.id;
    const uid = req.uid;

    try {
        const calendar = await Calendar.findById(calendarId);
        if (!calendar) {
            return res.status(404).json({ ok: false, msg: '캘린더를 찾을 수 없습니다.' });
        }
        if (calendar.user.toString() !== uid) {
            return res.status(401).json({ ok: false, msg: '삭제 권한이 없습니다.' });
        }

        await Evento.deleteMany({ calendar: calendarId });
        await Calendar.findByIdAndDelete(calendarId);
        res.json({ ok: true });

    } catch (error) {
        console.log(error);
        res.status(500).json({ ok: false, msg: '캘린더 삭제 중 오류 발생' });
    }
}

module.exports = {
    getCalendars,
    createCalendar,
    updateCalendar, 
    deleteCalendar, 
}