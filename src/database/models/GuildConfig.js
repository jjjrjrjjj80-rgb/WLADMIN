const mongoose = require('mongoose');
const config = require('../../config');
const GuildConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'global', unique: true },
  currentDifficulty: { type: String, default: config.DEFAULT_DIFFICULTY },
  nextDifficulty: { type: String, default: null }, // يحدده الأونر/العليا قبل بداية اليوم الجديد
  ticketCounter: { type: Number, default: 0 },
  reportChannelId: { type: String, default: null }
});
GuildConfigSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({ key: 'global' });
  if (!doc) doc = await this.create({ key: 'global' });
  return doc;
};
module.exports = mongoose.model('GuildConfig', GuildConfigSchema);
