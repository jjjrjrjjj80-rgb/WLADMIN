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
  data: new SlashCommandBuilder().setName('اجازات_الحاليه').setDescription('عرض قائمة الإداريين في إجازة حاليًا'),
  async execute(interaction) {
    if (!isOwnerOrSenior(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للرتب العليا والأونر فقط.', ephemeral: true });
    }
    const onLeave = await User.find({ onLeave: true });
    if (onLeave.length === 0) {
      return interaction.reply({ content: 'لا يوجد أحد في إجازة حاليًا. ✅', ephemeral: true });
    }
    const lines = onLeave.map(u => {
      const endsAt = new Date(u.currentLeave.startedAt.getTime() + u.currentLeave.durationDays * 86400000);
      return `<@${u.discordId}> — ${u.currentLeave.durationDays} يوم — تنتهي <t:${Math.floor(endsAt.getTime() / 1000)}:R>`;
    });

    const chunks = splitIntoChunks(lines);
    const embeds = chunks.map((chunk, i) => {
      const embed = new EmbedBuilder().setColor(0xf1c40f).setDescription(chunk);
      if (i === 0) embed.setTitle('🟡 الإداريون في إجازة حاليًا');
      return embed;
    });

    await interaction.reply({ embeds: embeds.slice(0, 10), ephemeral: true });
    for (let i = 10; i < embeds.length; i += 10) {
      await interaction.followUp({ embeds: embeds.slice(i, i + 10), ephemeral: true });
    }
  }
};
