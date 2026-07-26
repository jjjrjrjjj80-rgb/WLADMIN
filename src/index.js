const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const config = require('./config');
const connectDB = require('./database/connect');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});
client.commands = new Collection();
// ==== تحميل الأوامر ====
const commandsPath = path.join(__dirname, 'commands');
for (const folder of fs.readdirSync(commandsPath)) {
  const folderPath = path.join(commandsPath, folder);
  for (const file of fs.readdirSync(folderPath).filter(f => f.endsWith('.js'))) {
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
})();
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
// ⭐ حماية إضافية: تمنع أي خطأ متزامن يصدر من client (زي أخطاء بناء الإمبيدات) من إسقاط البوت بالكامل
client.on('error', (err) => console.error('⚠️ Client error - تم منع توقف البوت:', err));
process.on('uncaughtException', (err) => console.error('⚠️ Uncaught exception - تم منع توقف البوت:', err));
