const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const User = require('../database/models/User');
const LeaveRequest = require('../database/models/LeaveRequest');
const { monthKey, now } = require('../utils/dateUtils');
const { sendLeaveLog, sendAdminLog } = require('../utils/logger');

// الرتب اللي تنسحب وقت الإجازة وترجع بعدها
const SWAPPABLE_ROLES = [config.ADMIN_ROLE_ID, config.SENIOR_ROLE_ID].filter(Boolean);

async function getOrCreateUser(discordId) {
  let userDoc = await User.findOne({ discordId });
  if (!userDoc) userDoc = new User({ discordId });
  // تصفير شهري لرصيد الإجازات
  const mk = monthKey();
  if (userDoc.lastLeaveMonthKey !== mk) {
    userDoc.leaveHoursRemaining = config.LEAVE.MONTHLY_HOURS;
    userDoc.lastLeaveMonthKey = mk;
  }
  return userDoc;
}

// ============ طلب إجازة ============
async function submitLeaveRequest(interaction, durationHours, reason) {
  const userDoc = await getOrCreateUser(interaction.user.id);

  if (userDoc.onLeave) {
    return interaction.reply({ content: '❌ أنت بالفعل في إجازة حاليًا.', ephemeral: true });
  }
  if (durationHours <= 0) {
    return interaction.reply({ content: '❌ عدد الساعات غير صالح.', ephemeral: true });
  }
  if (durationHours > userDoc.leaveHoursRemaining) {
    return interaction.reply({
      content: `❌ عدد ساعاتك غير كافي. رصيدك المتبقي هذا الشهر: **${userDoc.leaveHoursRemaining}** ساعة فقط.`,
      ephemeral: true
    });
  }

  await userDoc.save();

  const request = await LeaveRequest.create({
    userId: interaction.user.id,
    reason,
    durationHours
  });

  const embed = new EmbedBuilder()
    .setTitle('📥 طلب إجازة جديد')
    .addFields(
      { name: 'الإداري', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'المدة', value: `${durationHours} ساعة`, inline: true },
      { name: 'الرصيد المتبقي', value: `${userDoc.leaveHoursRemaining} ساعة`, inline: true },
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
  const request = await LeaveRequest.findOne({ requestId });
  if (!request || request.status !== 'pending') {
    return interaction.reply({ content: '⚠️ هذا الطلب غير موجود أو تم البت فيه مسبقًا.', ephemeral: true });
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
    durationHours: request.durationHours,
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
  await interaction.update({ embeds: [updatedEmbed], components: [] });

  member?.send(`✅ تمت الموافقة على إجازتك لمدة **${request.durationHours}** ساعة. نتمنى لك راحة طيبة!`).catch(() => {});
  sendLeaveLog(guild, { content: `✅ تمت الموافقة على إجازة <@${request.userId}> (${request.durationHours} ساعة) بواسطة <@${interaction.user.id}>` });
}

// ============ رفض الطلب ============
async function rejectLeave(interaction, requestId) {
  const request = await LeaveRequest.findOne({ requestId });
  if (!request || request.status !== 'pending') {
    return interaction.reply({ content: '⚠️ هذا الطلب غير موجود أو تم البت فيه مسبقًا.', ephemeral: true });
  }

  request.status = 'rejected';
  request.decidedBy = interaction.user.id;
  await request.save();

  const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(0xe74c3c)
    .setFooter({ text: `❌ تم الرفض بواسطة ${interaction.user.tag}` });
  await interaction.update({ embeds: [updatedEmbed], components: [] });

  const member = await interaction.guild.members.fetch(request.userId).catch(() => null);
  member?.send(`❌ تم رفض طلب إجازتك (${request.durationHours} ساعة).`).catch(() => {});
  sendLeaveLog(interaction.guild, { content: `❌ تم رفض طلب إجازة <@${request.userId}> بواسطة <@${interaction.user.id}>` });
}

/**
 * ينهي إجازة (سواء كسر ذاتي أو انتهت تلقائيًا أو كسرها أدمن) ويحسب الساعات الفعلية المستخدمة بدقة
 * endType: 'broken' | 'completed'
 */
async function finalizeLeave(guild, userId, { endType, brokenById = null, brokenReason = null }) {
  const userDoc = await User.findOne({ discordId: userId });
  if (!userDoc || !userDoc.onLeave) return null;

  const startedAt = userDoc.currentLeave.startedAt.getTime();
  const durationHours = userDoc.currentLeave.durationHours;
  const elapsedHours = (Date.now() - startedAt) / (1000 * 60 * 60);
  const actualHoursUsed = Math.min(durationHours, Math.round(elapsedHours * 100) / 100);

  userDoc.leaveHoursRemaining = Math.max(0, Math.round((userDoc.leaveHoursRemaining - actualHoursUsed) * 100) / 100);

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
    request.hoursUsed = actualHoursUsed;
    await request.save();
  }

  if (endType === 'broken') {
    if (brokenById && brokenById !== userId) {
      sendLeaveLog(guild, { content: `🔴 تم كسر إجازة <@${userId}> بواسطة <@${brokenById}>\n**السبب:** ${brokenReason || 'غير محدد'}\n**الساعات المستخدمة فعليًا:** ${actualHoursUsed} ساعة` });
      member?.send(`🔴 تم كسر إجازتك بواسطة الإدارة.\n**السبب:** ${brokenReason || 'غير محدد'}`).catch(() => {});
    } else {
      sendLeaveLog(guild, { content: `🟡 <@${userId}> كسر إجازته بنفسه. **الساعات المستخدمة:** ${actualHoursUsed} ساعة` });
    }
  } else {
    sendLeaveLog(guild, { content: `🔵 انتهت إجازة <@${userId}> بشكل طبيعي (${actualHoursUsed} ساعة).` });
    member?.send('🔵 انتهت مدة إجازتك، تم إرجاع رتبك الإدارية. بالتوفيق!').catch(() => {});
  }

  return { actualHoursUsed, remaining: userDoc.leaveHoursRemaining };
}

module.exports = { getOrCreateUser, submitLeaveRequest, approveLeave, rejectLeave, finalizeLeave };
