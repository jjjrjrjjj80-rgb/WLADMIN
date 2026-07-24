const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const TicketType = require('../../database/models/TicketType');
const { isOwnerOrSenior } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder().setName('قائمة_انواع_التكتات').setDescription('عرض كل أنواع التذاكر المتاحة'),
  async execute(interaction) {
    if (!isOwnerOrSenior(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للرتب العليا والأونر فقط.', ephemeral: true });
    }
    const types = await TicketType.find();
    if (types.length === 0) return interaction.reply({ content: 'لا توجد أنواع تذاكر بعد. استخدم /اضافة_نوع_تكت', ephemeral: true });

    const desc = types.map(t => `${t.emoji} **${t.label}** — مفتاح: \`${t.key}\` — كاتيجوري: <#${t.categoryId}>`).join('\n');
    const embed = new EmbedBuilder().setTitle('📂 أنواع التذاكر المتاحة').setDescription(desc).setColor(0x8a63f2);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
