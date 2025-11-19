// models/User.js
const { Schema, model } = require('mongoose');

// 🔹 사용자 스키마 정의
const UserSchema = Schema({
  name: {
    type: String,
    required: true, // 이름은 필수 입력값
  },
  email: {
    type: String,
    required: true, // 이메일은 필수 입력값
    unique: true,   // 중복 불가
  },
  password: {
    type: String,
    required: true, // 비밀번호는 필수 입력값
  },
});

module.exports = model('User', UserSchema);
