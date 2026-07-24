const config = require('../config');

function isOwnerOrSenior(member) {
  return member.roles.cache.has(config.OWNER_ROLE_ID) || member.roles.cache.has(config.SENIOR_ROLE_ID);
}

function isAdmin(member) {
  return member.roles.cache.has(config.ADMIN_ROLE_ID) || isOwnerOrSenior(member);
}

module.exports = { isOwnerOrSenior, isAdmin };
