const { SlashCommandBuilder } = require('discord.js');
const GuildConfig = require('../../database/models/GuildConfig');
const User = require('../../database/models/User');
const { buildTasksForDifficulty } = require('../../utils/taskEngine');
const { todayKey } = require('../../utils/dateUtils');
const { isOwnerOrSenior, isAdmin } = require('../../utils/permissions');
const { sendAdminLog } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('تغيير_صعوبة_الان')
    .setDescription('تغيير مستوى صعوبة مهام اليوم الحالي فورًا (بدون انتظار منتصف الليل)')
    .addStringOption(opt =>
      opt.setName('المستوى').setDescription('مستوى الصعوبة الجديد لليوم الحالي').setRequired(true)
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
    await interaction.deferReply({ ephemeral: true });

    const level = interaction.options.getString('المستوى');
    const names = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' };

    const guildConfig = await GuildConfig.getSingleton();
    guildConfig.currentDifficulty = level;
    await guildConfig.save();

    const guild = interaction.guild;
    await guild.members.fetch();
    const adminMembers = guild.members.cache.filter(m => isAdmin(m));
    const today = todayKey();

    let count = 0;
    for (const [id] of adminMembers) {
      let userDoc = await User.findOne({ discordId: id });
      if (!userDoc) userDoc = new User({ discordId: id });
      userDoc.lastTaskDate = today;
      userDoc.dayCompletedToday = false;
      userDoc.currentTasks = buildTasksForDifficulty(level);
      await userDoc.save();
      count += 1;
    }

    sendAdminLog(guild, `⚡ قام <@${interaction.user.id}> بتغيير صعوبة مهام اليوم الحالي فورًا إلى: **${names[level]}** (تم تحديث ${count} إداري)`);

    await interaction.editReply({
      content: `✅ تم تغيير صعوبة مهام اليوم الحالي فورًا إلى: **${names[level]}**\nتم تحديث المهام لـ **${count}** إداري بشكل مباشر.\n\n⚠️ ملاحظة: هذا التغيير لليوم الحالي فقط، ولا يؤثر على /تحديد_صعوبة الخاص بالغد.`
    });
  }
};
