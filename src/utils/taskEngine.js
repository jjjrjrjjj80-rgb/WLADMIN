const config = require('../config');
const { todayKey } = require('./dateUtils');

/**
 * يبني مصفوفة مهام جديدة لليوم بناءً على مستوى الصعوبة
 */
function buildTasksForDifficulty(difficulty) {
  const templates = config.TASK_TEMPLATES[difficulty] || config.TASK_TEMPLATES[config.DEFAULT_DIFFICULTY];
  return templates.map(t => ({
    type: t.type,
    label: t.label,
    target: t.target,
    progress: 0,
    phrase: t.phrase || null,
    cooldownMinutes: t.cooldownMinutes || null,
    lastCountedAt: null,
    completed: false
  }));
}

/**
 * يتأكد أن مستخدم معين عنده مهام اليوم الحالي، وإذا لا يولّدها له (بدون ما يفقد تقدم اليوم لو موجود أصلاً)
 * userDoc: مستند المستخدم (mongoose document) - يرجعه معدل بدون ما يحفظه (المستدعي يحفظه)
 */
function ensureTodayTasks(userDoc, difficulty) {
  const today = todayKey();
  if (userDoc.lastTaskDate !== today) {
    userDoc.lastTaskDate = today;
    userDoc.dayCompletedToday = false;
    userDoc.currentTasks = buildTasksForDifficulty(difficulty);
  }
  return userDoc;
}

/**
 * يفحص إذا كل مهام اليوم مكتملة، ويرجع true/false. ويعلّم dayCompletedToday إذا اكتملت لأول مرة
 * يرجع { justCompleted: boolean }
 */
function checkAndMarkCompletion(userDoc) {
  if (userDoc.dayCompletedToday) return { justCompleted: false };
  const allDone = userDoc.currentTasks.length > 0 && userDoc.currentTasks.every(t => t.completed);
  if (allDone) {
    userDoc.dayCompletedToday = true;
    return { justCompleted: true };
  }
  return { justCompleted: false };
}

module.exports = { buildTasksForDifficulty, ensureTodayTasks, checkAndMarkCompletion };
