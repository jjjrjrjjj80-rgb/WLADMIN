const { SlashCommandBuilder } = require('discord.js');
const mongoose = require('mongoose');
const Warning = require('../../database/models/Warning');
const { isAdmin } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('الغاء_تحذير')
    .setDescription('إلغاء تحذير إداري معين قبل انتهاء مدته')
    .addStringOption(opt => opt.setName('معرف_التحذير').setDescription('شوفه من أمر عرض_التحذيرات').setRequired(true)),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للإدارة فقط.', ephemeral: true });
    }

    const warningId = interaction.options.getString('معرف_التحذير');
    if (!mongoose.isValidObjectId(warningId)) {
      return interaction.reply({ content: '❌ معرف التحذير غير صحيح.', ephemeral: true });
    }

    const warning = await Warning.findOne({ _id: warningId, active: true, guildId: interaction.guild.id });
    if (!warning) {
