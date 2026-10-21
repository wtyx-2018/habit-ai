import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome6 } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { Screen } from '@/components/Screen';
import { Card, Btn, ModalSheet, Tag, Empty, hexA } from '@/components/ui';
import { C, RADIUS, GOAL_LEVEL_COLORS } from '@/theme';
import { goalRepo, taskRepo, uid } from '@/lib/db';
import type { Goal, GoalLevel } from '@/lib/models';

const LEVELS: { key: GoalLevel; label: string }[] = [
  { key: 'vision', label: '愿景' },
  { key: 'year', label: '年度' },
  { key: 'quarter', label: '季度' },
  { key: 'week', label: '周' },
  { key: 'day', label: '今日' },
];
const LEVEL_INDEX: Record<GoalLevel, number> = { vision: 0, year: 1, quarter: 2, week: 3, day: 4 };
const LEVEL_COLOR: Record<GoalLevel, string> = {
  vision: GOAL_LEVEL_COLORS.vision,
  year: GOAL_LEVEL_COLORS.year,
  quarter: GOAL_LEVEL_COLORS.quarter,
  week: GOAL_LEVEL_COLORS.week,
  day: C.primary,
};
// 金字塔逐级缩进：愿景最宽，逐层收窄
const LEVEL_INDENT: Record<GoalLevel, number> = { vision: 0, year: 16, quarter: 32, week: 48, day: 48 };

