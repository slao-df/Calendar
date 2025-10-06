const { Schema, model } = require('mongoose');

const CalendarSchema = Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    color: {
        type: String,
        default: '#4A90E2'
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    // 🔑 공유 관련 필드
    shareToken: {
        type: String,   // 공유 링크에 붙일 토큰 (랜덤 문자열)
        default: null
    },
    sharePassword: {
        type: String,   // 비밀번호 (bcrypt로 암호화)
        default: null
    },
    isShared: {
        type: Boolean,
        default: false
    }
});

CalendarSchema.method('toJSON', function() {
    const { __v, _id, ...object } = this.toObject();
    object.id = _id;
    return object;
});

module.exports = model('Calendar', CalendarSchema);
