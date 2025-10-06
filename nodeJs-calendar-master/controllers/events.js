const { response } = require('express');
const Evento = require('../models/Evento');

const getEventos = async (req, res = response) => {
    const eventos = await Evento.find({ user: req.uid })
        .populate('user', 'name')
        .populate('calendar', 'id name color');

    res.json({
        ok: true,
        eventos
    });
};

const crearEvento = async (req, res = response) => {
    console.log('📩 요청 바디:', req.body);
    console.log('📂 첨부 파일:', req.files);

    const evento = new Evento(req.body);
    try {
        evento.user = req.uid;
        const eventoGuardado = await evento.save();
        const eventoCompleto = await Evento.findById(eventoGuardado.id)
            .populate('user', 'name')
            .populate('calendar', 'id name color');
        res.json({
            ok: true,
            evento: eventoCompleto
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: '관리자에게 문의하세요' 
        });
    }
};

const actualizarEvento = async (req, res = response) => {
    const eventoId = req.params.id;
    const uid = req.uid;
    try {
        const evento = await Evento.findById(eventoId);
        if (!evento) {
            return res.status(404).json({
                ok: false,
                msg: '해당 ID의 이벤트를 찾을 수 없습니다' 
            });
        }
        if (evento.user.toString() !== uid) {
            return res.status(401).json({
                ok: false,
                msg: '이 이벤트를 수정할 권한이 없습니다'
            });
        }
        const nuevoEvento = { ...req.body, user: uid };
        const eventoActualizado = await Evento.findByIdAndUpdate(eventoId, nuevoEvento, { new: true })
            .populate('user', 'name')
            .populate('calendar', 'id name color');
        res.json({
            ok: true,
            evento: eventoActualizado
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: '관리자에게 문의하세요' 
        });
    }
};

const eliminarEvento = async (req, res = response) => {
    const eventoId = req.params.id;
    const uid = req.uid;
    try {
        const evento = await Evento.findById(eventoId);
        if (!evento) {
            return res.status(404).json({
                ok: false,
                msg: '해당 ID의 이벤트를 찾을 수 없습니다' 
            });
        }
        if (evento.user.toString() !== uid) {
            return res.status(401).json({
                ok: false,
                msg: '이 이벤트를 삭제할 권한이 없습니다' 
            });
        }
        await Evento.findByIdAndDelete(eventoId);
        res.json({ ok: true, msg: '이벤트가 삭제되었습니다.' });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: '관리자에게 문의하세요' 
        });
    }
};


module.exports = {
    getEventos,
    crearEvento,
    actualizarEvento,
    eliminarEvento
};
