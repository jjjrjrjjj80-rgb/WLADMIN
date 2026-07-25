const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const config = require('../config');
const User = require('../database/models/User');
const LeaveRequest = require('../database/models/LeaveRequest');
const { monthKey } = require('../utils/dateUtils');
const { sendLeaveLog } = require('../utils/logger');

const SWAPPABLE_ROLES = config.LEAVE.SWAPPABLE_ROLE_IDS;

async function getOrCreateUser(discordId) {
  let userDoc = await User.findOne({ discordId });
  if (!userDoc) userDoc = new User({ discordId });
  const mk = monthKey();
  if (userDoc.lastLeaveMonthKey !== mk) {
    userDoc.leaveDaysRemaining = config.LEAVE.MONTHLY_DAYS;
    userDoc.lastLeaveMonthKey = mk;
  }
  return userDoc;
}

// ============ طلب إجازة ============
async function submitLeaveRequest(interaction, durationDays, reason) {
  const userDoc = await getOrCreateUser(interaction.user.id);

  if (userDoc.onLeave) {
    return interaction.reply({ content: '❌ أنت بالفعل في إجازة حاليًا.', ephemeral: true });
  }
  if (durationDays <= 0) {
    return interaction.reply({ content: '❌ عدد الأيام غير صالح.', ephemeral: true });
  }
  if (durationDays > userDoc.leaveDaysRemaining) {
    return interaction.reply({
      content: `❌ عدد أيامك غير كافي. رصيدك المتبقي هذا الشهر: **${userDoc.leaveDaysRemaining}** يوم فقط.`,
      ephemeral: true
    });
  }

  await userDoc.save();

  const request = await LeaveRequest.create({
    userId: interaction.user.id,
    reason,
    durationDays
  });

  const embed = new EmbedBuilder()
    .setTitle('📥 طلب إجازة جديد')
    .addFields(
      { name: 'الإداري', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'المدة', value: `${durationDays} يوم`, inline: true },
      { name: 'الرصيد المتبقي', value: `${userDoc.leaveDaysRemaining} يوم`, inline: true },
      { name: 'السبب', value: reason }
    )
    .setColor(0xf1c40f)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`leave_approve_${request.requestId}`).setLabel('قبول').setStyle(ButtonStyle.Success).setEmoji('✅'),
    new ButtonBuilder().setCustomId(`leave_reject_${request.requestId}`).setLabel('رفض').setStyle(ButtonStyle.Danger).setEmoji('❌')
  );

  const logMsg = await interaction.guild.channels.cache.get(config.LEAVE_LOG_CHANNEL_ID)
    ?.send({
      content: config.SENIOR_ROLE_ID ? `<@&${config.SENIOR_ROLE_ID}>` : undefined,
      embeds: [embed],
      components: [row]
    });

  if (logMsg) {
    request.logMessageId = logMsg.id;
    await request.save();
  }

  return interaction.reply({ content: '📨 تم إرسال طلب الإجازة للرتب العليا للمراجعة.', ephemeral: true });
}

// ============ قبول الطلب ============
async function approveLeave(interaction, requestId) {
  // ⭐ نأكد الزر فورًا قبل أي عملية بطيئة (سحب رتب، حفظ قاعدة بيانات...) عشان ديسكورد ما يطلع خطأ "لم يستجب بالوقت"
  await interaction.deferUpdate();

  const request = await LeaveRequest.findOne({ requestId });
  if (!request || request.status !== 'pending') {
    return interaction.followUp({ content: '⚠️ هذا الطلب غير موجود أو تم البت فيه مسبقًا.', ephemeral: true });
  }

  const guild = interaction.guild;
  const member = await guild.members.fetch(request.userId).catch(() => null);
  const userDoc = await getOrCreateUser(request.userId);

  const savedRoles = [];
  if (member) {
    for (const roleId of SWAPPABLE_ROLES) {
      if (member.roles.cache.has(roleId)) {
        savedRoles.push(roleId);
        await member.roles.remove(roleId).catch(() => {});
      }
    }
    if (config.LEAVE_ROLE_ID) await member.roles.add(config.LEAVE_ROLE_ID).catch(() => {});
  }

  userDoc.onLeave = true;
  userDoc.savedRolesForLeave = savedRoles;
  userDoc.currentLeave = {
    requestId: request.requestId,
    durationDays: request.durationDays,
    startedAt: new Date(),
    reason: request.reason
  };
  await userDoc.save();

  request.status = 'approved';
  request.decidedBy = interaction.user.id;
  request.startedAt = new Date();
  await request.save();

  const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(0x2ecc71)
    .setFooter({ text: `✅ تمت الموافقة بواسطة ${interaction.user.tag}` });
  await interaction.editReply({ embeds: [updatedEmbed], components: [] });

  member?.send(config.LEAVE_MESSAGES.approved(request.durationDays)).catch(() => {});
  sendLeaveLog(guild, { content: `✅ تمت الموافقة على إجازة <@${request.userId}> (${request.durationDays} يوم) بواسطة <@${interaction.user.id}>` });
}

