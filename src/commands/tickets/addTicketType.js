const { SlashCommandBuilder, ChannelType } = require('discord.js');
const TicketType = require('../../database/models/TicketType');
const { isOwnerOrSenior } = require('../../utils/permissions');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('اضافة_نوع_تكت')
    .setDescription('إنشاء نوع تذكرة جديد (مثلا: دعم فني، رقابة، تفعيل)')
    .addStringOption(opt => opt.setName('مفتاح').setDescription('مفتاح قصير بالإنجليزي بدون مسافات مثل support').setRequired(true))
    .addStringOption(opt => opt.setName('الاسم').setDescription('الاسم الظاهر للأعضاء').setRequired(true))
    .addChannelOption(opt => opt.setName('الكاتيجوري').setDescription('الكاتيجوري اللي تنفتح فيه التذاكر').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
    .addRoleOption(opt => opt.setName('رتبة_المنشن').setDescription('الرتبة اللي تُمنشن عند فتح هذا النوع'))
    .addStringOption(opt => opt.setName('ايموجي').setDescription('إيموجي يمثل هذا النوع (اختياري)')),
  async execute(interaction) {
    if (!isOwnerOrSenior(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للرتب العليا والأونر فقط.', ephemeral: true });
    }
    const key = interaction.options.getString('مفتاح').trim().toLowerCase().replace(/\s+/g, '-');
    const label = interaction.options.getString('الاسم');
    const category = interaction.options.getChannel('الكاتيجوري');
    const pingRole = interaction.options.getRole('رتبة_المنشن');
    const emoji = interaction.options.getString('ايموجي') || '🎫';
    const existing = await TicketType.findOne({ key });
    if (existing) {
      return interaction.reply({ content: `❌ يوجد نوع تذكرة بنفس المفتاح مسبقًا: **${existing.label}**`, ephemeral: true });
    }
    await TicketType.create({ key, label, categoryId: category.id, emoji, pingRoleId: pingRole ? pingRole.id : null });
    await interaction.reply({ content: `✅ تم إنشاء نوع التذكرة **${label}** (المفتاح: \`${key}\`) وربطه بكاتيجوري ${category.name}`, ephemeral: true });
  }
};
