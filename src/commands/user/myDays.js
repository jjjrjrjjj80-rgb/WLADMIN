const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../database/models/User');
const { isAdmin } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder().setName('ايامي').setDescription('عرض عدد أيام تواجدك المنجزة'),
  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للإدارة فقط.', ephemeral: true });
    }
    const userDoc = await User.findOne({ discordId: interaction.user.id });
    const days = userDoc?.days || 0;

    const embed = new EmbedBuilder()
      .setTitle('📅 أيامي')
      .setDescription(`لديك **${days}** يوم منجز حتى الآن.`)
      .setColor(0x5865f2);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
