import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, SafeAreaView, StatusBar,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { colors } from './src/theme';
import { langs } from './src/i18n';
import {
  fetchPool, fetchPlan,
  createTask, updateTaskStatus,
  addToPlan, removeFromPlan, closeDay,
} from './src/storage';

// ── 工具函数 ────────────────────────────────────────────────────────────────

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayStr() {
  return toDateStr(new Date());
}

function dateFromStr(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateLabel(dateStr, t) {
  const today = todayStr();
  if (dateStr === today) return t.todayPlan;
  const [, m, d] = dateStr.split('-').map(Number);
  return t.datePlan(m, d);
}

// ── 主页面 ──────────────────────────────────────────────────────────────────

export default function App() {
  const today = todayStr();

  const [lang, setLang]               = useState('zh'); // 'zh' | 'en'
  const t = langs[lang];

  const [pool, setPool]               = useState([]);
  const [plan, setPlan]               = useState([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [mode, setMode]               = useState('focus');
  const [loading, setLoading]         = useState(true);
  const [markedDates, setMarkedDates] = useState({});

  // 添加任务 Modal
  const [addVisible, setAddVisible]           = useState(false);
  const [newTitle, setNewTitle]               = useState('');
  const [dateOption, setDateOption]           = useState('today');
  const [pickedDate, setPickedDate]           = useState(today);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [adding, setAdding]                   = useState(false);

  // ── 数据加载 ───────────────────────────────────────────────────────────────

  const loadData = useCallback(async (planDate = selectedDate) => {
    try {
      const [poolData, planData] = await Promise.all([
        fetchPool(),
        fetchPlan(dateFromStr(planDate)),
      ]);
      setPool(poolData);
      setPlan(planData);

      const marks = {};
      marks[today] = {
        selected: planDate === today,
        selectedColor: colors.accent,
        marked: planDate !== today && planData.some(e => e.task.status !== 'done'),
        dotColor: colors.primary,
      };
      if (planDate !== today) {
        marks[planDate] = {
          selected: true,
          selectedColor: colors.primary,
          marked: planData.some(e => e.task.status !== 'done'),
          dotColor: colors.primary,
        };
      }
      setMarkedDates(marks);
    } catch (e) {
      Alert.alert(t.connectFailed, t.connectFailedMsg + e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, today, t]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── 操作函数 ───────────────────────────────────────────────────────────────

  function handleDayPress(day) {
    setSelectedDate(day.dateString);
    loadData(day.dateString);
  }

  async function handleAddTask() {
    const title = newTitle.trim();
    if (!title) return;
    setAdding(true);
    try {
      const task = await createTask(title);
      if (dateOption === 'today') {
        await addToPlan(new Date(), task.id);
      } else if (dateOption === 'pick') {
        await addToPlan(dateFromStr(pickedDate), task.id);
      }
      setNewTitle('');
      setDateOption('today');
      setAddVisible(false);
      await loadData();
    } catch (e) {
      Alert.alert(t.addFailed, e.message);
    } finally {
      setAdding(false);
    }
  }

  async function handlePoolTaskTap(task) {
    try {
      await addToPlan(dateFromStr(selectedDate), task.id);
      await loadData();
    } catch (e) {
      Alert.alert(t.opFailed, e.message);
    }
  }

  async function handleToggleDone(entry) {
    const nextStatus = entry.task.status === 'done' ? 'pending' : 'done';
    try {
      await updateTaskStatus(entry.task.id, nextStatus);
      await loadData();
    } catch (e) {
      Alert.alert(t.opFailed, e.message);
    }
  }

  async function handleReturnToPool(entry) {
    Alert.alert(
      t.returnTitle,
      t.returnMsg(entry.task.title),
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.confirm,
          onPress: async () => {
            try {
              await removeFromPlan(dateFromStr(selectedDate), entry.task.id);
              await loadData();
            } catch (e) {
              Alert.alert(t.opFailed, e.message);
            }
          },
        },
      ]
    );
  }

  async function handleCloseDay() {
    const dateLabel = formatDateLabel(selectedDate, t);
    Alert.alert(
      t.closeDayTitle,
      t.closeDayMsg(dateLabel),
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.confirm,
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await closeDay(dateFromStr(selectedDate));
              await loadData();
              Alert.alert(t.closeDayDone, t.closeDayResult(result.returned_to_pool));
            } catch (e) {
              Alert.alert(t.opFailed, e.message);
            }
          },
        },
      ]
    );
  }

  // ── 计算显示数据 ───────────────────────────────────────────────────────────

  const doneTasks   = plan.filter(e => e.task.status === 'done');
  const pendingPlan = plan.filter(e => e.task.status !== 'done');
  const displayPlan = mode === 'focus' ? pendingPlan.slice(0, 3) : pendingPlan;
  const displayDone = doneTasks;

  const dateLabel = formatDateLabel(selectedDate, t);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>{t.connecting}</Text>
      </View>
    );
  }

  // ── 渲染 ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>

          {/* ── Header ── */}
          <View style={s.header}>
            <Text style={s.logo}>{t.appName}</Text>
            <View style={s.headerRight}>
              <TouchableOpacity
                style={s.langToggle}
                onPress={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
              >
                <Text style={s.langToggleText}>{lang === 'zh' ? 'EN' : '中'}</Text>
              </TouchableOpacity>
              <View style={s.streakBadge}>
                <Text style={s.streakText}>{t.doneCount(doneTasks.length)}</Text>
              </View>
            </View>
          </View>

          {/* ── 模式切换 ── */}
          <View style={s.modeRow}>
            <TouchableOpacity
              style={[s.modeBtn, mode === 'focus' && s.modeBtnActive]}
              onPress={() => setMode('focus')}
            >
              <Text style={[s.modeBtnText, mode === 'focus' && s.modeBtnTextActive]}>
                {t.focusMode}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modeBtn, mode === 'all' && s.modeBtnActive]}
              onPress={() => setMode('all')}
            >
              <Text style={[s.modeBtnText, mode === 'all' && s.modeBtnTextActive]}>
                {t.allTasks}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── 任务池 ── */}
          <View style={s.poolSection}>
            <View style={s.poolHeader}>
              <Text style={s.poolTitle}>{t.poolTitle}</Text>
              <View style={s.countBadge}>
                <Text style={s.countText}>{pool.length}</Text>
              </View>
            </View>
            <Text style={s.poolHint}>{t.poolHint(dateLabel)}</Text>
            {pool.length === 0 ? (
              <Text style={s.emptyHint}>{t.poolEmpty}</Text>
            ) : (
              pool.map(task => (
                <TouchableOpacity
                  key={task.id}
                  style={s.poolCard}
                  onPress={() => handlePoolTaskTap(task)}
                  activeOpacity={0.7}
                >
                  <View style={s.addCircle}>
                    <Text style={s.addCircleText}>+</Text>
                  </View>
                  <Text style={s.taskTitle}>{task.title}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* ── 日历 ── */}
          <View style={s.calendarWrapper}>
            <Calendar
              current={selectedDate}
              markedDates={markedDates}
              onDayPress={handleDayPress}
              theme={{
                backgroundColor:            colors.card,
                calendarBackground:         colors.card,
                dayTextColor:               colors.text,
                monthTextColor:             colors.text,
                arrowColor:                 colors.primary,
                todayTextColor:             colors.primary,
                selectedDayBackgroundColor: colors.accent,
                dotColor:                   colors.primary,
                textDisabledColor:          colors.textDim,
              }}
            />
          </View>

          {/* ── 日计划 ── */}
          <Text style={s.sectionTitle}>📅 {dateLabel}</Text>

          {displayPlan.length === 0 && displayDone.length === 0 ? (
            <Text style={s.emptyHint}>{t.planEmpty}</Text>
          ) : (
            <>
              {displayPlan.map(entry => (
                <TouchableOpacity
                  key={entry.task.id}
                  style={s.taskCard}
                  onPress={() => handleToggleDone(entry)}
                  onLongPress={() => handleReturnToPool(entry)}
                  activeOpacity={0.8}
                >
                  <View style={s.checkbox} />
                  <Text style={s.taskTitle}>{entry.task.title}</Text>
                  <Text style={s.longPressHint}>{t.longPressHint}</Text>
                </TouchableOpacity>
              ))}

              {displayDone.map(entry => (
                <TouchableOpacity
                  key={entry.task.id}
                  style={[s.taskCard, s.taskCardDone]}
                  onPress={() => handleToggleDone(entry)}
                  activeOpacity={0.7}
                >
                  <View style={[s.checkbox, s.checkboxDone]}>
                    <Text style={s.checkmark}>✓</Text>
                  </View>
                  <Text style={[s.taskTitle, s.taskTitleDone]}>{entry.task.title}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {mode === 'focus' && pendingPlan.length > 3 && (
            <Text style={s.focusHint}>{t.focusMore(pendingPlan.length - 3)}</Text>
          )}

          {plan.length > 0 && (
            <TouchableOpacity style={s.closeDayBtn} onPress={handleCloseDay}>
              <Text style={s.closeDayText}>{t.closeDayBtn}</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ── FAB ── */}
        <TouchableOpacity style={s.fab} onPress={() => setAddVisible(true)}>
          <Text style={s.fabText}>+</Text>
        </TouchableOpacity>

        {/* ── 添加任务 Modal ── */}
        <Modal
          visible={addVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAddVisible(false)}
        >
          <TouchableOpacity
            style={s.modalOverlay}
            activeOpacity={1}
            onPress={() => { setAddVisible(false); setNewTitle(''); setDateOption('today'); }}
          >
            <TouchableOpacity activeOpacity={1} style={s.modalBox}>
              <Text style={s.modalTitle}>{t.addTitle}</Text>

              <Text style={s.modalLabel}>{t.taskNameLabel}</Text>
              <TextInput
                style={s.modalInput}
                placeholder={t.taskNamePlaceholder}
                placeholderTextColor={colors.textDim}
                value={newTitle}
                onChangeText={setNewTitle}
                autoFocus
                onSubmitEditing={handleAddTask}
                returnKeyType="done"
              />

              <Text style={s.modalLabel}>{t.addToPlanLabel}</Text>
              <View style={s.dateOptionRow}>
                {[
                  { key: 'today', label: t.optToday },
                  { key: 'pick',  label: t.optPickDate },
                  { key: 'pool',  label: t.optPool },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[s.dateOptBtn, dateOption === opt.key && s.dateOptBtnActive]}
                    onPress={() => {
                      setDateOption(opt.key);
                      if (opt.key === 'pick') setDatePickerVisible(true);
                    }}
                  >
                    <Text style={[s.dateOptText, dateOption === opt.key && s.dateOptTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {dateOption === 'pick' && (
                <TouchableOpacity
                  style={s.pickedDateRow}
                  onPress={() => setDatePickerVisible(true)}
                >
                  <Text style={s.pickedDateText}>📅 {pickedDate}</Text>
                </TouchableOpacity>
              )}

              <View style={s.modalActions}>
                <TouchableOpacity
                  style={s.btnCancel}
                  onPress={() => { setAddVisible(false); setNewTitle(''); setDateOption('today'); }}
                >
                  <Text style={s.btnCancelText}>{t.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btnSubmit, (!newTitle.trim() || adding) && s.btnDisabled]}
                  onPress={handleAddTask}
                  disabled={!newTitle.trim() || adding}
                >
                  {adding
                    ? <ActivityIndicator color="white" size="small" />
                    : <Text style={s.btnSubmitText}>{t.add}</Text>
                  }
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* ── 日期选择器 Modal ── */}
        <Modal
          visible={datePickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDatePickerVisible(false)}
        >
          <TouchableOpacity
            style={s.modalOverlay}
            activeOpacity={1}
            onPress={() => setDatePickerVisible(false)}
          >
            <TouchableOpacity activeOpacity={1} style={s.modalBox}>
              <Text style={s.modalTitle}>{t.pickDateTitle}</Text>
              <Calendar
                current={pickedDate}
                minDate={today}
                onDayPress={(day) => {
                  setPickedDate(day.dateString);
                  setDatePickerVisible(false);
                }}
                markedDates={{
                  [pickedDate]: { selected: true, selectedColor: colors.primary },
                }}
                theme={{
                  backgroundColor:            colors.card,
                  calendarBackground:         colors.card,
                  dayTextColor:               colors.text,
                  monthTextColor:             colors.text,
                  arrowColor:                 colors.primary,
                  todayTextColor:             colors.secondary,
                  selectedDayBackgroundColor: colors.primary,
                  dotColor:                   colors.primary,
                  textDisabledColor:          colors.textDim,
                }}
              />
              <TouchableOpacity
                style={[s.btnCancel, { marginTop: 12 }]}
                onPress={() => setDatePickerVisible(false)}
              >
                <Text style={s.btnCancelText}>{t.cancel}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── 样式 ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: colors.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  centered:          { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  loadingText:       { color: colors.textDim, marginTop: 12 },
  scroll:            { flex: 1 },
  scrollContent:     { padding: 20 },

  // Header
  header:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  logo:              { fontSize: 22, fontWeight: 'bold', color: colors.text },
  headerRight:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  langToggle:        { borderWidth: 1, borderColor: colors.textDim, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  langToggleText:    { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  streakBadge:       { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  streakText:        { color: 'white', fontSize: 13, fontWeight: '600' },

  // Mode toggle
  modeRow:           { flexDirection: 'row', gap: 10, marginBottom: 20 },
  modeBtn:           { flex: 1, padding: 12, borderRadius: 10, backgroundColor: colors.card, alignItems: 'center' },
  modeBtnActive:     { backgroundColor: colors.primary },
  modeBtnText:       { color: colors.textDim, fontSize: 14 },
  modeBtnTextActive: { color: 'white', fontWeight: '600' },

  // Pool section
  poolSection:       { backgroundColor: colors.pendingBg, borderRadius: 15, padding: 16, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: colors.secondary },
  poolHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  poolTitle:         { fontSize: 16, color: colors.secondary, fontWeight: '600' },
  countBadge:        { backgroundColor: colors.secondary, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10 },
  countText:         { color: '#000', fontSize: 13, fontWeight: 'bold' },
  poolHint:          { color: colors.textDim, fontSize: 13, marginBottom: 12 },
  poolCard:          { backgroundColor: colors.card, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  addCircle:         { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.secondary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  addCircleText:     { color: colors.secondary, fontSize: 18, lineHeight: 22 },

  // Calendar
  calendarWrapper:   { borderRadius: 15, overflow: 'hidden', marginBottom: 20 },

  // Section title & hints
  sectionTitle:      { fontSize: 15, color: colors.textDim, marginBottom: 14 },
  emptyHint:         { color: colors.textDim, fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  focusHint:         { color: colors.textDim, fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 8 },

  // Task cards
  taskCard:          { backgroundColor: colors.card, borderRadius: 15, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  taskCardDone:      { opacity: 0.5 },
  checkbox:          { width: 28, height: 28, borderRadius: 14, borderWidth: 3, borderColor: colors.primary, marginRight: 14 },
  checkboxDone:      { backgroundColor: colors.success, borderColor: colors.success, justifyContent: 'center', alignItems: 'center' },
  checkmark:         { color: 'white', fontWeight: 'bold', fontSize: 14 },
  taskTitle:         { fontSize: 16, color: colors.text, flex: 1 },
  taskTitleDone:     { textDecorationLine: 'line-through' },
  longPressHint:     { fontSize: 11, color: colors.textDim },

  // Close day
  closeDayBtn:       { marginTop: 8, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.textDim, alignItems: 'center' },
  closeDayText:      { color: colors.textDim, fontSize: 15 },

  // FAB
  fab:               { position: 'absolute', bottom: 30, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  fabText:           { color: 'white', fontSize: 32, lineHeight: 36 },

  // Modal
  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalBox:          { backgroundColor: colors.card, borderRadius: 20, padding: 28, width: '88%' },
  modalTitle:        { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 20 },
  modalLabel:        { color: colors.textDim, fontSize: 14, marginBottom: 8 },
  modalInput:        { backgroundColor: colors.accent, color: colors.text, padding: 14, borderRadius: 10, fontSize: 16, marginBottom: 16 },

  // Date option segmented control
  dateOptionRow:     { flexDirection: 'row', gap: 8, marginBottom: 12 },
  dateOptBtn:        { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.accent, alignItems: 'center' },
  dateOptBtnActive:  { backgroundColor: colors.primary },
  dateOptText:       { color: colors.textDim, fontSize: 13 },
  dateOptTextActive: { color: 'white', fontWeight: '600' },

  // Picked date display
  pickedDateRow:     { backgroundColor: colors.accent, borderRadius: 8, padding: 10, marginBottom: 12, alignItems: 'center' },
  pickedDateText:    { color: colors.secondary, fontSize: 14 },

  // Modal buttons
  modalActions:      { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnCancel:         { flex: 1, padding: 14, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center' },
  btnCancelText:     { color: colors.text, fontSize: 15 },
  btnSubmit:         { flex: 1, padding: 14, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' },
  btnSubmitText:     { color: 'white', fontSize: 15, fontWeight: '600' },
  btnDisabled:       { opacity: 0.4 },
});
