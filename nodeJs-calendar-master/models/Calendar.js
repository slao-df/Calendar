// models/Calendar.js
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
        default: '#4A90E2' // 기본 색상
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'Usuario', // 'Usuario'가 아닌 'User'일 수 있습니다. User 모델의 이름과 일치해야 합니다.
        required: true
    }
});

CalendarSchema.method('toJSON', function() {
    const { __v, _id, ...object } = this.toObject();
    object.id = _id;
    return object;
});

module.exports = model('Calendar', CalendarSchema);