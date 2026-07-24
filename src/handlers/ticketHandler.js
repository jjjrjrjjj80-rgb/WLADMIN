const path = require('path');
const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, PermissionFlagsBits, ModalBuilder,
  TextInputBuilder, TextInputStyle, AttachmentBuilder
} = require('discord.js');
const config = require('../config');
const Ticket = require('../database/models/Ticket');
const TicketType = require('../database/models/TicketType');
const GuildConfig = require('../database/models/GuildConfig');
const User = require('../database/models/User');
const { isAdmin } = require('../utils/permissions');
const { sendTicketLog } = require('../utils/logger');
const { ensureTodayTasks, checkAndMarkCompletion } = require('../utils/taskEngine');
const { generateTranscript } = require('../utils/transcript');

const LOGO_PATH = path.join(__dirname, '..', '..', 'assets', 'logo.png');

// ============ بناء البانل ============
function buildPanelEmbed(ticketTypes) {
  return new EmbedBuilder()
    .setTitle('🎫 مركز الدعم — نظام التذاكر')
    .setDescription(
      '**اختر نوع التذكرة من القائمة أدناه** ليتم فتح روم خاص بك تتواصل فيه مع الإدارة.\n\n' +
      ticketTypes.map(t => `${t.emoji} **${t.label}**`).join('\n') +
      '\n\n> ⏱️ سيتم الرد عليك من قبل أقرب إداري متاح.\n' +
      '> ⚠️ يمكنك فتح تذكرة واحدة فقط في نفس الوقت.'
    )
    .setColor(0x8a63f2)
    .setThumbnail('attachment://logo.png')
    .setImage('attachment://logo.png')
    .setFooter({ text: 'نظام التذاكر الرسمي' })
    .setTimestamp();
}

function buildPanelRow(ticketTypes) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket_create_select')
    .setPlaceholder('📩 اختر نوع التذكرة لفتحها')
    .addOptions(ticketTypes.map(t => ({
      label: t.label,
      value: t.key,
      emoji: t.emoji
    })));
  return new ActionRowBuilder().addComponents(menu);
}

async function postPanel(channel, typeKeys) {
  const ticketTypes = await TicketType.find({ key: { $in: typeKeys } });
  if (ticketTypes.length === 0) {
    throw new Error('لا توجد أنواع تذاكر مطابقة. أنشئها أولًا عبر /اضافة_نوع_تكت');
  }
  const ordered = typeKeys.map(k => ticketTypes.find(t => t.key === k)).filter(Boolean);

  const attachment = new AttachmentBuilder(LOGO_PATH, { name: 'logo.png' });
  return channel.send({ embeds: [buildPanelEmbed(ordered)], components: [buildPanelRow(ordered)], files: [attachment] });
}

// ============ أزرار التحكم داخل التذكرة ============
function buildTicketControlRow(claimed) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_claim').setLabel(claimed ? 'تم الاستلام' : 'استلام التذكرة')
      .setStyle(claimed ? ButtonStyle.Secondary : ButtonStyle.Success).setDisabled(claimed).setEmoji('✋'),
    new ButtonBuilder().setCustomId('ticket_call').setLabel('استدعاء العضو').setStyle(ButtonStyle.Primary).setEmoji('📣'),
    new ButtonBuilder().setCustomId('ticket_rename').setLabel('تغيير الاسم').setStyle(ButtonStyle.Secondary).setEmoji('✏️'),
    new ButtonBuilder().setCustomId('ticket_add').setLabel('إضافة عضو').setStyle(ButtonStyle.Secondary).setEmoji('➕'),
    new ButtonBuilder().setCustomId('ticket_remove').setLabel('حذف عضو').setStyle(ButtonStyle.Secondary).setEmoji('➖')
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close').setLabel('إغلاق التذكرة').setStyle(ButtonStyle.Danger).setEmoji('🔒')
  );
  return [row, row2];
}

