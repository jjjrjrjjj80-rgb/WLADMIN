const Warning = require('../database/models/Warning');

// تفحص كل دقيقة التحذيرات النشطة اللي خلصت مدتها، تسحب رتبها بصمت (بدون رسالة خاصة)
function startWarningExpiryCron(client) {
  async function checkExpired() {
    const expired = await Warning.find({ active: true, expiresAt: { $lte: new Date() } });

    for (const warning of expired) {
      try {
        const guild = client.guilds.cache.get(warning.guildId);
        if (guild && warning.roleId) {
          const member = await guild.members.fetch(warning.userId).catch(() => null);
          if (member) await member.roles.remove(warning.roleId).catch(() => null);
        }
      } finally {
        warning.active = false;
        await warning.save();
      }
    }
  }

  checkExpired();
  setInterval(checkExpired, 60 * 1000);
}

