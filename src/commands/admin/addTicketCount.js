const { SlashCommandBuilder } = require('discord.js');
const User = require('../../database/models/User');
const TicketType = require('../../database/models/TicketType');
const { isOwnerOrSenior } = require('../../utils/permissions');
const { sendAdminLog } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('اضافة_تكتات')
    .setDescription('إضافة عدد تذاكر يدويًا لإداري معين')
    .addUserOption(opt => opt.setName('الشخص').setDescription('الإداري').setRequired(true))
    .addStringOption(opt => opt.setName('النوع').setDescription('مفتاح نوع التذكرة (شوفه بـ /قائمة_انواع_التكتات)').setRequired(true))
    .addIntegerOption(opt => opt.setName('العدد').setDescription('العدد المضاف').setRequired(true).setMinValue(1)),
  async execute(interaction) {
    if (!isOwnerOrSenior(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للرتب العليا والأونر فقط.', ephemeral: true });
    }
    const target = interaction.options.getUser('الشخص');
    const key = interaction.options.getString('النوع').trim().toLowerCase();
    const amount = interaction.options.getInteger('العدد');

    const type = await TicketType.findOne({ key });
    if (!type) return interaction.reply({ content: '❌ نوع تذكرة غير موجود.', ephemeral: true });

    await User.updateOne({ discordId: target.id }, { $inc: { [`ticketsClaimed.${key}`]: amount } }, { upsert: true });

    sendAdminLog(interaction.guild, `➕ قام <@${interaction.user.id}> بإضافة ${amount} تذكرة (${type.label}) لـ <@${target.id}>`);
    await interaction.reply({ content: `✅ تمت الإضافة.`, ephemeral: true });
  }
};