// ============ رفض الطلب (يفتح مودال لكتابة السبب) ============
function openRejectReasonModal(interaction, requestId) {
  const modal = new ModalBuilder().setCustomId(`leave_reject_reason_modal_${requestId}`).setTitle('سبب رفض الإجازة');
  const input = new TextInputBuilder().setCustomId('reason').setLabel('سبب الرفض').setStyle(TextInputStyle.Paragraph).setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return interaction.showModal(modal);
}

async function rejectLeaveWithReason(interaction, requestId, reason) {
  // ⭐ نأكد الاستلام فورًا قبل أي عملية بطيئة (حفظ، إرسال رسائل...)
  await interaction.deferReply({ ephemeral: true });

  const request = await LeaveRequest.findOne({ requestId });
  if (!request || request.status !== 'pending') {
    return interaction.editReply({ content: '⚠️ هذا الطلب غير موجود أو تم البت فيه مسبقًا.' });
  }

  request.status = 'rejected';
  request.decidedBy = interaction.user.id;
  request.rejectReason = reason;
  await request.save();

  const originalMessage = await interaction.channel.messages.fetch(request.logMessageId).catch(() => null);
  if (originalMessage) {
    const updatedEmbed = EmbedBuilder.from(originalMessage.embeds[0])
      .setColor(0xe74c3c)
      .setFooter({ text: `❌ تم الرفض بواسطة ${interaction.user.tag}` });
    await originalMessage.edit({ embeds: [updatedEmbed], components: [] }).catch(() => {});
  }

  const member = await interaction.guild.members.fetch(request.userId).catch(() => null);
  member?.send(config.LEAVE_MESSAGES.rejected(reason)).catch(() => {});
  sendLeaveLog(interaction.guild, { content: `❌ تم رفض طلب إجازة <@${request.userId}> بواسطة <@${interaction.user.id}>\n**السبب:** ${reason}` });

  await interaction.editReply({ content: '✅ تم رفض الطلب وإبلاغ الإداري.' });
}

/**
 * ينهي إجازة (كسر ذاتي / كسر إداري / انتهاء طبيعي) ويحسب الأيام الفعلية بدقة
 */
async function finalizeLeave(guild, userId, { endType, brokenById = null, brokenReason = null }) {
  const userDoc = await User.findOne({ discordId: userId });
  if (!userDoc || !userDoc.onLeave) return null;

  const startedAt = userDoc.currentLeave.startedAt.getTime();
  const durationDays = userDoc.currentLeave.durationDays;
  const elapsedDays = (Date.now() - startedAt) / (1000 * 60 * 60 * 24);
  const actualDaysUsed = Math.min(durationDays, Math.round(elapsedDays * 100) / 100);

  userDoc.leaveDaysRemaining = Math.max(0, Math.round((userDoc.leaveDaysRemaining - actualDaysUsed) * 100) / 100);

  const member = await guild.members.fetch(userId).catch(() => null);
  if (member) {
    for (const roleId of userDoc.savedRolesForLeave) {
      await member.roles.add(roleId).catch(() => {});
    }
    if (config.LEAVE_ROLE_ID) await member.roles.remove(config.LEAVE_ROLE_ID).catch(() => {});
  }

  const requestId = userDoc.currentLeave.requestId;
  userDoc.onLeave = false;
  userDoc.savedRolesForLeave = [];
  userDoc.currentLeave = undefined;
  await userDoc.save();

  const request = await LeaveRequest.findOne({ requestId });
  if (request) {
    request.status = endType;
    request.endedAt = new Date();
    request.daysUsed = actualDaysUsed;
    await request.save();
  }

  if (endType === 'broken') {
    if (brokenById && brokenById !== userId) {
      sendLeaveLog(guild, { content: `🔴 تم كسر إجازة <@${userId}> بواسطة <@${brokenById}>\n**السبب:** ${brokenReason || 'غير محدد'}\n**الأيام المستخدمة فعليًا:** ${actualDaysUsed} يوم` });
      member?.send(config.LEAVE_MESSAGES.brokenByAdmin(brokenReason || 'غير محدد')).catch(() => {});
    } else {
      sendLeaveLog(guild, { content: `🟡 <@${userId}> كسر إجازته بنفسه. **الأيام المستخدمة:** ${actualDaysUsed} يوم` });
    }
  } else {
    sendLeaveLog(guild, { content: `🔵 انتهت إجازة <@${userId}> بشكل طبيعي (${actualDaysUsed} يوم).` });
    member?.send(config.LEAVE_MESSAGES.completedNaturally).catch(() => {});
  }

  return { actualDaysUsed, remaining: userDoc.leaveDaysRemaining };
}

module.exports = { getOrCreateUser, submitLeaveRequest, approveLeave, openRejectReasonModal, rejectLeaveWithReason, finalizeLeave };
