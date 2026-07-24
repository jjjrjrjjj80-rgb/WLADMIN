const cron = require('node-cron');
const config = require('../config');
const User = require('../database/models/User');
const GuildConfig = require('../database/models/GuildConfig');
const { buildTasksForDifficulty } = require('../utils/taskEngine');
const { todayKey } = require('../utils/dateUtils');
const { isAdmin } = require('../utils/permissions');
const { sendAdminLog } = require('../utils/logger');
const { finalizeLeave } = require('../handlers/leaveHandler');

function start(client) {
  // ==== الرول اليومي: يفحص إنجاز الأمس، يحسب الأيام، ويولد مهام اليوم الجديد ====
  // يشتغل يوميًا الساعة 00:00 بتوقيت السعودية
  cron.schedule('0 0 * * *', async () => {
    console.log('⏰ بداية اليوم الجديد - تشغيل الرول اليومي...');
    const guild = client.guilds.cache.get(config.GUILD_ID);
    if (!guild) return;

    const guildConfig = await GuildConfig.getSingleton();
    const newDifficulty = guildConfig.nextDifficulty || config.DEFAULT_DIFFICULTY;
    guildConfig.currentDifficulty = newDifficulty;
    guildConfig.nextDifficulty = null;
    await guildConfig.save();

    await guild.members.fetch();
    const adminMembers = guild.members.cache.filter(m => isAdmin(m));

    const today = todayKey();
    let completedCount = 0;

    for (const [id] of adminMembers) {
      let userDoc = await User.findOne({ discordId: id });
      if (!userDoc) userDoc = new User({ discordId: id });

      // إذا أنجز مهام اليوم السابق يُحسب له يوم
      if (userDoc.dayCompletedToday) {
        userDoc.days += 1;
        completedCount += 1;
      }

      // توليد مهام اليوم الجديد
      userDoc.lastTaskDate = today;
      userDoc.dayCompletedToday = false;
      userDoc.currentTasks = buildTasksForDifficulty(newDifficulty);
      await userDoc.save();
    }

    sendAdminLog(guild, `🌅 بدأ يوم جديد. تم احتساب يوم لـ **${completedCount}** إداري. مستوى مهام اليوم: **${newDifficulty}**`);
  }, { timezone: config.TIMEZONE });

  // ==== تصفير التوب الأسبوعي كل يوم سبت ====
  cron.schedule('0 0 * * 6', async () => {
    console.log('🔄 تصفير التوب الأسبوعي...');
    await User.updateMany({}, { $set: { weeklyXP: 0 } });
    const guild = client.guilds.cache.get(config.GUILD_ID);
    if (guild) sendAdminLog(guild, '🔄 تم تصفير توب التفاعل الأسبوعي.');
  }, { timezone: config.TIMEZONE });

  // ==== فحص الإجازات المنتهية كل 5 دقائق ====
  cron.schedule('*/5 * * * *', async () => {
    const guild = client.guilds.cache.get(config.GUILD_ID);
    if (!guild) return;

    const onLeaveUsers = await User.find({ onLeave: true });
    const now = Date.now();

    for (const u of onLeaveUsers) {
      const endsAt = u.currentLeave.startedAt.getTime() + u.currentLeave.durationHours * 3600000;
      if (now >= endsAt) {
        await finalizeLeave(guild, u.discordId, { endType: 'completed' });
      }
    }
  }, { timezone: config.TIMEZONE });
}

module.exports = { start };