// ============ إنشاء تذكرة جديدة ============
async function handleCreateTicket(interaction) {
  const typeKey = interaction.values[0];
  await interaction.deferReply({ ephemeral: true });

  const existing = await Ticket.findOne({ openerId: interaction.user.id, status: { $ne: 'closed' } });
  if (existing) {
    return interaction.editReply({ content: `⚠️ لديك تذكرة مفتوحة بالفعل: <#${existing.channelId}>\nلازم تُغلق قبل ما تفتح تذكرة جديدة.` });
  }

  const ticketType = await TicketType.findOne({ key: typeKey });
  if (!ticketType) {
    return interaction.editReply({ content: '❌ نوع التذكرة هذا لم يعد متاحًا، تواصل مع الإدارة.' });
  }

  const guildConfig = await GuildConfig.getSingleton();
  guildConfig.ticketCounter += 1;
  await guildConfig.save();
  const num = guildConfig.ticketCounter;

  const guild = interaction.guild;
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
  ];
const rolesForOverwrite = [config.ADMIN_ROLE_ID, config.SENIOR_ROLE_ID, config.OWNER_ROLE_ID, ticketType.pingRoleId].filter(Boolean);
for (const roleId of [...new Set(rolesForOverwrite)]) {
    overwrites.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
}

  const channel = await guild.channels.create({
    name: `${ticketType.key}-${num}`,
    parent: ticketType.categoryId || null,
    permissionOverwrites: overwrites
  });

  await Ticket.create({
    channelId: channel.id,
    guildId: guild.id,
    ticketNumber: num,
    typeKey: ticketType.key,
    typeLabel: ticketType.label,
    openerId: interaction.user.id,
    memberIds: [interaction.user.id]
  });

  const embed = new EmbedBuilder()
    .setTitle(`🎫 تذكرة #${num} — ${ticketType.label}`)
    .setDescription(`مرحبًا <@${interaction.user.id}>، فريق الإدارة سيقوم بمساعدتك قريبًا.\nالرجاء وصف طلبك بالتفصيل.`)
    .setColor(0x8a63f2)
    .setFooter({ text: `فتحها: ${interaction.user.tag}` })
    .setTimestamp();

  const pingAdmin = config.ADMIN_ROLE_ID ? `<@&${config.ADMIN_ROLE_ID}> ` : '';
  await channel.send({
    content: `${pingAdmin}<@${interaction.user.id}>`,
    embeds: [embed],
    components: buildTicketControlRow(false)
  });

  sendTicketLog(guild, `📩 تذكرة جديدة **#${num}** (${ticketType.label}) فتحها <@${interaction.user.id}> — ${channel}`);

  await interaction.editReply({ content: `✅ تم فتح تذكرتك: ${channel}` });
}

// ============ الاستلام (محمي ذريًا من التعارض) ============
async function handleClaim(interaction) {
  const member = interaction.member;
  if (!isAdmin(member)) {
    return interaction.reply({ content: '❌ هذا الزر مخصص للإدارة فقط.', ephemeral: true });
  }

  const ticket = await Ticket.findOneAndUpdate(
    { channelId: interaction.channel.id, claimedBy: null },
    { $set: { claimedBy: member.id, claimedAt: new Date(), status: 'claimed' } },
    { new: true }
  );

  if (!ticket) {
    const existing = await Ticket.findOne({ channelId: interaction.channel.id });
    return interaction.reply({
      content: `⚠️ تم استلام هذه التذكرة مسبقًا من قبل <@${existing?.claimedBy}>.`,
      ephemeral: true
    });
  }

  await User.updateOne(
    { discordId: member.id },
    { $inc: { [`ticketsClaimed.${ticket.typeKey}`]: 1 } },
    { upsert: true }
  );

  let userDoc = await User.findOne({ discordId: member.id });
  const guildConfig = await GuildConfig.getSingleton();
  ensureTodayTasks(userDoc, guildConfig.currentDifficulty);

  for (const task of userDoc.currentTasks) {
    if (task.type === 'tickets' && !task.completed) {
      task.progress += 1;
      if (task.progress >= task.target) { task.progress = task.target; task.completed = true; }
    }
  }
  const { justCompleted } = checkAndMarkCompletion(userDoc);
  await userDoc.save();

  await interaction.update({ components: buildTicketControlRow(true) });
  await interaction.followUp({ content: `تم استلام التذكرة من قبل الإداري <@${member.id}> في خدمتك ⚒️` });

  sendTicketLog(interaction.guild, `✋ تم استلام التذكرة **#${ticket.ticketNumber}** بواسطة <@${member.id}>`);

  if (justCompleted) {
    interaction.channel.send(`🎉 <@${member.id}> أنجز جميع مهام اليوم!`).catch(() => {});
  }
}

