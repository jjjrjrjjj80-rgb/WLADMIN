require('dotenv').config();

module.exports = {
  // ==== توكن واتصال ====
  TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  GUILD_ID: process.env.GUILD_ID,
  MONGO_URI: process.env.MONGO_URI,

  // ==== الرتب ====
  OWNER_ROLE_ID: process.env.OWNER_ROLE_ID,
  SENIOR_ROLE_ID: process.env.SENIOR_ROLE_ID,
  ADMIN_ROLE_ID: process.env.ADMIN_ROLE_ID,
  LEAVE_ROLE_ID: process.env.LEAVE_ROLE_ID,

  // ==== القنوات ====
  GENERAL_CHAT_CHANNEL_ID: process.env.GENERAL_CHAT_CHANNEL_ID,
  ADMIN_LOG_CHANNEL_ID: process.env.ADMIN_LOG_CHANNEL_ID,
  LEAVE_LOG_CHANNEL_ID: process.env.LEAVE_LOG_CHANNEL_ID,
  TICKET_LOG_CHANNEL_ID: process.env.TICKET_LOG_CHANNEL_ID,

  TIMEZONE: 'Asia/Riyadh',

  XP: {
    PER_MESSAGE: 1,
    COOLDOWN_SECONDS: 20,
    MIN_MESSAGE_LENGTH: 2,
    COUNTED_CHANNEL_IDS: [process.env.GENERAL_CHAT_CHANNEL_ID],
    ONLY_COUNT_ADMIN_ROLE: true
  },

  LEAVE: {
    MONTHLY_DAYS: 7,
    SWAPPABLE_ROLE_IDS: (process.env.LEAVE_SWAPPABLE_ROLE_IDS || '')
      .split(',').map(s => s.trim()).filter(Boolean)
  },

  TICKET_CALL_TIMEOUT_MINUTES: 10,

  TASK_TEMPLATES: {
    easy: [
      { type: 'xp', target: 600, label: 'اجمع 100 نقطة تفاعل بالشات العام' },
      { type: 'tickets', target: 10, label: 'استلم 7 تكتات' },
      { type: 'phrase', phrase: 'لا اله الا الله', target: 7, cooldownMinutes: 15, label: 'اكتب "لا اله الا الله" 7 مرات بالشات العام (مرة كل 15 دقيقة)' }
    ],
    medium: [
      { type: 'xp', target: 1200, label: 'اجمع 250 نقطة تفاعل بالشات العام' },
      { type: 'tickets', target: 15, label: 'استلم 13 تكت' },
      { type: 'phrase', phrase: 'سبحان الله', target: 10, cooldownMinutes: 15, label: 'اكتب "سبحان الله" 10 مرات بالشات العام (مرة كل 15 دقيقة)' }
    ],
    hard: [
      { type: 'xp', target: 2000, label: 'اجمع 350 نقطة تفاعل بالشات العام' },
      { type: 'tickets', target: 20, label: 'استلم 17 تكت' },
      { type: 'phrase', phrase: 'سبحان الله', target: 15, cooldownMinutes: 15, label: 'اكتب "سبحان الله" 15 مرة بالشات العام (مرة كل 15 دقيقة)' }
    ]
  },
  DEFAULT_DIFFICULTY: 'easy',

  LEAVE_MESSAGES: {
    approved: (durationDays) =>
      `تمت مراجعة طلب الإجازة ونفيدك بأنه تمت الموافقة عليها\n\n` +
      `مدة الإجازة: ${durationDays} يوم\n\n` +
      `نتمنى لكم إجازة سعيدة وننتظر عودتكم بالسلامة وفي حال اردت كسر الاجازة ماعليك سوى كتابة أمر كسر الإجازة\n\n` +
      `الإجازة معتمدة. ✅`,
    rejected: (reason) =>
      `تمت مراجعة طلب الإجازة ونفيدك بأنه لم تتم الموافقة على الطلب في الوقت الحالي\n\n` +
      `سبب الرفض: ${reason}\n\n` +
      `نشكرك تفهمك ونتمنى لك التوفيق`,
    brokenByAdmin: (reason) =>
      `مرحبًا،\n\n` +
      `نحيطك علمًا بأنه تم كسر الإجازة الخاصة بك، ويُرجى العودة لمباشرة مهامك ابتداءً من الآن\n\n` +
      `سبب كسر الإجازة: ${reason}\n\n` +
      `نأمل منك التواجد في أقرب وقت\n\n` +
      `شكرًا لتعاونك`,
    completedNaturally:
      `مرحبًا،\n\n` +
      `نحيطك علمًا بأن مدة الإجازة الخاصة بك قد انتهت\n\n` +
      `يرجى العودة لمباشرة مهامك واستئناف تفاعلك الإداري.\n\n` +
      `شكرًا لتعاونك، ونتمنى لك التوفيق.`
  },

  TICKET_CALL_DM:
    `مرحبًا،\n\n` +
    `لديك تذكرة دعم مفتوحة ولم يصلنا أي رد منك حتى الآن.\n\n` +
    `يرجى الرد على التذكرة خلال (10 دقائق)، وفي حال عدم وجود أي استجابة خلال هذه الفترة، سيتم إغلاق التذكرة تلقائيًا.\n\n` +
    `شكرًا لتعاونك.`
};
