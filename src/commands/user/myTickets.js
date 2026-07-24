const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../database/models/User');
const TicketType = require('../../database/models/TicketType');
const { isAdmin } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder().setName('تكتاتي').setDescription('عرض عدد التذاكر التي استلمتها حسب النوع'),
  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للإدارة فقط.', ephemeral: true });
    }

    const userDoc = await User.findOne({ discordId: interaction.user.id });
    const claimed = userDoc?.ticketsClaimed || new Map();
    const types = await TicketType.find();

    let total = 0;
    const lines = [];
    for (const t of types) {
      const count = claimed.get ? (claimed.get(t.key) || 0) : (claimed[t.key] || 0);
      total += count;
      lines.push(`${t.emoji} **${t.label}:** ${count}`);
    }

    const embed = new EmbedBuilder()
      .setTitle('🎫 تذاكري المستلمة')
      .setDescription(lines.length ? lines.join('\n') + `\n\n**المجموع الكلي:** ${total}` : 'لا توجد بيانات بعد.')
      .setColor(0x8a63f2);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