// ============ استدعاء العضو (بالخاص) ============
async function handleCall(interaction) {
  if (!isAdmin(interaction.member)) return interaction.reply({ content: '❌ للإدارة فقط.', ephemeral: true });
  const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
  if (!ticket) return interaction.reply({ content: 'تعذر إيجاد بيانات التذكرة.', ephemeral: true });

  const guild = interaction.guild;
  const opener = await guild.members.fetch(ticket.openerId).catch(() => null);

  let dmSent = true;
  if (opener) {
    await opener.send(config.TICKET_CALL_DM).catch(() => { dmSent = false; });
  } else {
    dmSent = false;
  }

  await Ticket.updateOne({ channelId: interaction.channel.id }, { $set: { calledAt: new Date() } });

  await interaction.reply({
    content: dmSent
      ? `📣 تم إرسال تذكير بالخاص لـ <@${ticket.openerId}>. إذا ما رد خلال ${config.TICKET_CALL_TIMEOUT_MINUTES} دقائق ستُغلق التذكرة تلقائيًا.`
      : `⚠️ ما قدرت أرسل رسالة خاصة لـ <@${ticket.openerId}> (خاصه مقفولة على الأرجح).`
  });
}

// ============ المودالات: تغيير الاسم / إضافة / حذف عضو ============
function openRenameModal(interaction) {
  const modal = new ModalBuilder().setCustomId('ticket_rename_modal').setTitle('تغيير اسم التذكرة');
  const input = new TextInputBuilder().setCustomId('new_name').setLabel('الاسم الجديد').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(90);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return interaction.showModal(modal);
}

function openAddMemberModal(interaction) {
  const modal = new ModalBuilder().setCustomId('ticket_add_modal').setTitle('إضافة عضو للتذكرة');
  const input = new TextInputBuilder().setCustomId('user_id').setLabel('آيدي العضو أو منشن').setStyle(TextInputStyle.Short).setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return interaction.showModal(modal);
}

function openRemoveMemberModal(interaction) {
  const modal = new ModalBuilder().setCustomId('ticket_remove_modal').setTitle('حذف عضو من التذكرة');
  const input = new TextInputBuilder().setCustomId('user_id').setLabel('آيدي العضو أو منشن').setStyle(TextInputStyle.Short).setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return interaction.showModal(modal);
}

function extractUserId(raw) {
  const match = raw.match(/\d{15,}/);
  return match ? match[0] : null;
}

async function handleRenameSubmit(interaction) {
  const newName = interaction.fields.getTextInputValue('new_name');
  await interaction.channel.setName(newName.slice(0, 90));
  await interaction.reply({ content: `✏️ تم تغيير اسم التذكرة إلى **${newName}**` });
}

async function handleAddSubmit(interaction) {
  const raw = interaction.fields.getTextInputValue('user_id');
  const userId = extractUserId(raw);
  if (!userId) return interaction.reply({ content: '❌ آيدي غير صالح.', ephemeral: true });

  await interaction.channel.permissionOverwrites.edit(userId, {
    ViewChannel: true, SendMessages: true, ReadMessageHistory: true
  });
  await Ticket.updateOne({ channelId: interaction.channel.id }, { $addToSet: { memberIds: userId } });
  await interaction.reply({ content: `➕ تمت إضافة <@${userId}> للتذكرة.` });
}

async function handleRemoveSubmit(interaction) {
  const raw = interaction.fields.getTextInputValue('user_id');
  const userId = extractUserId(raw);
  if (!userId) return interaction.reply({ content: '❌ آيدي غير صالح.', ephemeral: true });

  await interaction.channel.permissionOverwrites.delete(userId);
  await Ticket.updateOne({ channelId: interaction.channel.id }, { $pull: { memberIds: userId } });
  await interaction.reply({ content: `➖ تمت إزالة <@${userId}> من التذكرة.` });
}

// ============ تدفق الإغلاق: زر -> تأكيد -> سبب -> تنفيذ ============
async function handleCloseButtonClick(interaction) {
  if (!isAdmin(interaction.member)) return interaction.reply({ content: '❌ إغلاق التذكرة مخصص للإدارة فقط.', ephemeral: true });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close_confirm').setLabel('نعم، إغلاق').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket_close_cancel').setLabel('لا، تراجع').setStyle(ButtonStyle.Secondary)
  );
  await interaction.reply({ content: '⚠️ هل أنت متأكد أنك ستغلق التذكرة؟', components: [row] });
}

