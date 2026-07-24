const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../database/models/User');
const { isOwnerOrSenior } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('نبذة')
    .setDescription('عرض إحصائيات إداري معين')
    .addUserOption(opt => opt.setName('الشخص').setDescription('الإداري').setRequired(true)),
  async execute(interaction) {
    if (!isOwnerOrSenior(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للرتب العليا والأونر فقط.', ephemeral: true });
    }

    const target = interaction.options.getUser('الشخص');
    const userDoc = await User.findOne({ discordId: target.id });

    if (!userDoc) {
      return interaction.reply({ content: 'لا يوجد بيانات مسجلة لهذا الشخص بعد.', ephemeral: true });
    }

    const tasksStatus = userDoc.currentTasks.map(t => `${t.completed ? '✅' : '🔲'} ${t.label} (${t.progress}/${t.target})`).join('\n') || 'لا توجد مهام مولّدة بعد';

    const embed = new EmbedBuilder()
      .setTitle(`📄 نبذة عن ${target.username}`)
      .addFields(
        { name: 'أيام منجزة', value: `${userDoc.days}`, inline: true },
        { name: 'نقاط الأسبوع', value: `${userDoc.weeklyXP}`, inline: true },
        { name: 'نقاط كلية', value: `${userDoc.allTimeXP}`, inline: true },
        { name: 'حالة اليوم', value: userDoc.dayCompletedToday ? '✅ أنجز' : '❌ لم ينجز بعد', inline: true },
        { name: 'رصيد الإجازة', value: `${userDoc.leaveHoursRemaining} ساعة`, inline: true },
        { name: 'حالة الإجازة', value: userDoc.onLeave ? '🟡 في إجازة الآن' : '🟢 متاح', inline: true },
        { name: 'مهام اليوم', value: tasksStatus }
      )
      .setColor(0x5865f2)
      .setThumbnail(target.displayAvatarURL())
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
