const { SlashCommandBuilder } = require('discord.js');
const TicketType = require('../../database/models/TicketType');
const { isOwnerOrSenior } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('حذف_نوع_تكت')
    .setDescription('حذف نوع تذكرة موجود')
    .addStringOption(opt => opt.setName('مفتاح').setDescription('مفتاح نوع التذكرة').setRequired(true)),
  async execute(interaction) {
    if (!isOwnerOrSenior(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للرتب العليا والأونر فقط.', ephemeral: true });
    }
    const key = interaction.options.getString('مفتاح').trim().toLowerCase();
    const deleted = await TicketType.findOneAndDelete({ key });
    if (!deleted) return interaction.reply({ content: '❌ لا يوجد نوع تذكرة بهذا المفتاح.', ephemeral: true });
    await interaction.reply({ content: `🗑️ تم حذف نوع التذكرة **${deleted.label}**`, ephemeral: true });
  }
};
