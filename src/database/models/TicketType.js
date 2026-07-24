const mongoose = require('mongoose');

// نوع تذكرة (مثلا: دعم فني، رقابة، تفعيل) - يُدار بالكامل عبر أوامر البوت
const TicketTypeSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // مفتاح قصير بالإنجليزي مثلا support
  label: { type: String, required: true },              // الاسم الظاهر للأعضاء
  emoji: { type: String, default: '🎫' },
  categoryId: { type: String, required: true }           // كاتيجوري ديسكورد اللي تنفتح فيه التذكرة
}, { timestamps: true });

module.exports = mongoose.model('TicketType', TicketTypeSchema);
