const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
  channelId: { type: String, required: true, unique: true, index: true },
  guildId: String,
  ticketNumber: { type: Number, required: true },
  typeKey: { type: String, required: true },
  typeLabel: String,
  openerId: { type: String, required: true },

  claimedBy: { type: String, default: null },
  claimedAt: { type: Date, default: null },

  // وقت آخر "استدعاء" أُرسل للعضو - إذا ما رد خلال المهلة يُغلق تلقائيًا
  calledAt: { type: Date, default: null },

  status: { type: String, enum: ['open', 'claimed', 'closed'], default: 'open' },
  memberIds: { type: [String], default: [] },

  closedBy: String,
  closeReason: String,
  closedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Ticket', TicketSchema);
