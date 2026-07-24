const { EmbedBuilder } = require('discord.js');
const config = require('../config');

async function sendToChannel(guild, channelId, options) {
  if (!channelId) return;
  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;
  try {
    await channel.send(options);
  } catch (e) {
    console.error('فشل إرسال لوق:', e.message);
  }
}

function sendAdminLog(guild, description, color = 0x2b2d31) {
  const embed = new EmbedBuilder().setDescription(description).setColor(color).setTimestamp();
  return sendToChannel(guild, config.ADMIN_LOG_CHANNEL_ID, { embeds: [embed] });
}

function sendLeaveLog(guild, options) {
  return sendToChannel(guild, config.LEAVE_LOG_CHANNEL_ID, options);
}

function sendTicketLog(guild, description, color = 0x2b2d31) {
  const embed = new EmbedBuilder().setDescription(description).setColor(color).setTimestamp();
  return sendToChannel(guild, config.TICKET_LOG_CHANNEL_ID, { embeds: [embed] });
}

module.exports = { sendAdminLog, sendLeaveLog, sendTicketLog };
