const mongoose = require('mongoose');

const WarningSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  level: { type: Number, required: true, enum: [1, 2, 3] }, // رقم التحذير (1 أو 2 أو 3)
  reason: { type: String, required: true },
  issuedById: { type: String, required: true },
  roleId: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  status: { type: String, enum: ['active', 'canceled', 'expired'], default: 'active' },
  canceledById: { type: String, default: null },
  canceledAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Warning', WarningSchema);
