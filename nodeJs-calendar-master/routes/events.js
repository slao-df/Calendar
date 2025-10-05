const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { getEventos, crearEvento, actualizarEvento, eliminarEvento } = require('../controllers/events');
const { isDate } = require('../helpers/isDate');

const router = Router();


router.use( validarJWT );

router.get('/',  getEventos);

router.post(
            '/',
            [
                check('title', '제목은 필수 항목입니다.').not().isEmpty(),
                check('start', '시작일은 필수 항목입니다.').custom(isDate),
                check('end', '종료일은 필수 항목입니다.').custom(isDate),
                validarCampos
            ],
            crearEvento
);

router.put('/:id', 
            [
                check('title','제목은 필수 항목입니다.').not().isEmpty(),
                check('start','시작일은 필수 항목입니다.').custom( isDate ),
                check('end','종료일은 필수 항목입니다.').custom( isDate ),
                validarCampos
            ],
            actualizarEvento);

router.delete('/:id', eliminarEvento);

module.exports = router;
