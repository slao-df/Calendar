const { Schema, model } = require("mongoose");

const SharedCalendarSchema = new Schema({
  calendarId: {
    type: Schema.Types.ObjectId,
    ref: "Calendar",
    required: true,
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  shareLink: {
    type: String,
    unique: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = model("SharedCalendar", SharedCalendarSchema);