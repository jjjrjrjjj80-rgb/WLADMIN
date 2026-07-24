const { start } = require('../cron/scheduler');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    console.log(`✅ تم تسجيل الدخول باسم ${client.user.tag}`);
    start(client);
  }
};
