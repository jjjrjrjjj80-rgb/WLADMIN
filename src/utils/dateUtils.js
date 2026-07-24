const moment = require('moment-timezone');
const config = require('../config');

function todayKey() {
  return moment().tz(config.TIMEZONE).format('YYYY-MM-DD');
}

function monthKey() {
  return moment().tz(config.TIMEZONE).format('YYYY-MM');
}

function now() {
  return moment().tz(config.TIMEZONE);
}

module.exports = { todayKey, monthKey, now };
