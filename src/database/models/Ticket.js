const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
  channelId: { type: String, required: true, unique: true, index: true },
  guildId: String,
  ticketNumber: { type: Number, required: true },
  ticketType: String,
  openerId: { type: String, required: true },

  // claimedBy يبقى null لحد ما أول إداري يضغط "استلام" - نستخدم عملية ذرية عشان
  // ما يصير قلتش لو ضغط اثنين بنفس اللحظة
  claimedBy: { type: String, default: null },
  claimedAt: { type: Date, default: null },

  status: { type: String, enum: ['open', 'claimed', 'closed'], default: 'open' },
  memberIds: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', TicketSchema);
