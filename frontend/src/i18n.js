export const langs = {
  zh: {
    appName:          '🦞 霸王龙虾',
    connecting:       '连接中...',
    connectFailed:    '连接失败',
    connectFailedMsg: '无法连接到后端，请确认服务已启动。\n',

    focusMode:        '🎯 专注模式 (3件)',
    allTasks:         '📋 全部任务',

    poolTitle:        '📝 待规划',
    poolHint:         (dateLabel) => `点击任务加入${dateLabel}`,
    poolEmpty:        '暂无待规划任务',

    todayPlan:        '今日计划',
    datePlan:         (m, d) => `${m}月${d}日计划`,

    planEmpty:        '暂无计划任务，从待规划里选几个吧 💪',
    allDone:          '今天的任务都完成啦 🎉',
    focusMore:        (n) => `还有 ${n} 个任务，切换到全部任务查看`,

    doneCount:        (n) => `🔥 ${n} 已完成`,
    longPressHint:    '长按归还',

    returnTitle:      '归还任务池',
    returnMsg:        (title) => `将「${title}」移回待规划？`,
    confirm:          '确认',
    cancel:           '取消',

    closeDayBtn:      '🌙 关闭当日计划',
    closeDayTitle:    '关闭当日计划',
    closeDayMsg:      (dateLabel) => `未完成的任务将自动归还任务池，确认关闭${dateLabel}？`,
    closeDayDone:     '已关闭',
    closeDayResult:   (n) => `${n} 个任务归还到池`,

    opFailed:         '操作失败',
    addFailed:        '添加失败',

    addTitle:         '➕ 添加任务',
    taskNameLabel:    '任务名称',
    taskNamePlaceholder: '要做什么？',
    addToPlanLabel:   '加入计划',
    optToday:         '今日',
    optPickDate:      '选择日期',
    optPool:          '待规划',
    add:              '添加',

    pickDateTitle:    '📅 选择日期',
  },

  en: {
    appName:          '🦞 Tidepool',
    connecting:       'Connecting...',
    connectFailed:    'Connection Failed',
    connectFailedMsg: 'Could not reach the backend. Make sure the server is running.\n',

    focusMode:        '🎯 Focus Mode (3)',
    allTasks:         '📋 All Tasks',

    poolTitle:        '📝 Pool',
    poolHint:         (dateLabel) => `Tap to add to ${dateLabel}`,
    poolEmpty:        'No tasks in pool',

    todayPlan:        "Today's Plan",
    datePlan:         (m, d) => `${shortMonth(m)} ${d} Plan`,

    planEmpty:        'No tasks planned — pick some from the pool 💪',
    allDone:          "All done for today 🎉",
    focusMore:        (n) => `${n} more task${n > 1 ? 's' : ''} — switch to All Tasks to see them`,

    doneCount:        (n) => `🔥 ${n} done`,
    longPressHint:    'hold to return',

    returnTitle:      'Return to Pool',
    returnMsg:        (title) => `Move "${title}" back to the pool?`,
    confirm:          'Confirm',
    cancel:           'Cancel',

    closeDayBtn:      '🌙 Close Day',
    closeDayTitle:    'Close Day',
    closeDayMsg:      (dateLabel) => `Unfinished tasks will return to the pool. Close ${dateLabel}?`,
    closeDayDone:     'Day Closed',
    closeDayResult:   (n) => `${n} task${n > 1 ? 's' : ''} returned to pool`,

    opFailed:         'Action Failed',
    addFailed:        'Failed to Add',

    addTitle:         '➕ Add Task',
    taskNameLabel:    'Task name',
    taskNamePlaceholder: 'What needs doing?',
    addToPlanLabel:   'Add to plan',
    optToday:         'Today',
    optPickDate:      'Pick Date',
    optPool:          'Pool',
    add:              'Add',

    pickDateTitle:    '📅 Pick a Date',
  },
};

const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function shortMonth(m) { return MONTHS_EN[m - 1]; }
