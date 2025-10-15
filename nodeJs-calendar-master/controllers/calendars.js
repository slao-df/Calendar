const { response } = require('express');
const Calendar = require('../models/Calendar'); 
const Evento = require('../models/Evento');
const crypto = require('crypto');

// ❗️ 1. (핵심) 누락되었던 두 함수를 여기에 정의합니다.
const generateUniqueToken = () => {
    return crypto.randomBytes(16).toString('hex');
};

const createHashedPassword = () => {
    // 실제 서비스에서는 bcrypt와 같은 보안 라이브러리를 사용해야 합니다.
    // 여기서는 임시로 랜덤 문자열을 생성합니다.
    return Math.random().toString(36).substring(2, 10);
};


const getCalendars = async (req, res = response) => {
    try {
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
        res.status(201).json({
            ok: true,
            calendar: savedCalendar
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
    const calendarData = req.body;

    try {
        const calendarDB = await Calendar.findById(calendarId);

        if (!calendarDB) {
            return res.status(404).json({ ok: false, msg: 'Calendar not found' });
        }

        if (calendarData.isShared && !calendarDB.shareToken) {
            // ❗️ 2. 이제 위에서 정의한 함수들을 정상적으로 사용할 수 있습니다.
            calendarData.shareToken = generateUniqueToken();
            calendarData.sharePassword = createHashedPassword();
        }

        const updatedCalendar = await Calendar.findByIdAndUpdate(calendarId, calendarData, { new: true });

        res.json({
            ok: true,
            calendar: updatedCalendar
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ ok: false, msg: 'Please contact the administrator' });
    }
};

const deleteCalendar = async (req, res = response) => {
    const calendarId = req.params.id;
    const uid = req.uid;

    try {
        const calendar = await Calendar.findById(calendarId);
        if (!calendar) {
            return res.status(404).json({
                ok: false,
                msg: '캘린더를 찾을 수 없습니다.',
            });
        }

        if (calendar.user.toString() !== uid) {
            return res.status(401).json({
                ok: false,
                msg: '삭제 권한이 없습니다.',
            });
        }

        await Evento.deleteMany({ calendar: calendarId });
        await Calendar.findByIdAndDelete(calendarId);

        res.json({
            ok: true,
            msg: '캘린더와 해당 일정이 모두 삭제되었습니다.',
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: '캘린더 삭제 중 오류 발생',
        });
    }
};

const getSharedCalendar = async (req, res = response) => {
    try {
        const { token } = req.params;

        // 1. 토큰을 기준으로 캘린더를 찾습니다.
        const calendar = await Calendar.findOne({ shareToken: token });

        // 2. 캘린더가 없거나 공유 상태가 아니라면 에러를 반환합니다.
        if (!calendar || !calendar.isShared) {
            return res.status(404).json({ ok: false, msg: '공유된 캘린더를 찾을 수 없습니다.' });
        }

        // 3. 찾은 캘린더의 ID를 이용해 해당 캘린더에 속한 모든 일정을 찾습니다.
        const events = await Evento.find({ calendar: calendar._id });

        // 4. 캘린더 정보와 일정 정보를 함께 보내줍니다.
        res.json({
            ok: true,
            calendar,
            events
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ ok: false, msg: '데이터를 불러오는 중 오류 발생' });
    }
};


module.exports = {
    getCalendars,
    createCalendar,
    updateCalendar,
    deleteCalendar,
    getSharedCalendar,
}
