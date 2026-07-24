const { SlashCommandBuilder } = require('discord.js');
const User = require('../../database/models/User');
const TicketType = require('../../database/models/TicketType');
const { isOwnerOrSenior } = require('../../utils/permissions');
const { sendAdminLog } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('خصم_تكتات')
    .setDescription('خصم عدد تذاكر يدويًا من إداري معين')
    .addUserOption(opt => opt.setName('الشخص').setDescription('الإداري').setRequired(true))
    .addStringOption(opt => opt.setName('النوع').setDescription('مفتاح نوع التذكرة (شوفه بـ /قائمة_انواع_التكتات)').setRequired(true))
    .addIntegerOption(opt => opt.setName('العدد').setDescription('العدد المخصوم').setRequired(true).setMinValue(1)),
  async execute(interaction) {
    if (!isOwnerOrSenior(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للرتب العليا والأونر فقط.', ephemeral: true });
    }
    const target = interaction.options.getUser('الشخص');
    const key = interaction.options.getString('النوع').trim().toLowerCase();
    const amount = interaction.options.getInteger('العدد');

    const type = await TicketType.findOne({ key });
    if (!type) return interaction.reply({ content: '❌ نوع تذكرة غير موجود.', ephemeral: true });

    const userDoc = await User.findOne({ discordId: target.id });
    const current = userDoc?.ticketsClaimed?.get ? (userDoc.ticketsClaimed.get(key) || 0) : 0;
    const newValue = Math.max(0, current - amount);

    await User.updateOne({ discordId: target.id }, { $set: { [`ticketsClaimed.${key}`]: newValue } }, { upsert: true });

    sendAdminLog(interaction.guild, `➖ قام <@${interaction.user.id}> بخصم ${amount} تذكرة (${type.label}) من <@${target.id}>`);
    await interaction.reply({ content: `✅ تم الخصم. القيمة الآن: **${newValue}**`, ephemeral: true });
  }
};
