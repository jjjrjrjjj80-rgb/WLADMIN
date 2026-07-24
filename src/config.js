require('dotenv').config();

module.exports = {
  // ==== توكن واتصال ====
  TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  GUILD_ID: process.env.GUILD_ID,
  MONGO_URI: process.env.MONGO_URI,

  // ==== الرتب ====
  OWNER_ROLE_ID: process.env.OWNER_ROLE_ID,
  SENIOR_ROLE_ID: process.env.SENIOR_ROLE_ID, // الرتبة العليا (تقدر تعتمد الاجازات وتستخدم أوامر الإدارة)
  ADMIN_ROLE_ID: process.env.ADMIN_ROLE_ID,   // رتبة الإداري نفسه (المهام / النقاط / التكتات)
  LEAVE_ROLE_ID: process.env.LEAVE_ROLE_ID,   // الرتبة التي تُعطى أثناء الإجازة

  // ==== القنوات ====
  GENERAL_CHAT_CHANNEL_ID: process.env.GENERAL_CHAT_CHANNEL_ID,
  ADMIN_LOG_CHANNEL_ID: process.env.ADMIN_LOG_CHANNEL_ID,
  LEAVE_LOG_CHANNEL_ID: process.env.LEAVE_LOG_CHANNEL_ID,
  TICKET_LOG_CHANNEL_ID: process.env.TICKET_LOG_CHANNEL_ID,
  TICKET_PANEL_CHANNEL_ID: process.env.TICKET_PANEL_CHANNEL_ID,
  TICKET_CATEGORY_ID: process.env.TICKET_CATEGORY_ID,

  TIMEZONE: 'Asia/Riyadh',

  // ==== نظام نقاط التفاعل (XP) ====
  XP: {
    PER_MESSAGE: 1,             // نقطة لكل رسالة محسوبة
    COOLDOWN_SECONDS: 20,       // لازم تمر 20 ثانية بين كل رسالة تُحسب لنفس الشخص (حماية من السبام)
    MIN_MESSAGE_LENGTH: 2,      // أقل عدد أحرف حتى تُحسب الرسالة
    COUNTED_CHANNEL_IDS: [],    // اتركها فاضية = تُحسب من أي شات، أو حط IDs شاتات محددة
    ONLY_COUNT_ADMIN_ROLE: true // لا يدخل في التوب إلا من يحمل رتبة الإداري
  },

  // ==== نظام الإجازات ====
  LEAVE: {
    MONTHLY_HOURS: 72,          // رصيد كل إداري كل شهر
    RESET_DAY_OF_MONTH: 1       // يوم تصفير الرصيد الشهري
  },

  // ==== قوالب المهام اليومية حسب الصعوبة ====
  // كل مهمة: type: 'xp' | 'tickets' | 'phrase'
  TASK_TEMPLATES: {
    easy: [
      { type: 'xp', target: 1500, label: 'اجمع 1500 نقطة تفاعل بالشات العام' },
      { type: 'tickets', target: 8, label: 'استلم 8 تكتات' },
      { type: 'phrase', phrase: 'سبحان الله', target: 5, cooldownMinutes: 15, label: 'اكتب "سبحان الله" 5 مرات بالشات العام (مرة كل 15 دقيقة)' }
    ],
    medium: [
      { type: 'xp', target: 3000, label: 'اجمع 3000 نقطة تفاعل بالشات العام' },
      { type: 'tickets', target: 15, label: 'استلم 15 تكت' },
      { type: 'phrase', phrase: 'سبحان الله', target: 8, cooldownMinutes: 15, label: 'اكتب "سبحان الله" 8 مرات بالشات العام (مرة كل 15 دقيقة)' }
    ],
    hard: [
      { type: 'xp', target: 5000, label: 'اجمع 5000 نقطة تفاعل بالشات العام' },
      { type: 'tickets', target: 25, label: 'استلم 25 تكت' },
      { type: 'phrase', phrase: 'سبحان الله', target: 12, cooldownMinutes: 15, label: 'اكتب "سبحان الله" 12 مرة بالشات العام (مرة كل 15 دقيقة)' }
    ]
  },
  DEFAULT_DIFFICULTY: 'medium',

  // ==== أنواع التذاكر في البانل (بالأرقام) ====
  TICKET_TYPES: [
    { id: '1', label: 'دعم عام', emoji: '🎫' },
    { id: '2', label: 'شكوى', emoji: '⚠️' },
    { id: '3', label: 'استفسار مالي', emoji: '💰' },
    { id: '4', label: 'تبليغ عن إداري', emoji: '🚨' }
  ]
};
