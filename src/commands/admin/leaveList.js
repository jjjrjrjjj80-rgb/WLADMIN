const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../database/models/User');
const { isOwnerOrSenior } = require('../../utils/permissions');

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

    const desc = onLeave.map(u => {
      const endsAt = new Date(u.currentLeave.startedAt.getTime() + u.currentLeave.durationHours * 3600000);
      return `<@${u.discordId}> — ${u.currentLeave.durationHours} ساعة — تنتهي <t:${Math.floor(endsAt.getTime() / 1000)}:R>`;
    }).join('\n');

    const embed = new EmbedBuilder().setTitle('🟡 الإداريون في إجازة حاليًا').setDescription(desc).setColor(0xf1c40f);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
