const { SlashCommandBuilder } = require('discord.js');
const GuildConfig = require('../../database/models/GuildConfig');
const { isOwnerOrSenior } = require('../../utils/permissions');
const { sendAdminLog } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('تحديد_صعوبة')
    .setDescription('تحديد مستوى صعوبة مهام اليوم القادم')
    .addStringOption(opt =>
      opt.setName('المستوى').setDescription('مستوى الصعوبة').setRequired(true)
        .addChoices(
          { name: 'سهل', value: 'easy' },
          { name: 'متوسط', value: 'medium' },
          { name: 'صعب', value: 'hard' }
        )
    ),
  async execute(interaction) {
    if (!isOwnerOrSenior(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للرتب العليا والأونر فقط.', ephemeral: true });
    }
    const level = interaction.options.getString('المستوى');
    const guildConfig = await GuildConfig.getSingleton();
    guildConfig.nextDifficulty = level;
    await guildConfig.save();

    const names = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' };
    sendAdminLog(interaction.guild, `⚙️ قام <@${interaction.user.id}> بتحديد صعوبة اليوم القادم: **${names[level]}**`);
    await interaction.reply({ content: `✅ تم تحديد صعوبة مهام اليوم القادم: **${names[level]}**\nسيتم تطبيقها عند بداية اليوم الجديد (منتصف الليل بتوقيت السعودية).`, ephemeral: true });
  }
};
