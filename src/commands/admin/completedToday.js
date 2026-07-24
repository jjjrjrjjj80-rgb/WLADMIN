const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../database/models/User');
const { isOwnerOrSenior, isAdmin } = require('../../utils/permissions');
const { todayKey } = require('../../utils/dateUtils');

module.exports = {
  data: new SlashCommandBuilder().setName('منجزين_اليوم').setDescription('عرض من أنجز مهام اليوم ومن لم ينجز'),
  async execute(interaction) {
    if (!isOwnerOrSenior(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للرتب العليا والأونر فقط.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    await guild.members.fetch();
    const adminMembers = guild.members.cache.filter(m => isAdmin(m));

    const today = todayKey();
    const users = await User.find({ discordId: { $in: [...adminMembers.keys()] } });
    const userMap = new Map(users.map(u => [u.discordId, u]));

    const completed = [];
    const notCompleted = [];

    for (const [id] of adminMembers) {
      const u = userMap.get(id);
      const done = u && u.lastTaskDate === today && u.dayCompletedToday;
      if (done) completed.push(id); else notCompleted.push(id);
    }

    const embed = new EmbedBuilder()
      .setTitle('📊 حالة إنجاز مهام اليوم')
      .addFields(
        { name: `✅ أنجزوا (${completed.length})`, value: completed.length ? completed.map(id => `<@${id}>`).join('\n') : 'لا أحد بعد' },
        { name: `❌ لم ينجزوا (${notCompleted.length})`, value: notCompleted.length ? notCompleted.map(id => `<@${id}>`).join('\n') : 'الجميع أنجز 🎉' }
      )
      .setColor(0x5865f2)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
