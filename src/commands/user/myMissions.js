const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../database/models/User');
const GuildConfig = require('../../database/models/GuildConfig');
const { ensureTodayTasks } = require('../../utils/taskEngine');
const { isAdmin } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder().setName('مهامي').setDescription('عرض مهام اليوم وتقدمك فيها'),
  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للإدارة فقط.', ephemeral: true });
    }

    let userDoc = await User.findOne({ discordId: interaction.user.id });
    if (!userDoc) userDoc = new User({ discordId: interaction.user.id });

    const guildConfig = await GuildConfig.getSingleton();
    ensureTodayTasks(userDoc, guildConfig.currentDifficulty);
    await userDoc.save();

    const embed = new EmbedBuilder()
      .setTitle('📋 مهامك لهذا اليوم')
      .setColor(userDoc.dayCompletedToday ? 0x2ecc71 : 0x5865f2)
      .setDescription(
        userDoc.currentTasks.map(t => {
          const icon = t.completed ? '✅' : '🔲';
          return `${icon} **${t.label}**\n> التقدم: ${t.progress}/${t.target}`;
        }).join('\n\n')
      )
      .setFooter({ text: userDoc.dayCompletedToday ? 'أنجزت جميع مهام اليوم 🎉' : `مستوى الصعوبة: ${guildConfig.currentDifficulty}` });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
