import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card, Btn, ModalSheet, Tag, Empty } from '@/components/ui';
import { C, RADIUS } from '@/theme';
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
  vision: C.primary, year: C.info, quarter: C.complete, week: C.accent, day: C.warn,
};

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

  const openAdd = (lv: GoalLevel, parent: string | null) => {
    setEditing(null);
    setLevel(lv);
    setParentId(parent);
    setTitle('');
    setProgress(0);
    setModal(true);
  };

  const openEdit = (g: Goal) => {
    setEditing(g);
    setLevel(g.level);
    setParentId(g.parentId);
    setTitle(g.title);
    setProgress(g.progress);
    setModal(true);
  };

  const save = async () => {
    if (!title.trim()) { Alert.alert('提示', '请输入目标标题'); return; }
    const now = Date.now();
    if (editing) {
      const next = goals.map((g) => (g.id === editing.id ? { ...g, title: title.trim(), progress, status: 'active' as const, updatedAt: now } : g));
      await goalRepo.save(next);
      setGoals(next);
    } else {
      const goal: Goal = {
        id: uid(), parentId, level, title: title.trim(), progress, status: 'active', createdAt: now, updatedAt: now,
      };
      const next = [...goals, goal];
      await goalRepo.save(next);
      setGoals(next);
    }
    setModal(false);
  };

  const archive = async (g: Goal) => {
    Alert.alert('归档目标', `确定归档"${g.title}"？归档后不再参与金字塔展示。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '归档',
        style: 'destructive',
        onPress: async () => {
          const next = goals.map((x) => (x.id === g.id ? { ...x, status: 'archived' as const } : x));
          await goalRepo.save(next);
          setGoals(next);
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
            <Text style={styles.sub}>从愿景落到今天的 5 分钟</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => openAdd('vision', null)}>
            <FontAwesome6 name="plus" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <Card style={styles.mini}>
            <Text style={styles.miniVal}>{goals.length}</Text>
            <Text style={styles.miniLabel}>目标</Text>
          </Card>
          <Card style={styles.mini}>
            <Text style={[styles.miniVal, { color: C.accent }]}>{alignment}%</Text>
            <Text style={styles.miniLabel}>方向对齐</Text>
          </Card>
          <Card style={styles.mini}>
            <Text style={[styles.miniVal, { color: C.complete }]}>{tasks.filter((t) => t.status === 'done').length}</Text>
            <Text style={styles.miniLabel}>已完成</Text>
          </Card>
        </View>

        {goals.length === 0 ? (
          <Empty text="还没有目标" hint="点右上角 ＋，先写下你的愿景，再逐层落到年度、季度、周、今日" />
        ) : (
          LEVELS.map((lv) => {
            const items = goals.filter((g) => g.level === lv.key);
            if (items.length === 0) return null;
            const color = LEVEL_COLOR[lv.key];
            return (
              <View key={lv.key} style={{ marginTop: 16 }}>
                <View style={styles.levelHeader}>
                  <Text style={[styles.levelLabel, { color }]}>{lv.label}</Text>
                  <TouchableOpacity onPress={() => openAdd(lv.key, null)} hitSlop={8}>
                    <FontAwesome6 name="circle-plus" size={18} color={C.muted} />
                  </TouchableOpacity>
                </View>
                {items.map((g) => (
                  <Card key={g.id} style={{ marginBottom: 10 }}>
                    <TouchableOpacity onPress={() => openEdit(g)} activeOpacity={0.7}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.goalTitle} numberOfLines={2}>{g.title}</Text>
                        {g.progress >= 100 ? <Tag text="达成" color={C.complete} /> : null}
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, g.progress))}%`, backgroundColor: color }]} />
                      </View>
                      <View style={styles.rowBetween}>
                        <Text style={styles.progressText}>{g.progress}% · 关联 {countTasks(g.id)} 个任务</Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          {LEVEL_INDEX[lv.key] < 4 ? (
                            <TouchableOpacity onPress={() => openAdd(LEVELS[LEVEL_INDEX[lv.key] + 1].key, g.id)} hitSlop={8}>
                              <Text style={{ color: C.primary, fontSize: 12, fontWeight: '600' }}>＋下级</Text>
                            </TouchableOpacity>
                          ) : null}
                          {childrenOf(g.id).length > 0 ? (
                            <Text style={{ color: C.muted, fontSize: 12 }}>{childrenOf(g.id).length} 个下级</Text>
                          ) : null}
                          <TouchableOpacity onPress={() => archive(g)} hitSlop={8}>
                            <Text style={{ color: C.warn, fontSize: 12 }}>归档</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </Card>
                ))}
                {childrenHint(items, goals)}
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
          placeholderTextColor={C.muted}
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

function childrenHint(items: Goal[], all: Goal[]): React.ReactNode {
  // 展示每个目标下的下级目标标题，帮助建立垂直联系
  return (
    <View>
      {items.map((g) => {
        const kids = all.filter((x) => x.parentId === g.id);
        if (!kids.length) return null;
        return (
          <View key={g.id} style={{ marginLeft: 18, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: C.border, marginBottom: 6 }}>
            {kids.map((k) => <Text key={k.id} style={{ color: C.muted, fontSize: 12, paddingVertical: 2 }}>· {k.title}</Text>)}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  greet: { fontSize: 22, fontWeight: '800', color: C.text },
  sub: { color: C.muted, fontSize: 13, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  mini: { flex: 1, alignItems: 'center', padding: 14 },
  miniVal: { fontSize: 20, fontWeight: '800', color: C.primary },
  miniLabel: { color: C.muted, fontSize: 12, marginTop: 2 },
  levelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  levelLabel: { fontSize: 14, fontWeight: '800' },
  goalTitle: { fontSize: 15, fontWeight: '600', color: C.text, flex: 1, marginRight: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: C.primarySoft, overflow: 'hidden', marginTop: 10, marginBottom: 8 },
  progressFill: { height: 8, borderRadius: 4 },
  progressText: { color: C.muted, fontSize: 12 },
  fLabel: { fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: '500' },
  levelChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.border },
  pctChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.border },
  input: {
    backgroundColor: C.primarySoft, borderRadius: RADIUS.control, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, color: C.text, minHeight: 70, textAlignVertical: 'top', marginBottom: 16,
  },
});