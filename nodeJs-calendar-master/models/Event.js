// models/Event.js
const { Schema, model } = require('mongoose');

//  이벤트 스키마 정의
const EventSchema = Schema({
  title: {
    type: String,
    required: true,
  },
  notes: {
    type: String,
  },
  start: {
    type: Date,
    required: true,
  },
  end: {
    type: Date,
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  calendar: {
    type: Schema.Types.ObjectId,
    ref: 'Calendar',
    required: true,
  },
});

//  MongoDB 문서 변환 시 _id를 id로 변경하여 반환
EventSchema.method('toJSON', function () {
  const { __v, _id, ...object } = this.toObject();
  object.id = _id;
  return object;
});

module.exports = model('Event', EventSchema);
