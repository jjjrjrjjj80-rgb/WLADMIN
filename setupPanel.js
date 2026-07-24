const { SlashCommandBuilder } = require('discord.js');
const User = require('../../database/models/User');
const { isOwnerOrSenior } = require('../../utils/permissions');
const { finalizeLeave } = require('../../handlers/leaveHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('كسر_اجازة_اداري')
    .setDescription('كسر إجازة إداري معين قبل انتهائها')
    .addUserOption(opt => opt.setName('الشخص').setDescription('الإداري').setRequired(true))
    .addStringOption(opt => opt.setName('السبب').setDescription('سبب الكسر').setRequired(true)),
  async execute(interaction) {
    if (!isOwnerOrSenior(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للرتب العليا والأونر فقط.', ephemeral: true });
    }
    const target = interaction.options.getUser('الشخص');
    const reason = interaction.options.getString('السبب');

    const userDoc = await User.findOne({ discordId: target.id });
    if (!userDoc || !userDoc.onLeave) {
      return interaction.reply({ content: '❌ هذا الشخص ليس في إجازة حاليًا.', ephemeral: true });
    }

    const result = await finalizeLeave(interaction.guild, target.id, {
      endType: 'broken', brokenById: interaction.user.id, brokenReason: reason
    });

    await interaction.reply({
      content: `✅ تم كسر إجازة <@${target.id}>. الساعات المستخدمة فعليًا: **${result.actualHoursUsed}**، الرصيد المتبقي: **${result.remaining}**`,
      ephemeral: true
    });
  }
};
