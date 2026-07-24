const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('./config');

function loadCommands() {
  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');
  const folders = fs.readdirSync(commandsPath);
  for (const folder of folders) {
    const folderPath = path.join(commandsPath, folder);
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
    for (const file of files) {
      const command = require(path.join(folderPath, file));
      commands.push(command.data.toJSON());
    }
  }
  return commands;
}

(async () => {
  const commands = loadCommands();
  const rest = new REST({ version: '10' }).setToken(config.TOKEN);

  try {
    console.log(`⏳ تسجيل ${commands.length} أمر سلاش...`);
    await rest.put(
      Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID),
      { body: commands }
    );
    console.log('✅ تم تسجيل الأوامر بنجاح.');
  } catch (err) {
    console.error('❌ فشل تسجيل الأوامر:', err);
  }
})();
