
const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
// const { crearUsuario, loginUsuario, revalidarToken } = require('../controllers/auth');
const { validarJWT } = require('../middlewares/validar-jwt');

const router = Router();

router.post(
    '/new',
    [ //Middleware
        check('name', '이름은 필수 항목입니다.').not().isEmpty(),
        check('email', '이메일은 필수 항목입니다.').isEmail(),
        check('password', '비밀번호는 6자여야 합니다.').isLength({ min: 6 }),
        validarCampos
    ],
    require('../controllers/auth').crearUsuario 
);

router.post(
    '/',
    [ //Middleware
        check('email', '이메일은 필수 항목입니다.').isEmail(),
        check('password', ' 비밀번호는 6자여야 합니다.').isLength({ min: 6 }),
        validarCampos
    ],
    require('../controllers/auth').loginUsuario 
);

router.get(
    '/renew',
    validarJWT,
    require('../controllers/auth').revalidarToken
);

module.exports = router;