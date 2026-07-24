const config = require('../config');
const User = require('../database/models/User');
const GuildConfig = require('../database/models/GuildConfig');
const Ticket = require('../database/models/Ticket');
const { isAdmin } = require('../utils/permissions');
const { ensureTodayTasks, checkAndMarkCompletion } = require('../utils/taskEngine');
const { sendAdminLog } = require('../utils/logger');

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    // ==== إلغاء مؤقّت الإغلاق التلقائي إذا رد فاتح التذكرة بعد "استدعاء العضو" ====
    const ticket = await Ticket.findOne({ channelId: message.channel.id, status: { $ne: 'closed' } });
    if (ticket && ticket.calledAt && message.author.id === ticket.openerId) {
      await Ticket.updateOne({ channelId: message.channel.id }, { $set: { calledAt: null } });
    }

    const member = message.member;
    if (!member) return;
    if (config.XP.ONLY_COUNT_ADMIN_ROLE && !isAdmin(member)) return;

    if (config.XP.COUNTED_CHANNEL_IDS.length > 0 &&
        !config.XP.COUNTED_CHANNEL_IDS.includes(message.channel.id)) {
      return;
    }

    const content = message.content.trim();
    if (content.length < config.XP.MIN_MESSAGE_LENGTH) return;

    let userDoc = await User.findOne({ discordId: member.id });
    if (!userDoc) userDoc = new User({ discordId: member.id });

    const nowTime = Date.now();
    const lastTime = userDoc.lastMessageAt ? userDoc.lastMessageAt.getTime() : 0;
    const cooldownMs = config.XP.COOLDOWN_SECONDS * 1000;
    const canCountXP = (nowTime - lastTime) >= cooldownMs;

    if (canCountXP) {
      userDoc.weeklyXP += config.XP.PER_MESSAGE;
      userDoc.allTimeXP += config.XP.PER_MESSAGE;
      userDoc.lastMessageAt = new Date();
    }

    const guildConfig = await GuildConfig.getSingleton();
    ensureTodayTasks(userDoc, guildConfig.currentDifficulty);

    let taskUpdated = false;
    for (const task of userDoc.currentTasks) {
      if (task.completed) continue;

      if (task.type === 'xp' && canCountXP) {
        task.progress += config.XP.PER_MESSAGE;
        if (task.progress >= task.target) { task.progress = task.target; task.completed = true; }
        taskUpdated = true;
      }

      if (task.type === 'phrase' && task.phrase && content === task.phrase) {
        const cdMs = (task.cooldownMinutes || 0) * 60 * 1000;
        const lastCounted = task.lastCountedAt ? task.lastCountedAt.getTime() : 0;
        if (nowTime - lastCounted >= cdMs) {
          task.progress += 1;
          task.lastCountedAt = new Date();
          if (task.progress >= task.target) { task.progress = task.target; task.completed = true; }
          taskUpdated = true;
        }
      }
    }

    const { justCompleted } = checkAndMarkCompletion(userDoc);

    if (canCountXP || taskUpdated || justCompleted) {
      await userDoc.save();
    }

    if (justCompleted) {
      message.channel.send({
        content: `🎉 <@${member.id}> أنجز جميع مهام اليوم! (اليوم رقم ${userDoc.days + 1} بانتظار تأكيد بداية اليوم الجديد)`
      }).catch(() => {});
      sendAdminLog(message.guild, `✅ **${member.user.tag}** أنجز جميع مهام اليوم.`);
    }
  }
};
