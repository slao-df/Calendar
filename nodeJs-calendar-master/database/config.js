// // database/config.js
// const mongoose = require('mongoose');

// const { MONGO_CNN } = process.env;

// if (!MONGO_CNN) {
//   console.error('[config] MONGO_CNN 환경변수가 설정되지 않았습니다.');
// }

// async function dbConnection() {
//   const uri = MONGO_CNN; // .env에서 읽음
//   try {
//     await mongoose.connect(uri, {
//       serverSelectionTimeoutMS: 10000,
//       socketTimeoutMS: 20000,
//       family: 4, // IPv4 우선
//       tls: true,
//     });
//     console.log('MongoDB connected');
//   } catch (err) {
//     console.error('MongoDB connect error:', err);
//     throw new Error('데이터베이스 초기화 중 오류가 발생했습니다.');
//   }
// }

// module.exports = { dbConnection }; // ✅ named export


const mongoose = require('mongoose');

async function dbConnection() {
  const uri = process.env.MONGO_CNN;
  if (!uri) throw new Error('MONGO_CNN 환경변수가 설정되지 않았습니다.');
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 20000,
    family: 4,
    tls: true,
  });
  console.log('MongoDB connected');
}

module.exports = { dbConnection };