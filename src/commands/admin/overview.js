const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../database/models/User');
const TicketType = require('../../database/models/TicketType');
const { isOwnerOrSenior, isAdmin } = require('../../utils/permissions');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('نبذة')
    .setDescription('عرض إحصائيات إداري (لنفسك، أو لأي أحد إذا كنت من الرتب العليا)')
    .addUserOption(opt => opt.setName('الشخص').setDescription('الإداري (اتركه فارغًا لعرض نبذتك أنت)')),
  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للإدارة فقط.', ephemeral: true });
    }
    const target = interaction.options.getUser('الشخص') || interaction.user;
    if (target.id !== interaction.user.id && !isOwnerOrSenior(interaction.member)) {
      return interaction.reply({ content: '❌ تقدر تسوي نبذة لنفسك فقط. الرتب العليا والأونر بس يقدرون يشوفون نبذة أي أحد.', ephemeral: true });
    }
    const userDoc = await User.findOne({ discordId: target.id });
    if (!userDoc) {
      return interaction.reply({ content: 'لا يوجد بيانات مسجلة لهذا الشخص بعد.' });
    }
    const tasksStatus = userDoc.currentTasks.map(t => `${t.completed ? '✅' : '🔲'} ${t.label} (${t.progress}/${t.target})`).join('\n') || 'لا توجد مهام مولّدة بعد';
    const types = await TicketType.find();
    let ticketsTotal = 0;
    const ticketsLines = types.map(t => {
      const c = userDoc.ticketsClaimed?.get ? (userDoc.ticketsClaimed.get(t.key) || 0) : 0;
      ticketsTotal += c;
      return `${t.emoji} ${t.label}: ${c}`;
    }).join(' | ') || 'لا يوجد';
    const embed = new EmbedBuilder()
      .setTitle(`📄 نبذة عن ${target.username}`)
      .addFields(
        { name: 'أيام منجزة', value: `${userDoc.days}`, inline: true },
        { name: 'نقاط الأسبوع', value: `${userDoc.weeklyXP}`, inline: true },
        { name: 'نقاط كلية', value: `${userDoc.allTimeXP}`, inline: true },
        { name: 'حالة اليوم', value: userDoc.dayCompletedToday ? '✅ أنجز' : '❌ لم ينجز بعد', inline: true },
        { name: 'رصيد الإجازة', value: `${userDoc.leaveDaysRemaining} يوم`, inline: true },
        { name: 'حالة الإجازة', value: userDoc.onLeave ? '🟡 في إجازة الآن' : '🟢 متاح', inline: true },
        { name: 'مهام اليوم', value: tasksStatus },
        { name: `التذاكر المستلمة (المجموع: ${ticketsTotal})`, value: ticketsLines }
      )
      .setColor(0x8a63f2)
      .setThumbnail(target.displayAvatarURL())
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }
};
