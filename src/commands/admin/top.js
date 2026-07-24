const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../database/models/User');
const { isOwnerOrSenior } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('توب')
    .setDescription('عرض توب الإدارة الأسبوعي حسب نقاط التفاعل')
    .addIntegerOption(opt => opt.setName('العدد').setDescription('عدد الأشخاص المعروضين (افتراضي 10)').setMinValue(1).setMaxValue(25)),
  async execute(interaction) {
    if (!isOwnerOrSenior(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للرتب العليا والأونر فقط.', ephemeral: true });
    }

    const limit = interaction.options.getInteger('العدد') || 10;
    const topUsers = await User.find({ weeklyXP: { $gt: 0 } }).sort({ weeklyXP: -1 }).limit(limit);

    if (topUsers.length === 0) {
      return interaction.reply({ content: 'لا يوجد بيانات تفاعل هذا الأسبوع بعد.', ephemeral: true });
    }

    const medals = ['🥇', '🥈', '🥉'];
    const desc = topUsers.map((u, i) => {
      const rank = medals[i] || `**${i + 1}.**`;
      return `${rank} <@${u.discordId}> — \`${u.weeklyXP}\` نقطة`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('🏆 توب الإدارة الأسبوعي')
      .setDescription(desc)
      .setColor(0xffd700)
      .setFooter({ text: 'يتصفر تلقائيًا كل يوم سبت' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
