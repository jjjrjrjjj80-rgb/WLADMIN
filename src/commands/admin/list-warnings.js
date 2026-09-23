const { SlashCommandBuilder } = require('discord.js');
const Warning = require('../../database/models/Warning');
const { isAdmin } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('عرض_التحذيرات')
    .setDescription('عرض التحذيرات النشطة لإداري معين')
    .addUserOption(opt => opt.setName('الإداري').setDescription('الإداري المراد عرض تحذيراته').setRequired(true)),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للإدارة فقط.', ephemeral: true });
    }

    const target = interaction.options.getUser('الإداري');
    const active = await Warning.find({ userId: target.id, guildId: interaction.guild.id, active: true }).sort({ createdAt: 1 });

    if (active.length === 0) {
      return interaction.reply({ content: `<@${target.id}> ما عليه أي تحذير نشط حاليًا.`, ephemeral: true });
    }

    const lines = active.map(w => {
