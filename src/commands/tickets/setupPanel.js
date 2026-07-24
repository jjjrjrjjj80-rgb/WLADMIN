const { SlashCommandBuilder } = require('discord.js');
const { isOwnerOrSenior } = require('../../utils/permissions');
const { postPanel } = require('../../handlers/ticketHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('اعداد_تكتات')
    .setDescription('نشر بانل التذاكر في هذا الروم')
    .addChannelOption(opt => opt.setName('الروم').setDescription('الروم المراد نشر البانل فيه (اختياري)')),
  async execute(interaction) {
    if (!isOwnerOrSenior(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للرتب العليا والأونر فقط.', ephemeral: true });
    }
    const channel = interaction.options.getChannel('الروم') || interaction.channel;
    await postPanel(channel);
    await interaction.reply({ content: `✅ تم نشر بانل التذاكر في ${channel}`, ephemeral: true });
  }
};
