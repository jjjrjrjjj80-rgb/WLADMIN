const { SlashCommandBuilder } = require('discord.js');
const User = require('../../database/models/User');
const { isOwnerOrSenior } = require('../../utils/permissions');
const { sendAdminLog } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('اضافة_ايام')
    .setDescription('إضافة أيام لإداري معين')
    .addUserOption(opt => opt.setName('الشخص').setDescription('الإداري').setRequired(true))
    .addIntegerOption(opt => opt.setName('العدد').setDescription('عدد الأيام المضافة').setRequired(true).setMinValue(1)),
  async execute(interaction) {
    if (!isOwnerOrSenior(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للرتب العليا والأونر فقط.', ephemeral: true });
    }
    const target = interaction.options.getUser('الشخص');
    const amount = interaction.options.getInteger('العدد');
    await User.findOneAndUpdate({ discordId: target.id }, { $inc: { days: amount } }, { upsert: true });

    sendAdminLog(interaction.guild, `➕ قام <@${interaction.user.id}> بإضافة ${amount} يوم لـ <@${target.id}>`);
    await interaction.reply({ content: `✅ تمت إضافة ${amount} يوم لـ <@${target.id}>`, ephemeral: true });
  }
};
