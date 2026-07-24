const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../database/models/User');
const { isOwnerOrSenior } = require('../../utils/permissions');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('قائمة_تكتات')
    .setDescription('عرض عدد التذاكر المستلمة لكل إداري، مرتبة من الأعلى للأقل'),
  async execute(interaction) {
    if (!isOwnerOrSenior(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للرتب العليا والأونر فقط.', ephemeral: true });
    }
    const users = await User.find({});
    const withTotals = users.map(u => {
      let total = 0;
      if (u.ticketsClaimed) {
        for (const v of u.ticketsClaimed.values()) total += v;
      }
      return { discordId: u.discordId, total };
    }).filter(u => u.total > 0).sort((a, b) => b.total - a.total);

    if (withTotals.length === 0) {
      return interaction.reply({ content: 'لا توجد بيانات تذاكر مسجلة بعد.', ephemeral: true });
    }
    const medals = ['🥇', '🥈', '🥉'];
    const desc = withTotals.map((u, i) => {
      const rank = medals[i] || `**${i + 1}.**`;
      return `${rank} <@${u.discordId}> — \`${u.total}\` تذكرة`;
    }).join('\n');
    const embed = new EmbedBuilder()
      .setTitle('🎫 قائمة التذاكر المستلمة — كل الإدارة')
      .setDescription(desc)
      .setColor(0x8a63f2)
      .setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
