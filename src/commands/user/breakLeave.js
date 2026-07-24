const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../../database/models/User');

module.exports = {
  data: new SlashCommandBuilder().setName('كسر_اجازة').setDescription('كسر إجازتك الحالية قبل انتهائها'),
  async execute(interaction) {
    const userDoc = await User.findOne({ discordId: interaction.user.id });
    if (!userDoc || !userDoc.onLeave) {
      return interaction.reply({ content: '❌ أنت لست في إجازة حاليًا.', ephemeral: true });
    }

    const elapsedHours = Math.min(
      userDoc.currentLeave.durationHours,
      Math.round(((Date.now() - userDoc.currentLeave.startedAt.getTime()) / (1000 * 60 * 60)) * 100) / 100
    );

    const embed = new EmbedBuilder()
      .setTitle('⚠️ تأكيد كسر الإجازة')
      .setDescription(
        `مدة إجازتك الأصلية: **${userDoc.currentLeave.durationHours}** ساعة\n` +
        `الساعات المستخدمة فعليًا لحد الآن: **${elapsedHours}** ساعة\n` +
        `سيتم خصم **${elapsedHours}** ساعة فقط من رصيدك، والباقي يبقى محفوظ.`
      )
      .setColor(0xf1c40f);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('leave_break_confirm_self').setLabel('تأكيد كسر الإجازة').setStyle(ButtonStyle.Danger).setEmoji('🔴')
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }
};
