const { SlashCommandBuilder } = require('discord.js');
const { isOwnerOrSenior } = require('../../utils/permissions');
const { sendLeaveLog } = require('../../utils/logger');
const { getOrCreateUser } = require('../../handlers/leaveHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('اضافة_ايام_اجازة')
    .setDescription('إضافة أيام إجازة لإداري')
    .addUserOption(opt => opt.setName('الشخص').setDescription('الإداري').setRequired(true))
    .addIntegerOption(opt => opt.setName('العدد').setDescription('عدد الأيام').setRequired(true).setMinValue(1)),
  async execute(interaction) {
    if (!isOwnerOrSenior(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للرتب العليا والأونر فقط.', ephemeral: true });
    }
    const target = interaction.options.getUser('الشخص');
    const amount = interaction.options.getInteger('العدد');

    const userDoc = await getOrCreateUser(target.id);
    userDoc.leaveDaysRemaining += amount;
    await userDoc.save();

    sendLeaveLog(interaction.guild, { content: `➕ قام <@${interaction.user.id}> بإضافة ${amount} يوم إجازة لـ <@${target.id}> (الرصيد الآن: ${userDoc.leaveDaysRemaining})` });
    await interaction.reply({ content: `✅ تمت الإضافة. رصيد <@${target.id}> الآن: **${userDoc.leaveDaysRemaining}** يوم`, ephemeral: true });
  }
};
