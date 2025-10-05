const {response} = require('express');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const { generarJWT } = require('../helpers/jwt');

const crearUsuario = async (req, res = response) => {
    const { name, email, password } = req.body; 
    try {
        let usuario = await Usuario.findOne({ email });

        if (usuario) {
            return res.status(400).json({
                ok: false,
                msg: '이미 존재하는 사용자입니다'
            });
        }
        
        // 필요한 데이터만 사용하여 새 사용자 객체 생성
        usuario = new Usuario({ name, email, password });

        // 비밀번호 암호화
        const salt = bcrypt.genSaltSync();
        usuario.password = bcrypt.hashSync(password, salt);

        await usuario.save();

        // JWT 생성
        const token = await generarJWT(usuario.id, usuario.name);

        res.status(201).json({
            ok: true,
            uid: usuario.id,
            name: usuario.name,
            token
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: '관리자에게 문의하세요',
        });
    }
}

const loginUsuario = async (req, res = response) => {
    const { email, password } = req.body;
    try {
        const usuario = await Usuario.findOne({ email });

        if (!usuario) {
            return res.status(400).json({
                ok: false,
                msg: '해당 이메일로 등록된 사용자가 없습니다'
            });
        }
        
        // 비밀번호 비교
        const validPassword = bcrypt.compareSync(password, usuario.password);

        if (!validPassword) {
            return res.status(400).json({
                ok: false,
                msg: '비밀번호가 올바르지 않습니다'
            });
        }

        // JWT 생성
        const token = await generarJWT(usuario.id, usuario.name);

        res.json({
            ok: true,
            uid: usuario.id,
            name: usuario.name,
            token
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: '관리자에게 문의하세요'
        });
    }
}


const revalidarToken = async (req, res = response ) => {

    const { uid, name } = req;

    // Generar JWT
    const token = await generarJWT( uid, name );

    res.json({
        ok: true,
        uid,name,
        token
    })
}



module.exports = { 
    crearUsuario,
    loginUsuario,
    revalidarToken
}