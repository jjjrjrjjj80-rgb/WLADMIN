const mongoose = require('mongoose');
const config = require('../../config');

const TaskSchema = new mongoose.Schema({
  type: { type: String, enum: ['xp', 'tickets', 'phrase'], required: true },
  label: String,
  target: Number,
  progress: { type: Number, default: 0 },
  phrase: String,
  cooldownMinutes: Number,
  lastCountedAt: Date,
  completed: { type: Boolean, default: false }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true, index: true },

  // ==== نقاط التفاعل ====
  weeklyXP: { type: Number, default: 0 },
  allTimeXP: { type: Number, default: 0 },
  lastMessageAt: { type: Date, default: null },

  // ==== الأيام والمهام ====
  days: { type: Number, default: 0 },
  dayCompletedToday: { type: Boolean, default: false },
  lastTaskDate: { type: String, default: null },
  currentTasks: { type: [TaskSchema], default: [] },

  // ==== التذاكر المستلمة (حسب نوع التذكرة - مفتاح TicketType) ====
  ticketsClaimed: { type: Map, of: Number, default: {} },

  // ==== الإجازات (بالأيام) ====
  leaveDaysRemaining: { type: Number, default: config.LEAVE.MONTHLY_DAYS },
  lastLeaveMonthKey: { type: String, default: null },
  onLeave: { type: Boolean, default: false },
  currentLeave: {
    requestId: String,
    durationDays: Number,
    startedAt: Date,
    reason: String
  },
  savedRolesForLeave: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
