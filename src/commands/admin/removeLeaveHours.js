const { SlashCommandBuilder } = require('discord.js');
const { isOwnerOrSenior } = require('../../utils/permissions');
const { sendLeaveLog } = require('../../utils/logger');
const { getOrCreateUser } = require('../../handlers/leaveHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('خصم_ساعات')
    .setDescription('خصم ساعات إجازة من إداري')
    .addUserOption(opt => opt.setName('الشخص').setDescription('الإداري').setRequired(true))
    .addIntegerOption(opt => opt.setName('العدد').setDescription('عدد الساعات').setRequired(true).setMinValue(1)),
  async execute(interaction) {
    if (!isOwnerOrSenior(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للرتب العليا والأونر فقط.', ephemeral: true });
    }
    const target = interaction.options.getUser('الشخص');
    const amount = interaction.options.getInteger('العدد');

    const userDoc = await getOrCreateUser(target.id);
    userDoc.leaveHoursRemaining = Math.max(0, userDoc.leaveHoursRemaining - amount);
    await userDoc.save();

    sendLeaveLog(interaction.guild, { content: `➖ قام <@${interaction.user.id}> بخصم ${amount} ساعة إجازة من <@${target.id}> (الرصيد الآن: ${userDoc.leaveHoursRemaining})` });
    await interaction.reply({ content: `✅ تم الخصم. رصيد <@${target.id}> الآن: **${userDoc.leaveHoursRemaining}** ساعة`, ephemeral: true });
  }
};