async function handleCloseCancel(interaction) {
  await interaction.update({ content: '✅ تم التراجع عن إغلاق التذكرة.', components: [] });
}

function openCloseReasonModal(interaction) {
  const modal = new ModalBuilder().setCustomId('ticket_close_reason_modal').setTitle('سبب إغلاق التذكرة');
  const input = new TextInputBuilder().setCustomId('reason').setLabel('سبب الإغلاق').setStyle(TextInputStyle.Paragraph).setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return interaction.showModal(modal);
}

// يضمن أن قيمة الحقل نص صالح غير فارغ ولا يتجاوز 1024 حرف (شرط إمبيدات ديسكورد)
function safeFieldValue(value, fallback = 'غير محدد') {
  const str = (value === undefined || value === null) ? '' : String(value).trim();
  const finalStr = str.length > 0 ? str : fallback;
  return finalStr.slice(0, 1024);
}

async function closeTicketChannel(channel, guild, closedById, reason) {
  const ticket = await Ticket.findOneAndUpdate(
    { channelId: channel.id },
    { $set: { status: 'closed', closedBy: closedById, closeReason: reason, closedAt: new Date() } },
    { new: true }
  );
  if (!ticket) return;

  const transcriptFile = await generateTranscript(channel).catch(() => null);

  const closedByText = closedById ? `<@${closedById}>` : 'النظام (إغلاق تلقائي)';
  const claimedByText = ticket.claimedBy ? `<@${ticket.claimedBy}>` : 'لم تُستلم';
  const openedAtTs = ticket.createdAt ? Math.floor(ticket.createdAt.getTime() / 1000) : Math.floor(Date.now() / 1000);

  const logEmbed = new EmbedBuilder()
    .setTitle(`🔒 إغلاق التذكرة #${ticket.ticketNumber}`)
    .addFields(
      { name: 'النوع', value: safeFieldValue(ticket.typeLabel || ticket.typeKey), inline: true },
      { name: 'فتحها', value: safeFieldValue(`<@${ticket.openerId}>`), inline: true },
      { name: 'استلمها', value: safeFieldValue(claimedByText), inline: true },
      { name: 'أغلقها', value: safeFieldValue(closedByText), inline: true },
      { name: 'وقت الفتح', value: safeFieldValue(`<t:${openedAtTs}:f>`), inline: true },
      { name: 'سبب الإغلاق', value: safeFieldValue(reason) }
    )
    .setColor(0xe74c3c)
    .setTimestamp();

  const logChannel = guild.channels.cache.get(config.TICKET_LOG_CHANNEL_ID);
  if (logChannel) {
    await logChannel.send({ embeds: [logEmbed], files: transcriptFile ? [transcriptFile] : [] }).catch((e) => console.error('فشل إرسال لوق إغلاق التذكرة:', e));
  }

  const opener = await guild.members.fetch(ticket.openerId).catch(() => null);
  if (opener) {
    const dmEmbed = new EmbedBuilder()
      .setTitle(`🔒 تم إغلاق تذكرتك #${ticket.ticketNumber}`)
      .addFields(
        { name: 'استلمها', value: safeFieldValue(claimedByText), inline: true },
        { name: 'أغلقها', value: safeFieldValue(closedByText), inline: true },
        { name: 'وقت الفتح', value: safeFieldValue(`<t:${openedAtTs}:f>`), inline: true },
        { name: 'سبب الإغلاق', value: safeFieldValue(reason) }
      )
      .setColor(0xe74c3c);
    opener.send({ embeds: [dmEmbed] }).catch(() => {});
  }

  setTimeout(() => channel.delete().catch(() => {}), 5000);
}

async function handleCloseReasonSubmit(interaction) {
  const reason = interaction.fields.getTextInputValue('reason');
  await interaction.reply({ content: '🔒 جاري إغلاق التذكرة...' });
  await closeTicketChannel(interaction.channel, interaction.guild, interaction.member.id, reason);
}

module.exports = {
  postPanel, handleCreateTicket, handleClaim, handleCall,
  openRenameModal, openAddMemberModal, openRemoveMemberModal,
  handleRenameSubmit, handleAddSubmit, handleRemoveSubmit,
  handleCloseButtonClick, handleCloseCancel, openCloseReasonModal, handleCloseReasonSubmit,
  closeTicketChannel
};
