const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Warning = require('../../database/models/Warning');
const { isOwnerOrSenior } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('تحذيرات_الشخص')
    .setDescription('عرض التحذيرات النشطة لإداري معين')
    .addUserOption(opt => opt.setName('الشخص').setDescription('الإداري').setRequired(true)),
  async execute(interaction) {
    if (!isOwnerOrSenior(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للرتب العليا والأونر فقط.', ephemeral: true });
    }
    const target = interaction.options.getUser('الشخص');
    const warnings = await Warning.find({ guildId: interaction.guild.id, userId: target.id, status: 'active' }).sort({ level: 1 });

    if (warnings.length === 0) {
      return interaction.reply({ content: `✅ لا توجد تحذيرات نشطة حاليًا لـ <@${target.id}>.`, ephemeral: true });
    }

    const desc = warnings.map(w => {
      const expiresTs = Math.floor(w.expiresAt.getTime() / 1000);
      return `**تحذير رقم ${w.level}**\nالسبب: ${w.reason}\nأعطاه: <@${w.issuedById}>\nينتهي: <t:${expiresTs}:R>`;
    }).join('\n\n');

    const embed = new EmbedBuilder()
      .setTitle(`⚠️ تحذيرات ${target.username} النشطة (${warnings.length}/3)`)
      .setDescription(desc)
      .setColor(0xe67e22)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
