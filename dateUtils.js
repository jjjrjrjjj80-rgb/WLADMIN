const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, PermissionFlagsBits, ModalBuilder,
  TextInputBuilder, TextInputStyle
} = require('discord.js');
const config = require('../config');
const Ticket = require('../database/models/Ticket');
const GuildConfig = require('../database/models/GuildConfig');
const User = require('../database/models/User');
const { isAdmin } = require('../utils/permissions');
const { sendTicketLog } = require('../utils/logger');
const { ensureTodayTasks, checkAndMarkCompletion } = require('../utils/taskEngine');

// ============ بناء البانل الرئيسي ============
function buildPanelEmbed() {
  return new EmbedBuilder()
    .setTitle('🎫 مركز الدعم — نظام التذاكر')
    .setDescription(
      '**اختر نوع التذكرة من القائمة أدناه** ليتم فتح روم خاص بك تتواصل فيه مع الإدارة.\n\n' +
      config.TICKET_TYPES.map(t => `${t.emoji} **${t.id}.** ${t.label}`).join('\n') +
      '\n\n> ⏱️ سيتم الرد عليك من قبل أقرب إداري متاح.'
    )
    .setColor(0x5865f2)
    .setImage('https://i.imgur.com/6YOgi9c.png') // ضع رابط بانر السيرفر هنا
    .setFooter({ text: 'نظام التذاكر الرسمي' })
    .setTimestamp();
}

function buildPanelRow() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket_create_select')
    .setPlaceholder('📩 اختر نوع التذكرة لفتحها')
    .addOptions(config.TICKET_TYPES.map(t => ({
      label: `${t.id}. ${t.label}`,
      value: t.id,
      emoji: t.emoji
    })));
  return new ActionRowBuilder().addComponents(menu);
}

async function postPanel(channel) {
  return channel.send({ embeds: [buildPanelEmbed()], components: [buildPanelRow()] });
}

// ============ إنشاء تذكرة جديدة ============
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

async function handleCreateTicket(interaction) {
  const typeId = interaction.values[0];
  const ticketType = config.TICKET_TYPES.find(t => t.id === typeId);
  await interaction.deferReply({ ephemeral: true });

  const guildConfig = await GuildConfig.getSingleton();
  guildConfig.ticketCounter += 1;
  await guildConfig.save();
  const num = guildConfig.ticketCounter;

  const guild = interaction.guild;
  const channel = await guild.channels.create({
    name: `تذكرة-${num}`,
    parent: config.TICKET_CATEGORY_ID || null,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: config.ADMIN_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: config.SENIOR_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: config.OWNER_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
    ]
  });

  await Ticket.create({
    channelId: channel.id,
    guildId: guild.id,
    ticketNumber: num,
    ticketType: ticketType?.label || typeId,
    openerId: interaction.user.id,
    memberIds: [interaction.user.id]
  });

  const embed = new EmbedBuilder()
    .setTitle(`🎫 تذكرة #${num} — ${ticketType?.label || ''}`)
    .setDescription(`مرحبًا <@${interaction.user.id}>، فريق الإدارة سيقوم بمساعدتك قريبًا.\nالرجاء وصف طلبك بالتفصيل.`)
    .setColor(0x5865f2)
    .setFooter({ text: `فتحها: ${interaction.user.tag}` })
    .setTimestamp();

  await channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: buildTicketControlRow(false) });

  sendTicketLog(guild, `📩 تذكرة جديدة **#${num}** (${ticketType?.label}) فتحها <@${interaction.user.id}> — ${channel}`);

  await interaction.editReply({ content: `✅ تم فتح تذكرتك: ${channel}` });
}

// ============ الاستلام (محمي من التعارض/القلتش) ============
async function handleClaim(interaction) {
  const member = interaction.member;
  if (!isAdmin(member)) {
    return interaction.reply({ content: '❌ هذا الزر مخصص للإدارة فقط.', ephemeral: true });
  }

  // عملية ذرية واحدة على قاعدة البيانات: فقط أول طلب ينجح (claimedBy: null شرط)
  // هذا يمنع أي تعارض حتى لو ضغط اثنين بنفس الميلي ثانية
  const ticket = await Ticket.findOneAndUpdate(
    { channelId: interaction.channel.id, claimedBy: null },
    { $set: { claimedBy: member.id, claimedAt: new Date(), status: 'claimed' } },
    { new: true }
  );

  if (!ticket) {
    // شخص ثاني سبقه بجزء من الثانية
    const existing = await Ticket.findOne({ channelId: interaction.channel.id });
    return interaction.reply({
      content: `⚠️ تم استلام هذه التذكرة مسبقًا من قبل <@${existing?.claimedBy}>.`,
      ephemeral: true
    });
  }

  // تحديث تقدم مهمة "استلام التكتات" لهذا الإداري فقط (أول مستلم)
  let userDoc = await User.findOne({ discordId: member.id });
  if (!userDoc) userDoc = new User({ discordId: member.id });

  const guildConfig = await GuildConfig.getSingleton();
  ensureTodayTasks(userDoc, guildConfig.currentDifficulty);

  let justCompleted = false;
  for (const task of userDoc.currentTasks) {
    if (task.type === 'tickets' && !task.completed) {
      task.progress += 1;
      if (task.progress >= task.target) { task.progress = task.target; task.completed = true; }
    }
  }
  const result = checkAndMarkCompletion(userDoc);
  justCompleted = result.justCompleted;
  await userDoc.save();

  const row1 = buildTicketControlRow(true);
  await interaction.update({ components: row1 });
  await interaction.followUp({ content: `✅ تم استلام التذكرة بواسطة <@${member.id}>`, ephemeral: false });

  sendTicketLog(interaction.guild, `✋ تم استلام التذكرة **#${ticket.ticketNumber}** بواسطة <@${member.id}>`);

  if (justCompleted) {
    interaction.channel.send(`🎉 <@${member.id}> أنجز جميع مهام اليوم!`).catch(() => {});
  }
}

// ============ استدعاء العضو ============
async function handleCall(interaction) {
  if (!isAdmin(interaction.member)) return interaction.reply({ content: '❌ للإدارة فقط.', ephemeral: true });
  const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
  if (!ticket) return interaction.reply({ content: 'تعذر إيجاد بيانات التذكرة.', ephemeral: true });
  await interaction.reply({ content: `📣 <@${ticket.openerId}> الإدارة بحاجة لردك هنا.` });
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

// ============ إغلاق التذكرة ============
async function handleClose(interaction) {
  if (!isAdmin(interaction.member)) return interaction.reply({ content: '❌ للإدارة فقط.', ephemeral: true });
  const ticket = await Ticket.findOneAndUpdate(
    { channelId: interaction.channel.id },
    { $set: { status: 'closed' } },
    { new: true }
  );
  await interaction.reply({ content: '🔒 سيتم إغلاق التذكرة خلال 5 ثوانٍ...' });
  sendTicketLog(interaction.guild, `🔒 تم إغلاق التذكرة **#${ticket?.ticketNumber}** بواسطة <@${interaction.member.id}>`);
  setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
}

module.exports = {
  postPanel, handleCreateTicket, handleClaim, handleCall,
  openRenameModal, openAddMemberModal, openRemoveMemberModal,
  handleRenameSubmit, handleAddSubmit, handleRemoveSubmit, handleClose
};
