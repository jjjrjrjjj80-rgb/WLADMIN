const mongoose = require('mongoose');
const config = require('../config');

async function connectDB() {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log('✅ MongoDB متصل بنجاح - البيانات محفوظة خارجيًا وآمنة');
  } catch (err) {
    console.error('❌ فشل الاتصال بقاعدة البيانات:', err);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ انقطع الاتصال بقاعدة البيانات، جاري المحاولة مجددًا...');
  });
}

module.exports = connectDB;
