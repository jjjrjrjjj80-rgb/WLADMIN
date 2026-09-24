const { SlashCommandBuilder } = require('discord.js');
const Warning = require('../../database/models/Warning');
const { isOwnerOrSenior } = require('../../utils/permissions');
const { sendAdminLog } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('الغاء_تحذير')
    .setDescription('إلغاء تحذير محدد عن إداري')
    .addUserOption(opt => opt.setName('الشخص').setDescription('الإداري المطلوب إلغاء تحذيره').setRequired(true))
    .addIntegerOption(opt =>
      opt.setName('رقم_التحذير').setDescription('رقم التحذير المطلوب إلغاؤه').setRequired(true)
        .addChoices(
          { name: '1', value: 1 },
          { name: '2', value: 2 },
          { name: '3', value: 3 }
        )
    ),
  async execute(interaction) {
    if (!isOwnerOrSenior(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للرتب العليا والأونر فقط.', ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser('الشخص');
    const level = interaction.options.getInteger('رقم_التحذير');
    const guild = interaction.guild;

    const warning = await Warning.findOne({ guildId: guild.id, userId: target.id, level, status: 'active' });
    if (!warning) {
      return interaction.editReply({ content: `⚠️ لا يوجد تحذير رقم **${level}** نشط حاليًا لهذا الشخص.` });
    }

    const member = await guild.members.fetch(target.id).catch(() => null);
    if (member) {
      await member.roles.remove(warning.roleId).catch(() => {});
    }

    warning.status = 'canceled';
    warning.canceledById = interaction.user.id;
    warning.canceledAt = new Date();
    await warning.save();

    const remainingCount = await Warning.countDocuments({ guildId: guild.id, userId: target.id, status: 'active' });

    member?.send(
      `✅ تم إعفاؤك من تحذير إداري.\n` +
      `العدد الحالي: [${remainingCount}/3]\n` +
      `نتمنى لك التوفيق.`
    ).catch(() => {});

    sendAdminLog(guild, `✅ <@${interaction.user.id}> ألغى التحذير رقم **${level}** عن <@${target.id}>. العدد الحالي: **${remainingCount}/3**`);

    await interaction.editReply({ content: `✅ تم إلغاء التحذير رقم **${level}** عن <@${target.id}>. العدد الحالي: ${remainingCount}/3` });
  }
};
