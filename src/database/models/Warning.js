const mongoose = require('mongoose');

const WarningSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true, index: true },

  reason: { type: String, required: true },
  level: { type: Number, required: true }, // 1, 2, أو 3 - يحدد أي رتبة انعطت
  roleId: { type: String, default: null },

  issuedBy: { type: String, required: true },
  expiresAt: { type: Date, required: true },

  active: { type: Boolean, default: true },
  cancelledBy: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Warning', WarningSchema);
