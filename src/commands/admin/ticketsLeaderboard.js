const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../database/models/User');
const { isOwnerOrSenior } = require('../../utils/permissions');

// يقسم قائمة أسطر طويلة لعدة أجزاء، كل جزء أقل من 4000 حرف (أمان تحت حد 4096 لوصف الإمبيد)
function splitIntoChunks(lines, maxLen = 4000) {
  const chunks = [];
  let current = '';
  for (const line of lines) {
    if ((current + '\n' + line).length > maxLen) {
      if (current) chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

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
    const lines = withTotals.map((u, i) => {
      const rank = medals[i] || `**${i + 1}.**`;
      return `${rank} <@${u.discordId}> — \`${u.total}\` تذكرة`;
    });

    const chunks = splitIntoChunks(lines);
    const embeds = chunks.map((chunk, i) => {
      const embed = new EmbedBuilder().setColor(0x8a63f2).setDescription(chunk);
      if (i === 0) embed.setTitle('🎫 قائمة التذاكر المستلمة — كل الإدارة');
      if (i === chunks.length - 1) embed.setTimestamp();
      return embed;
    });

    await interaction.reply({ embeds: embeds.slice(0, 10), ephemeral: true });
    for (let i = 10; i < embeds.length; i += 10) {
      await interaction.followUp({ embeds: embeds.slice(i, i + 10), ephemeral: true });
    }
  }
};
