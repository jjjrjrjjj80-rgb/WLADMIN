const mongoose = require('mongoose');
const config = require('../../config');

const TaskSchema = new mongoose.Schema({
  type: { type: String, enum: ['xp', 'tickets', 'phrase'], required: true },
  label: String,
  target: Number,
  progress: { type: Number, default: 0 },
  phrase: String,
  cooldownMinutes: Number,
  lastCountedAt: Date, // للمهام من نوع phrase (كولداون خاص بالمهمة)
  completed: { type: Boolean, default: false }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true, index: true },

  // ==== نقاط التفاعل ====
  weeklyXP: { type: Number, default: 0 },
  allTimeXP: { type: Number, default: 0 },
  lastMessageAt: { type: Date, default: null }, // آخر رسالة محسوبة (كولداون السبام)

  // ==== الأيام والمهام ====
  days: { type: Number, default: 0 },
  dayCompletedToday: { type: Boolean, default: false },
  lastTaskDate: { type: String, default: null }, // YYYY-MM-DD آخر يوم انولدت له مهام
  currentTasks: { type: [TaskSchema], default: [] },

  // ==== الإجازات ====
  leaveHoursRemaining: { type: Number, default: config.LEAVE.MONTHLY_HOURS },
  lastLeaveMonthKey: { type: String, default: null }, // YYYY-MM آخر شهر تم تصفير الرصيد فيه
  onLeave: { type: Boolean, default: false },
  currentLeave: {
    requestId: String,
    durationHours: Number,
    startedAt: Date,
    reason: String
  },
  savedRolesForLeave: { type: [String], default: [] } // الرتب الإدارية المحفوظة وقت الإجازة عشان نرجعها
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
