    const command = require(path.join(folderPath, file));
    client.commands.set(command.data.name, command);
  }
}

// ==== تحميل الأحداث ====
const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'))) {
  const event = require(path.join(eventsPath, file));
  if (event.once) client.once(event.name, (...args) => event.execute(...args));
  else client.on(event.name, (...args) => event.execute(...args));
}

(async () => {
  await connectDB();
  await client.login(config.TOKEN);
  client.once('ready', () => startWarningExpiryCron(client));
})();

process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
// ⭐ حماية إضافية: تمنع أي خطأ متزامن يصدر من client (زي أخطاء بناء الإمبيدات) من إسقاط البوت بالكامل
client.on('error', (err) => console.error('⚠️ Client error - تم منع توقف البوت:', err));
process.on('uncaughtException', (err) => console.error('⚠️ Uncaught exception - تم منع توقف البوت:', err));
