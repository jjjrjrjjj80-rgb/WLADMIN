const { SlashCommandBuilder } = require('discord.js');
const User = require('../../database/models/User');
const { isOwnerOrSenior } = require('../../utils/permissions');
const { sendAdminLog } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('تصفير_ايام')
    .setDescription('تصفير عدد أيام إداري معين')
    .addUserOption(opt => opt.setName('الشخص').setDescription('الإداري').setRequired(true)),
  async execute(interaction) {
    if (!isOwnerOrSenior(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للرتب العليا والأونر فقط.', ephemeral: true });
    }
    const target = interaction.options.getUser('الشخص');
    await User.findOneAndUpdate({ discordId: target.id }, { $set: { days: 0 } }, { upsert: true });

    sendAdminLog(interaction.guild, `🔄 قام <@${interaction.user.id}> بتصفير أيام <@${target.id}>`);
    await interaction.reply({ content: `✅ تم تصفير أيام <@${target.id}>`, ephemeral: true });
  }
};