export default function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [level, setLevel] = useState<GoalLevel>('vision');
  const [parentId, setParentId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [progress, setProgress] = useState(0);

  const load = useCallback(() => {
    goalRepo.list().then((gs) => setGoals(gs.filter((g) => g.status !== 'archived')));
    taskRepo.list().then(setTasks);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const alignment = tasks.length ? Math.round((tasks.filter((t) => t.goalId).length / tasks.length) * 100) : 0;
  const doneCount = tasks.filter((t) => t.status === 'done').length;

  const openAdd = (lv: GoalLevel, parent: string | null) => {
    setEditing(null); setLevel(lv); setParentId(parent); setTitle(''); setProgress(0); setModal(true);
  };
  const openEdit = (g: Goal) => {
    setEditing(g); setLevel(g.level); setParentId(g.parentId); setTitle(g.title); setProgress(g.progress); setModal(true);
  };

  const save = async () => {
    if (!title.trim()) { Alert.alert('提示', '请输入目标标题'); return; }
    const now = Date.now();
    if (editing) {
      const next = goals.map((g) => (g.id === editing.id ? { ...g, title: title.trim(), progress, status: 'active' as const, updatedAt: now } : g));
      await goalRepo.save(next); setGoals(next);
    } else {
      const goal: Goal = { id: uid(), parentId, level, title: title.trim(), progress, status: 'active', createdAt: now, updatedAt: now };
      const next = [...goals, goal];
      await goalRepo.save(next); setGoals(next);
    }
    setModal(false);
  };

  const archive = async (g: Goal) => {
    Alert.alert('归档目标', `确定归档"${g.title}"？归档后不再参与金字塔展示。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '归档', style: 'destructive',
        onPress: async () => {
          const next = goals.map((x) => (x.id === g.id ? { ...x, status: 'archived' as const } : x));
          await goalRepo.save(next); setGoals(next);
        },
      },
    ]);
  };

  const childrenOf = (id: string) => goals.filter((g) => g.parentId === id);
  const countTasks = (gid: string) => tasks.filter((t) => t.goalId === gid).length;

  return (
    <Screen>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View>
            <Text style={styles.greet}>目标金字塔</Text>
            <Text style={styles.sub}>从愿景，落到今天的一个 5 分钟</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => openAdd('vision', null)}>
            <FontAwesome6 name="plus" size={15} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* 顶部统计：缩小弱化 */}
        <View style={styles.miniRow}>
          <MiniStat value={`${goals.length}`} label="目标" onPress={() => openAdd('vision', null)} />
          <MiniStat value={`${alignment}%`} label="方向对齐" />
          <MiniStat value={`${doneCount}`} label="已完成" />
        </View>

        {goals.length === 0 ? (
          <Empty text="这里还很安静" hint="先写下你的愿景，再逐层落到年度、季度、周、今日" />
        ) : (
          LEVELS.map((lv) => {
            const items = goals.filter((g) => g.level === lv.key);
            if (items.length === 0) return null;
            const color = LEVEL_COLOR[lv.key];
            const indent = LEVEL_INDENT[lv.key];
            return (
              <View key={lv.key} style={{ marginTop: 18, marginLeft: indent }}>
                {/* 层级标签（pill） */}
                <View style={styles.levelHeader}>
                  <View style={{ backgroundColor: hexA(color, 0.12), paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.pill }}>
                    <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{lv.label}</Text>
                  </View>
                  <TouchableOpacity onPress={() => openAdd(lv.key, null)} hitSlop={8}>
                    <FontAwesome6 name="plus" size={14} color={C.placeholder} />
                  </TouchableOpacity>
                </View>
                {items.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    color={color}
                    taskCount={countTasks(g.id)}
                    childCount={childrenOf(g.id).length}
                    canAddChild={LEVEL_INDEX[lv.key] < 4}
                    onOpen={() => openEdit(g)}
                    onAddChild={() => openAdd(LEVELS[LEVEL_INDEX[lv.key] + 1].key, g.id)}
                    onArchive={() => archive(g)}
                  />
                ))}
              </View>
            );
          })
        )}
      </ScrollView>

      <ModalSheet visible={modal} onClose={() => setModal(false)} title={editing ? '编辑目标' : '添加目标'}>
        <Text style={styles.fLabel}>层级</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {LEVELS.map((l) => {
            const active = level === l.key;
            return (
              <TouchableOpacity
                key={l.key}
                onPress={() => setLevel(l.key)}
                style={[styles.levelChip, active && { backgroundColor: LEVEL_COLOR[l.key], borderColor: LEVEL_COLOR[l.key] }]}
              >
                <Text style={{ color: active ? '#fff' : C.muted, fontWeight: '600', fontSize: 13 }}>{l.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.fLabel}>目标标题 <Text style={{ color: C.warn }}>*</Text></Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="写下一个清晰、克制的目标"
          placeholderTextColor={C.placeholder}
          style={styles.input}
          multiline
        />
        <Text style={styles.fLabel}>当前进度：{progress}%</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: C.primary }]} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {[0, 25, 50, 75, 100].map((v) => (
            <TouchableOpacity key={v} onPress={() => setProgress(v)} style={[styles.pctChip, progress === v && { backgroundColor: C.primarySoft }]}>
              <Text style={{ color: progress === v ? C.primary : C.muted, fontWeight: '600' }}>{v}%</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <View style={{ flex: 1 }}><Btn title="取消" variant="ghost" onPress={() => setModal(false)} /></View>
          <View style={{ flex: 1 }}><Btn title="保存" onPress={save} /></View>
        </View>
      </ModalSheet>
    </Screen>
  );
}

function GoalCard({
  goal, color, taskCount, childCount, canAddChild, onOpen, onAddChild, onArchive,
}: {
  goal: Goal; color: string; taskCount: number; childCount: number;
  canAddChild: boolean; onOpen: () => void; onAddChild: () => void; onArchive: () => void;
}) {
  return (
    <Card style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Ring pct={goal.progress} size={46} color={color} />
        <TouchableOpacity style={{ flex: 1 }} onPress={onOpen} activeOpacity={0.7}>
          <Text style={styles.goalTitle} numberOfLines={2}>{goal.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Text style={styles.goalMeta}>关联 {taskCount} 个任务</Text>
            {childCount > 0 ? <Text style={styles.goalMeta}>· {childCount} 个下级</Text> : null}
            {goal.progress >= 100 ? <Tag text="达成" color={C.complete} /> : null}
          </View>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {canAddChild ? (
            <TouchableOpacity onPress={onAddChild} hitSlop={8}>
              <FontAwesome6 name="plus" size={15} color={C.muted} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={onArchive} hitSlop={8}>
            <FontAwesome6 name="box-archive" size={15} color={C.placeholder} />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
}

// 环形进度
function Ring({ pct, size = 46, color }: { pct: number; size?: number; color: string }) {
  const p = Math.min(100, Math.max(0, pct));
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - p / 100);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={hexA(color, 0.16)} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke={color}
          strokeWidth={stroke} fill="none"
          strokeDasharray={`${c} ${c}`} strokeDashoffset={off} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={{ color, fontSize: 11, fontWeight: '600' }}>{p}%</Text>
      </View>
    </View>
  );
}

function MiniStat({ value, label, onPress }: { value: string; label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity disabled={!onPress} onPress={onPress} style={styles.mini}>
      <Text style={styles.miniVal}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  greet: { fontSize: 22, fontWeight: '600', color: C.text },
  sub: { color: C.muted, fontSize: 13, marginTop: 2 },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  miniRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  mini: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  miniVal: { fontSize: 17, fontWeight: '600', color: C.primary },
  miniLabel: { color: C.placeholder, fontSize: 11, marginTop: 2 },
  levelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  goalTitle: { fontSize: 15, fontWeight: '600', color: C.text },
  goalMeta: { color: C.muted, fontSize: 12 },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  fLabel: { fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: '500' },
  levelChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.divider },
  pctChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.divider },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: C.primarySoft, overflow: 'hidden', marginTop: 10, marginBottom: 8 },
  progressFill: { height: 8, borderRadius: 4 },
  input: {
    backgroundColor: C.primarySoft, borderRadius: RADIUS.control, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, color: C.text, minHeight: 70, textAlignVertical: 'top', marginBottom: 16,
  },
});