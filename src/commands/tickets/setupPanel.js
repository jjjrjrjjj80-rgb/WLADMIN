const { SlashCommandBuilder } = require('discord.js');
const { isOwnerOrSenior } = require('../../utils/permissions');
const { postPanel } = require('../../handlers/ticketHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('اعداد_تكتات')
    .setDescription('نشر بانل تذاكر يحتوي أنواع معينة في هذا الروم')
    .addStringOption(opt => opt.setName('الانواع').setDescription('مفاتيح الأنواع مفصولة بفاصلة، مثال: support,control').setRequired(true))
    .addChannelOption(opt => opt.setName('الروم').setDescription('الروم المراد نشر البانل فيه (اختياري)')),
  async execute(interaction) {
    if (!isOwnerOrSenior(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للرتب العليا والأونر فقط.', ephemeral: true });
    }
    const typeKeys = interaction.options.getString('الانواع').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const channel = interaction.options.getChannel('الروم') || interaction.channel;

    try {
      await postPanel(channel, typeKeys);
      await interaction.reply({ content: `✅ تم نشر بانل التذاكر في ${channel}`, ephemeral: true });
    } catch (err) {
      await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
