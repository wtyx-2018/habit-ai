import React, { useCallback, useState } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card, SectionTitle, Tag, Empty } from '@/components/ui';
import { C, RADIUS, CARD_SHADOW, DOMAIN_COLORS, DOMAIN_LABELS } from '@/theme';
import { taskRepo, slotRepo, stopRepo, goalRepo } from '@/lib/db';
import type { Task, TimeSlot, StopRule, Goal } from '@/lib/models';
import { todayStr, slotsForToday, greeting, weekdayCN, todayWeekday } from '@/lib/utils';

export default function TodayScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [stops, setStops] = useState<StopRule[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const router = useSafeRouter();

  const load = useCallback(() => {
    taskRepo.list().then(setTasks);
    slotRepo.list().then(setSlots);
    stopRepo.list().then(setStops);
    goalRepo.list().then(setGoals);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const today = todayStr();
  const todayTasks = tasks.filter((t) => t.scheduledDate === today && t.status !== 'skipped');
  // 子任务（5-30分钟小动作）优先展示
  const subTasks = todayTasks.filter((t) => t.parentId);
  const soloTasks = todayTasks.filter((t) => !t.parentId);
  const list = subTasks.length ? subTasks : soloTasks;

  const doneCount = todayTasks.filter((t) => t.status === 'done').length;
  const linkedCount = list.filter((t) => t.goalId || (t.parentId && tasks.find((p) => p.id === t.parentId)?.goalId)).length;
  const alignment = list.length ? Math.round((linkedCount / list.length) * 100) : 0;

  // 连续打卡天数（有完成任务的连续日期 + 今天）
  const streak = computeStreak(tasks);

  const todaySlots = slotsForToday(slots);
  const activeStops = stops.filter((s) => s.status === 'active');
  const stopReminder = todayTasks.some((t) => t.status === 'done')
    ? activeStops.filter((s) => s.text && s.text.length > 0)[0]
    : activeStops[(todayWeekday() % Math.max(1, activeStops.length))];

  const toggle = async (id: string) => {
    const next = tasks.map((t) => (t.id === id ? { ...t, status: t.status === 'done' ? 'todo' as const : 'done' as const } : t));
    await taskRepo.save(next);
    setTasks(next);
  };

  return (
    <Screen>
      <StatusBar style="dark" />
      <View style={{ paddingHorizontal: 18 }}>
        {/* 问候 */}
        <View style={styles.hero}>
          <View>
            <Text style={styles.date}>{`${new Date().getMonth() + 1}月${new Date().getDate()}日 · ${weekdayCN(todayWeekday())}`}</Text>
            <Text style={styles.greet}>{greeting()}，今天也往前拱一点</Text>
          </View>
          <FontAwesome6 name="mountain-sun" size={26} color={C.primary} />
        </View>

        {/* 概览 */}
        <View style={styles.statsRow}>
          <Stat label="连续" value={`${streak}天`} color={C.complete} />
          <Stat label="今日完成" value={`${doneCount}`} color={C.primary} />
          <Stat label="方向对齐" value={`${alignment}%`} color={C.accent} />
        </View>

        {/* 焦虑急救入口 */}
        <TouchableOpacity style={styles.anxietyBanner} onPress={() => router.push('/anxiety')} activeOpacity={0.85}>
          <View style={styles.anxietyIcon}><FontAwesome6 name="spa" size={16} color={C.tipWarm} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.anxietyTitle}>此刻有些焦虑、停不下来？</Text>
            <Text style={styles.anxietySub}>试试 4 分钟呼吸与认知急救 · 自助工具，非医疗</Text>
          </View>
          <FontAwesome6 name="chevron-right" size={14} color={C.tipWarm} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {renderSlots(todaySlots)}
        {renderTaskSection(list, tasks)}
        {renderStops(stopReminder)}
      </ScrollView>

      {/* FAB */}
      <Pressable style={styles.fab} onPress={() => router.push('/task-create')}>
        <FontAwesome6 name="plus" size={22} color="#fff" />
      </Pressable>

      {/* 内联函数组件需提权为渲染函数 */}
      {null}
    </Screen>
  );

  function renderSlots(slots: TimeSlot[]): React.ReactNode {
    return (
      <View>
        <SectionTitle
          title="今晚的节奏"
          right={<Text style={styles.slotHint}>共 {slots.length} 段</Text>}
        />
        {slots.length === 0 ? (
          <Empty text="今晚没有安排时段" hint="留有空白也很好，去「我的 → 时间方案」随时调整" />
        ) : (
          <ScrollRow>
            {slots.map((s) => {
              const sc = slotColor(s.kind);
              return (
                <View key={s.id} style={[styles.slotCard, { backgroundColor: hexA(sc, 0.08), borderColor: hexA(sc, 0.26) }]}>
                  <Text style={styles.slotTime}>{s.start}–{s.end}</Text>
                  <Text style={[styles.slotKind, { color: sc }]}>{kindText(s.kind)}</Text>
                </View>
              );
            })}
          </ScrollRow>
        )}
      </View>
    );
  }

  function renderTaskSection(list: Task[], _all: Task[]): React.ReactNode {
    return (
      <View>
        <SectionTitle
          title="今日小动作"
          right={
            <TouchableOpacity onPress={() => router.push('/task-create')}>
              <Text style={{ color: C.primary, fontWeight: '600', fontSize: 13 }}>＋ 添加</Text>
            </TouchableOpacity>
          }
        />
        {list.length === 0 ? (
          <Empty text="今晚还没有小动作" hint="也许，先只是把一件小事写下来，就够了" />
        ) : (
          list.map((t) => (
            <RowTask key={t.id} task={t} onClick={() => toggle(t.id)} />
          ))
        )}
      </View>
    );
  }

  function renderStops(rule: StopRule | undefined): React.ReactNode {
    if (!rule) return null;
    return (
      <View>
        <SectionTitle title="今晚不为" right={
          <TouchableOpacity onPress={() => router.push('/stops')}><Text style={{ color: C.muted, fontSize: 12 }}>查看全部</Text></TouchableOpacity>
        } />
        <Card style={{ backgroundColor: C.bgPage }}>
          <View style={styles.rowBetween}>
            <Text style={styles.stopText}>“{rule.text}”</Text>
            <Tag text={rule.category} color={C.muted} />
          </View>
          {rule.reason ? <Text style={styles.stopReason}>原因：{rule.reason}</Text> : null}
        </Card>
      </View>
    );
  }
}

// ===== 小组件 =====
function RowTask({ task, onClick }: { task: Task; onClick: () => void }) {
  const color = DOMAIN_COLORS[task.domain];
  const done = task.status === 'done';
  return (
    <TouchableOpacity onPress={onClick} activeOpacity={0.8} style={[styles.taskRow, done && { opacity: 0.55 }]}>
      <View style={[styles.check, done && { backgroundColor: C.complete, borderColor: C.complete }]}>
        {done ? <FontAwesome6 name="check" size={14} color="#fff" /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowBetween}>
          <Text style={[styles.taskTitle, done && { textDecorationLine: 'line-through', color: C.muted }]} numberOfLines={2}>{task.title}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
          <Tag text={DOMAIN_LABELS[task.domain]} color={color} />
          <Text style={styles.taskMeta}>{task.estMinutes} 分钟</Text>
          <Text style={styles.taskMeta}>·</Text>
          <Text style={styles.taskMeta}>{task.type === 'deep' ? '深度' : '轻量'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function ScrollRow({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
      {children}
    </View>
  );
}

function slotColor(kind: string): string {
  return kind === 'deep' ? C.info : kind === 'review' ? C.accent : C.complete;
}
function kindText(kind: string): string {
  return kind === 'deep' ? '深度' : kind === 'review' ? '复盘' : '轻量';
}

function computeStreak(tasks: Task[]): number {
  const dates = new Set(
    tasks.filter((t) => t.status === 'done' && t.scheduledDate).map((t) => t.scheduledDate as string),
  );
  let streak = 0;
  const d = new Date();
  // 今天也算
  if (!dates.has(todayStr())) {
    d.setDate(d.getDate() - 1); // 从昨天开始数
  }
  while (true) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const s = `${y}-${m}-${day}`;
    if (!dates.has(s)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, paddingBottom: 16 },
  date: { color: C.muted, fontSize: 13 },
  greet: { fontSize: 20, fontWeight: '600', color: C.text, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '600' },
  statLabel: { fontSize: 12, color: C.muted, marginTop: 2 },
  anxietyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: hexA(C.tipWarm, 0.1), borderRadius: RADIUS.card,
    padding: 14, marginBottom: 4, borderWidth: 1, borderColor: hexA(C.tipWarm, 0.18),
  },
  anxietyIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: hexA(C.tipWarm, 0.16), alignItems: 'center', justifyContent: 'center' },
  anxietyTitle: { color: C.text, fontWeight: '600', fontSize: 15 },
  anxietySub: { color: C.muted, fontSize: 12, marginTop: 2 },
  slotHint: { color: C.muted, fontSize: 12 },
  slotCard: {
    backgroundColor: 'transparent', borderRadius: RADIUS.card, borderWidth: 1,
    paddingVertical: 12, paddingHorizontal: 14, minWidth: 128, flexGrow: 1, flexBasis: '30%',
  },
  slotTime: { color: C.text, fontWeight: '600', fontSize: 14 },
  slotKind: { marginTop: 4, fontSize: 12, fontWeight: '600' },
  taskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: RADIUS.card,
    padding: 14, marginBottom: 10, ...CARD_SHADOW,
  },
  check: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: C.muted,
    alignItems: 'center', justifyContent: 'center',
  },
  taskTitle: { fontSize: 15, fontWeight: '600', color: C.text },
  taskMeta: { color: C.muted, fontSize: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stopText: { fontSize: 14, fontWeight: '600', color: C.text, flex: 1, marginRight: 8 },
  stopReason: { color: C.muted, fontSize: 12, marginTop: 6 },
  fab: {
    position: 'absolute', right: 20, bottom: 26,
    width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}