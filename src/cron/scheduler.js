const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const User = require('../database/models/User');
const GuildConfig = require('../database/models/GuildConfig');
const Ticket = require('../database/models/Ticket');
const { buildTasksForDifficulty } = require('../utils/taskEngine');
const { todayKey } = require('../utils/dateUtils');
const { isAdmin } = require('../utils/permissions');
const { sendAdminLog } = require('../utils/logger');
const { finalizeLeave } = require('../handlers/leaveHandler');
const { closeTicketChannel } = require('../handlers/ticketHandler');

function start(client) {
  // ==== الرول اليومي ====
  cron.schedule('0 0 * * *', async () => {
    console.log('⏰ بداية اليوم الجديد - تشغيل الرول اليومي...');
    const guild = client.guilds.cache.get(config.GUILD_ID);
    if (!guild) return;
    const guildConfig = await GuildConfig.getSingleton();
    const newDifficulty = guildConfig.nextDifficulty || config.DEFAULT_DIFFICULTY;
    await guild.members.fetch();
    const adminMembers = guild.members.cache.filter(m => isAdmin(m));

    // ⭐ تقرير الإنجاز اليومي قبل تجدد المهام
    const completedList = [];
    const notCompletedList = [];
    for (const [id] of adminMembers) {
      const userDoc = await User.findOne({ discordId: id });
      if (userDoc && userDoc.dayCompletedToday) completedList.push(id);
      else notCompletedList.push(id);
    }
    if (guildConfig.reportChannelId) {
      const reportChannel = guild.channels.cache.get(guildConfig.reportChannelId);
      if (reportChannel) {
        const embed = new EmbedBuilder()
          .setTitle('📊 تقرير إنجاز المهام اليومية')
          .addFields(
            { name: `✅ أنجزوا (${completedList.length})`, value: completedList.length ? completedList.map(id => `<@${id}>`).join('\n') : 'لا أحد' },
            { name: `❌ لم ينجزوا (${notCompletedList.length})`, value: notCompletedList.length ? notCompletedList.map(id => `<@${id}>`).join('\n') : 'لا أحد' }
          )
          .setColor(0x8a63f2)
          .setTimestamp();
        await reportChannel.send({ embeds: [embed] }).catch((e) => console.error('فشل إرسال تقرير الإنجاز اليومي:', e));
      }
    }

    // ==== الآن تجدد المهام فعليًا ====
    guildConfig.currentDifficulty = newDifficulty;
    guildConfig.nextDifficulty = null;
    await guildConfig.save();
    const today = todayKey();
    let completedCount = 0;
    for (const [id] of adminMembers) {
      let userDoc = await User.findOne({ discordId: id });
      if (!userDoc) userDoc = new User({ discordId: id });
      if (userDoc.dayCompletedToday) {
        userDoc.days += 1;
        completedCount += 1;
      }
      userDoc.lastTaskDate = today;
      userDoc.dayCompletedToday = false;
      userDoc.currentTasks = buildTasksForDifficulty(newDifficulty);
      await userDoc.save();
    }
    sendAdminLog(guild, `🌅 بدأ يوم جديد. تم احتساب يوم لـ **${completedCount}** إداري. مستوى مهام اليوم: **${newDifficulty}**`);
  }, { timezone: config.TIMEZONE });
  // ==== تصفير التوب الأسبوعي كل سبت ====
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
      const endsAt = u.currentLeave.startedAt.getTime() + u.currentLeave.durationDays * 86400000;
      if (now >= endsAt) {
        await finalizeLeave(guild, u.discordId, { endType: 'completed' });
      }
    }
  }, { timezone: config.TIMEZONE });

  // ==== إغلاق تلقائي للتذاكر بدون رد بعد "استدعاء العضو" ====
  cron.schedule('* * * * *', async () => {
    const guild = client.guilds.cache.get(config.GUILD_ID);
    if (!guild) return;

    const pending = await Ticket.find({ calledAt: { $ne: null }, status: { $ne: 'closed' } });
    const now = Date.now();
    const timeoutMs = config.TICKET_CALL_TIMEOUT_MINUTES * 60 * 1000;

    for (const ticket of pending) {
      if (now - ticket.calledAt.getTime() >= timeoutMs) {
        const channel = guild.channels.cache.get(ticket.channelId);
        if (channel) {
          await closeTicketChannel(channel, guild, null, 'إغلاق تلقائي - لا يوجد رد من العضو خلال المهلة المحددة');
        }
      }
    }
  }, { timezone: config.TIMEZONE });
}

module.exports = { start };
