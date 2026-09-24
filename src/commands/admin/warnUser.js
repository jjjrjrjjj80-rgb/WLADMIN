const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const Warning = require('../../database/models/Warning');
const { isOwnerOrSenior } = require('../../utils/permissions');
const { sendAdminLog } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('تحذير')
    .setDescription('إعطاء تحذير إداري لشخص معين')
    .addUserOption(opt => opt.setName('الشخص').setDescription('الإداري المطلوب تحذيره').setRequired(true))
    .addStringOption(opt => opt.setName('السبب').setDescription('سبب التحذير').setRequired(true))
    .addIntegerOption(opt => opt.setName('المدة_ايام').setDescription('مدة التحذير بالأيام').setRequired(true).setMinValue(1)),
  async execute(interaction) {
    if (!isOwnerOrSenior(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للرتب العليا والأونر فقط.', ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser('الشخص');
    const reason = interaction.options.getString('السبب');
    const durationDays = interaction.options.getInteger('المدة_ايام');
    const guild = interaction.guild;

    const activeWarnings = await Warning.find({ guildId: guild.id, userId: target.id, status: 'active' });

    // ⭐ لو معه 3 تحذيرات نشطة بالفعل - ننبه العليا بروم منفصل بدل ما نضيف تحذير رابع
    if (activeWarnings.length >= 3) {
      const alertChannel = guild.channels.cache.get(config.WARNING_ALERT_CHANNEL_ID);
      const mentions = config.TOP_ADMIN_ROLE_IDS.map(id => `<@&${id}>`).join(' ');
      if (alertChannel) {
        await alertChannel.send({
          content: `${mentions}\n🚨 <@${target.id}> وصل للحد الأقصى من التحذيرات (3/3) وحاول <@${interaction.user.id}> إعطاءه تحذير إضافي.\n**السبب المطروح:** ${reason}\nيرجى اتخاذ الإجراء المناسب.`
        }).catch(() => {});
      }
      return interaction.editReply({ content: `⚠️ هذا الشخص وصل بالفعل للحد الأقصى (3/3). تم إرسال تنبيه للعليا لاتخاذ إجراء بدلًا من إضافة تحذير رابع.` });
    }

    // نحدد أصغر رقم تحذير غير مستخدم حاليًا (1 أو 2 أو 3)
    const usedLevels = activeWarnings.map(w => w.level);
    const level = [1, 2, 3].find(l => !usedLevels.includes(l));

    const roleId = config.WARNING_ROLE_IDS[level];
    if (!roleId) {
      return interaction.editReply({ content: `❌ رتبة التحذير رقم ${level} غير معرّفة بمتغيرات البيئة (WARNING_ROLE_${level}).` });
    }

    const member = await guild.members.fetch(target.id).catch(() => null);
    if (member) {
      await member.roles.add(roleId).catch(() => {});
    }

    const expiresAt = new Date(Date.now() + durationDays * 86400000);
    await Warning.create({
      guildId: guild.id,
      userId: target.id,
      level,
      reason,
      issuedById: interaction.user.id,
      roleId,
      expiresAt
    });

    member?.send(
      `⚠️ تم تسجيل تحذير إداري [${level}/3]\n\n` +
      `السبب: ${reason}\n\n` +
      `يرجى الالتزام بالأنظمة لتجنب العقوبات.`
    ).catch(() => {});

    sendAdminLog(guild, `⚠️ <@${interaction.user.id}> أعطى تحذير رقم **${level}/3** لـ <@${target.id}> لمدة **${durationDays}** يوم\n**السبب:** ${reason}`);

    await interaction.editReply({ content: `✅ تم تسجيل التحذير رقم **${level}/3** لـ <@${target.id}> لمدة ${durationDays} يوم.` });
  }
};
