const { SlashCommandBuilder } = require('discord.js');
const { isOwnerOrSenior } = require('../../utils/permissions');
const { sendLeaveLog } = require('../../utils/logger');
const { getOrCreateUser } = require('../../handlers/leaveHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('خصم_ايام_اجازة')
    .setDescription('خصم أيام إجازة من إداري')
    .addUserOption(opt => opt.setName('الشخص').setDescription('الإداري').setRequired(true))
    .addIntegerOption(opt => opt.setName('العدد').setDescription('عدد الأيام').setRequired(true).setMinValue(1)),
  async execute(interaction) {
    if (!isOwnerOrSenior(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للرتب العليا والأونر فقط.', ephemeral: true });
    }
    const target = interaction.options.getUser('الشخص');
    const amount = interaction.options.getInteger('العدد');

    const userDoc = await getOrCreateUser(target.id);
    userDoc.leaveDaysRemaining = Math.max(0, userDoc.leaveDaysRemaining - amount);
    await userDoc.save();

    sendLeaveLog(interaction.guild, { content: `➖ قام <@${interaction.user.id}> بخصم ${amount} يوم إجازة من <@${target.id}> (الرصيد الآن: ${userDoc.leaveDaysRemaining})` });
    await interaction.reply({ content: `✅ تم الخصم. رصيد <@${target.id}> الآن: **${userDoc.leaveDaysRemaining}** يوم`, ephemeral: true });
  }
};
