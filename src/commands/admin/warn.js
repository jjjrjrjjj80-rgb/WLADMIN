const { SlashCommandBuilder } = require('discord.js');
const Warning = require('../../database/models/Warning');
const { isAdmin } = require('../../utils/permissions');
const { parseDurationMs } = require('../../utils/duration');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('تحذير')
    .setDescription('إصدار تحذير إداري لعضو')
    .addUserOption(opt => opt.setName('الإداري').setDescription('الإداري المراد تحذيره').setRequired(true))
    .addStringOption(opt => opt.setName('السبب').setDescription('سبب التحذير').setRequired(true))
    .addStringOption(opt => opt.setName('المدة').setDescription('مثل 4d أو 12h أو 30m').setRequired(true)),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للإدارة فقط.', ephemeral: true });
    }

    const target = interaction.options.getUser('الإداري');
    const reason = interaction.options.getString('السبب');
    const durationInput = interaction.options.getString('المدة');

    const durationMs = parseDurationMs(durationInput);
    if (!durationMs) {
      return interaction.reply({
        content: '❌ صيغة المدة غير صحيحة. استخدم مثل: 30m / 12h / 4d / 1w',
        ephemeral: true,
      });
    }

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: '❌ ما لقيت هذا العضو بالسيرفر.', ephemeral: true });
    }

    // عدد التحذيرات النشطة قبل هذا التحذير
    const activeCountBefore = await Warning.countDocuments({ userId: target.id, guildId: interaction.guild.id, active: true });
    const newCount = activeCountBefore + 1;
    const level = Math.min(newCount, 3);
    const roleId = config.WARNING_ROLE_IDS[level];

    if (roleId) {
      await member.roles.add(roleId).catch(() => null);
    }

    await Warning.create({
      guildId: interaction.guild.id,
      userId: target.id,
      reason,
      level,
      roleId,
      issuedBy: interaction.user.id,
      expiresAt: new Date(Date.now() + durationMs),
    });

    const dmText =
      `⚠️ تم تسجيل تحذير إداري [${newCount}/3]\n\n` +
      `السبب: ${reason}\n\n` +
      `يرجى الالتزام بالأنظمة لتجنب العقوبات.\n` +
      `<@${target.id}>`;

    await target.send(dmText).catch(() => null);

    await interaction.reply({
      content: `✅ تم تسجيل تحذير على <@${target.id}> [${newCount}/3]\nالسبب: ${reason}\nالمدة: ${durationInput}`,
      ephemeral: true,
    });

    // تنبيه الإدارة العليا عند وصول 3 تحذيرات نشطة أو أكثر
    if (newCount >= 3 && config.WARNING_ALERT_CHANNEL_ID) {
      const alertChannel = await interaction.guild.channels.fetch(config.WARNING_ALERT_CHANNEL_ID).catch(() => null);
      if (alertChannel) {
        const mentions = config.TOP_ADMIN_ROLE_IDS.map(id => `<@&${id}>`).join(' ');
        await alertChannel.send(
          `🚨 تنبيه: العضو <@${target.id}> وصل لـ ${newCount} تحذيرات نشطة!\n` +
          `آخر سبب: ${reason}\n` +
          `${mentions}\n` +
          `يرجى اتخاذ الإجراء المناسب.`
        ).catch(() => null);
      }
    }
  },
};
