const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const LeaveRequestSchema = new mongoose.Schema({
  requestId: { type: String, default: uuidv4, unique: true },
  userId: { type: String, required: true },
  reason: { type: String, required: true },
  durationDays: { type: Number, required: true },

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'broken', 'completed'],
    default: 'pending'
  },

  requestedAt: { type: Date, default: Date.now },
  decidedBy: String,
  rejectReason: String,
  startedAt: Date,
  endedAt: Date,
  daysUsed: { type: Number, default: 0 },
  logMessageId: String
}, { timestamps: true });

module.exports = mongoose.model('LeaveRequest', LeaveRequestSchema);
