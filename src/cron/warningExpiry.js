const cron = require('node-cron');
const config = require('../config');
const Warning = require('../database/models/Warning');
const { sendAdminLog } = require('../utils/logger');

function start(client) {
  cron.schedule('*/5 * * * *', async () => {
    const guild = client.guilds.cache.get(config.GUILD_ID);
    if (!guild) return;

    const expired = await Warning.find({ status: 'active', expiresAt: { $lte: new Date() } });

    for (const warning of expired) {
      const member = await guild.members.fetch(warning.userId).catch(() => null);
      if (member) {
        await member.roles.remove(warning.roleId).catch(() => {});
      }
      warning.status = 'expired';
      await warning.save();

      sendAdminLog(guild, `⏰ انتهت مدة التحذير رقم **${warning.level}** لـ <@${warning.userId}> وتم رفعه تلقائيًا.`);
    }
  }, { timezone: config.TIMEZONE });
}

module.exports = start;
