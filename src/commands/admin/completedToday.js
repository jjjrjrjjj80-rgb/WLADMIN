const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../database/models/User');
const { isOwnerOrSenior, isAdmin } = require('../../utils/permissions');
const { todayKey } = require('../../utils/dateUtils');

// يقسم قائمة أسماء طويلة لعدة أجزاء، كل جزء أقل من 1000 حرف (أمان تحت حد 1024 لحقول الإمبيد)
function splitIntoChunks(lines, maxLen = 1000) {
  const chunks = [];
  let current = '';
  for (const line of lines) {
    if ((current + '\n' + line).length > maxLen) {
      if (current) chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

module.exports = {
  data: new SlashCommandBuilder().setName('منجزين_اليوم').setDescription('عرض من أنجز مهام اليوم ومن لم ينجز'),
  async execute(interaction) {
    if (!isOwnerOrSenior(interaction.member)) {
      return interaction.reply({ content: '❌ هذا الأمر مخصص للرتب العليا والأونر فقط.', ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    await guild.members.fetch();
    const adminMembers = guild.members.cache.filter(m => isAdmin(m));
    const today = todayKey();
    const users = await User.find({ discordId: { $in: [...adminMembers.keys()] } });
    const userMap = new Map(users.map(u => [u.discordId, u]));
    const completed = [];
    const notCompleted = [];
    for (const [id] of adminMembers) {
      const u = userMap.get(id);
      const done = u && u.lastTaskDate === today && u.dayCompletedToday;
      if (done) completed.push(id); else notCompleted.push(id);
    }

    const completedChunks = splitIntoChunks(completed.map(id => `<@${id}>`));
    const notCompletedChunks = splitIntoChunks(notCompleted.map(id => `<@${id}>`));

    // ⭐ نبني عدة إمبيدات (رسائل) عوض واحد لو القوائم طويلة، بدل ما نحاول نحشرها بحقل واحد
    const embeds = [];

    const firstEmbed = new EmbedBuilder()
      .setTitle('📊 حالة إنجاز مهام اليوم')
      .setColor(0x5865f2)
      .setTimestamp();

    if (completedChunks.length === 0) {
      firstEmbed.addFields({ name: `✅ أنجزوا (0)`, value: 'لا أحد بعد' });
    } else {
      firstEmbed.addFields({ name: `✅ أنجزوا (${completed.length})`, value: completedChunks[0] });
    }
    embeds.push(firstEmbed);

    // باقي أجزاء "أنجزوا" (لو القائمة طويلة جدًا) كل جزء برسالة/إمبيد منفصل
    for (let i = 1; i < completedChunks.length; i++) {
      embeds.push(new EmbedBuilder().setColor(0x5865f2).addFields({ name: '✅ أنجزوا (تابع)', value: completedChunks[i] }));
    }

    if (notCompletedChunks.length === 0) {
      embeds.push(new EmbedBuilder().setColor(0x5865f2).addFields({ name: `❌ لم ينجزوا (0)`, value: 'الجميع أنجز 🎉' }));
    } else {
      notCompletedChunks.forEach((chunk, i) => {
        embeds.push(new EmbedBuilder().setColor(0x5865f2).addFields({
          name: i === 0 ? `❌ لم ينجزوا (${notCompleted.length})` : '❌ لم ينجزوا (تابع)',
          value: chunk
        }));
      });
    }

    // ديسكورد يسمح بحد أقصى 10 إمبيدات بالرسالة الواحدة، نرسلهم على دفعات لو تجاوزوا
    await interaction.editReply({ embeds: embeds.slice(0, 10) });
    for (let i = 10; i < embeds.length; i += 10) {
      await interaction.followUp({ embeds: embeds.slice(i, i + 10), ephemeral: true });
    }
  }
};
