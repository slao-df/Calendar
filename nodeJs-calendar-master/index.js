const express = require('express');
const { dbConnection } = require('./database/config');
const cors = require('cors');
require('dotenv').config();

//console.log(process.env);

//Crear el servidor de express 
const app = express();

//Base de datos 
dbConnection();

// CORS
app.use(cors());

//Directorio public
app.use(express.static('public'));

//Lectura y parseo del body
app.use( express.json() );


// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/events', require('./routes/events') );

app.use('/api/calendars', require('./routes/calendars')); // 추가 작성

//Escuchar peticiones 
app.listen( process.env.PORT, () => {
    console.log(`Servidor corriendo en puerto ${ process.env.PORT }`);
});