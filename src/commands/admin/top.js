const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../database/models/User');
const { isAdmin } = require('../../utils/permissions');

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
    .setName('توب')
    .setDescription('عرض توب الإدارة الأسبوعي حسب نقاط التفاعل')
    .addIntegerOption(opt => opt.setName('العدد').setDescription('عدد الأشخاص المعروضين (افتراضي 10)').setMinValue(1).setMaxValue(25)),
  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للإدارة فقط.', ephemeral: true });
    }
    const limit = interaction.options.getInteger('العدد') || 10;
    const topUsers = await User.find({ weeklyXP: { $gt: 0 } }).sort({ weeklyXP: -1 }).limit(limit);
    if (topUsers.length === 0) {
      return interaction.reply({ content: 'لا يوجد بيانات تفاعل هذا الأسبوع بعد.', ephemeral: true });
    }
    const medals = ['🥇', '🥈', '🥉'];
    const lines = topUsers.map((u, i) => {
      const rank = medals[i] || `**${i + 1}.**`;
      return `${rank} <@${u.discordId}> — \`${u.weeklyXP}\` نقطة`;
    });

    const chunks = splitIntoChunks(lines);
    const embeds = chunks.map((chunk, i) => {
      const embed = new EmbedBuilder().setColor(0xffd700).setDescription(chunk);
      if (i === 0) embed.setTitle('🏆 توب الإدارة الأسبوعي');
      if (i === chunks.length - 1) embed.setFooter({ text: 'يتصفر تلقائيًا كل يوم سبت' }).setTimestamp();
      return embed;
    });

    // ديسكورد يسمح بحد أقصى 10 إمبيدات بالرسالة الواحدة
    await interaction.reply({ embeds: embeds.slice(0, 10) });
    for (let i = 10; i < embeds.length; i += 10) {
      await interaction.followUp({ embeds: embeds.slice(i, i + 10) });
    }
  }
};
