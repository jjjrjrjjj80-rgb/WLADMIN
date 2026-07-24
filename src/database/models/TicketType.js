const mongoose = require('mongoose');

// نوع تذكرة (مثلا: دعم فني، رقابة، تفعيل) - يُدار بالكامل عبر أوامر البوت
const TicketTypeSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  emoji: { type: String, default: '🎫' },
  categoryId: { type: String, required: true },
  pingRoleId: { type: String, default: null }   // ⭐ جديد: الرتبة اللي تُمنشن وقت فتح هذا النوع
}, { timestamps: true });

module.exports = mongoose.model('TicketType', TicketTypeSchema);
