const { SlashCommandBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const { submitLeaveRequest } = require('../../handlers/leaveHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('اجازة')
    .setDescription('تقديم طلب إجازة')
    .addIntegerOption(opt => opt.setName('المدة').setDescription('عدد الساعات المطلوبة').setRequired(true).setMinValue(1))
    .addStringOption(opt => opt.setName('السبب').setDescription('سبب الإجازة').setRequired(true)),
  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للإدارة فقط.', ephemeral: true });
    }
    const hours = interaction.options.getInteger('المدة');
    const reason = interaction.options.getString('السبب');
    await submitLeaveRequest(interaction, hours, reason);
  }
};
