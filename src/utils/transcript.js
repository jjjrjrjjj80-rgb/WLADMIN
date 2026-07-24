const { AttachmentBuilder } = require('discord.js');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * يجلب كل رسائل روم التذكرة ويبني ملف HTML بسيط لعرضها (يُرفع كمرفق بلوق الإغلاق)
 */
async function generateTranscript(channel) {
  let allMessages = [];
  let lastId;

  // نجلب الرسائل على دفعات (Discord يسمح 100 كحد أقصى بالمرة)
  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;
    const batch = await channel.messages.fetch(options);
    if (batch.size === 0) break;
    allMessages.push(...batch.values());
    lastId = batch.last().id;
    if (batch.size < 100) break;
  }

  allMessages.reverse(); // ترتيب من الأقدم للأحدث

  const rows = allMessages.map(m => {
    const time = new Date(m.createdTimestamp).toLocaleString('ar-SA');
    const author = escapeHtml(m.author?.tag || 'مستخدم محذوف');
    const content = escapeHtml(m.content || '');
    const attachments = [...m.attachments.values()]
      .map(a => `<div class="att"><a href="${a.url}" target="_blank">📎 ${escapeHtml(a.name)}</a></div>`).join('');
    return `<div class="msg"><div class="meta"><b>${author}</b> <span class="time">${time}</span></div><div class="content">${content}</div>${attachments}</div>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>محادثة التذكرة #${channel.name}</title>
<style>
  body { background:#1e1f22; color:#e6e6e6; font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px; }
  h1 { color:#8a63f2; }
  .msg { background:#2b2d31; border-radius:8px; padding:10px 14px; margin-bottom:8px; }
  .meta { color:#8a63f2; font-size:13px; margin-bottom:4px; }
  .time { color:#888; font-size:12px; margin-right:8px; }
  .content { white-space: pre-wrap; word-wrap: break-word; }
  .att a { color:#5aa9ff; }
</style>
</head>
<body>
<h1>📄 محادثة التذكرة: ${escapeHtml(channel.name)}</h1>
${rows || '<p>لا توجد رسائل.</p>'}
</body>
</html>`;

  return new AttachmentBuilder(Buffer.from(html, 'utf-8'), { name: `transcript-${channel.name}.html` });
}

module.exports = { generateTranscript };
