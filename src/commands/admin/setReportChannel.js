const { SlashCommandBuilder, ChannelType } = require('discord.js');
const GuildConfig = require('../../database/models/GuildConfig');
const { isOwnerOrSenior } = require('../../utils/permissions');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('تحديد_روم_التقرير')
    .setDescription('تحديد الروم اللي يوصله تقرير إنجاز الإدارة اليومي قبل تجدد المهام')
    .addChannelOption(opt => opt.setName('الروم').setDescription('الروم المطلوب').addChannelTypes(ChannelType.GuildText).setRequired(true)),
  async execute(interaction) {
    if (!isOwnerOrSenior(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للرتب العليا والأونر فقط.', ephemeral: true });
    }
    const channel = interaction.options.getChannel('الروم');
    const guildConfig = await GuildConfig.getSingleton();
    guildConfig.reportChannelId = channel.id;
    await guildConfig.save();
    await interaction.reply({ content: `✅ تم تحديد ${channel} كروم تقرير الإنجاز اليومي.`, ephemeral: true });
  }
};
