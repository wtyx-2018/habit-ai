import React, { useCallback, useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card, Btn, Field, Tag, Segmented } from '@/components/ui';
import { C, RADIUS, DOMAIN_COLORS, DOMAIN_LABELS, DOMAIN_KEYS, type Domain } from '@/theme';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { taskRepo, goalRepo, slotRepo, uid } from '@/lib/db';
import type { Goal, Task, TaskType } from '@/lib/models';
import { breakDownTask, type SubtaskPlan, hasAiConfigured } from '@/lib/llm';
import { dispatchToSlots, todayStr } from '@/lib/utils';

export default function TaskCreateScreen() {
  const router = useSafeRouter();
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState<Domain>('other');
  const [goalId, setGoalId] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [breakdown, setBreakdown] = useState<SubtaskPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasAi, setHasAi] = useState(false);

  useFocusEffect(useCallback(() => {
    goalRepo.list().then((gs) =>
      setGoals(gs.filter((g) => g.status === 'active' && g.level !== 'day')),
    );
    hasAiConfigured().then(setHasAi);
  }, []));

  const runBreakdown = async () => {
    if (!title.trim()) { Alert.alert('提示', '先输入一句话任务'); return; }
    setLoading(true);
    const plan = await breakDownTask(title.trim(), domain);
    setBreakdown(plan.length ? plan : [{ title: title.trim(), minutes: 15, type: 'deep' }]);
    setLoading(false);
  };

  const updateStep = (i: number, patch: Partial<SubtaskPlan>) => {
    setBreakdown((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const save = async () => {
    if (!title.trim()) { Alert.alert('提示', '请输入任务内容'); return; }
    const slots = await slotRepo.list();
    const today = todayStr();
    const plans = breakdown.length ? breakdown : [{ title: title.trim(), minutes: 15, type: 'deep' as TaskType }];

    const parentId = uid();
    const parent: Task = {
      id: parentId, title: title.trim(), domain,
      goalId, estMinutes: plans.reduce((a, b) => a + b.minutes, 0),
      type: 'deep', status: 'todo', parentId: null,
      scheduledDate: today, scheduledSlot: null, createdAt: Date.now(),
    };
    const children: Task[] = plans.map((p) => {
      const tmp: Task = {
        id: uid(), title: p.title, domain, goalId,
        estMinutes: p.minutes, type: p.type, status: 'todo', parentId,
        scheduledDate: today, scheduledSlot: null, createdAt: Date.now(),
      };
      tmp.scheduledSlot = dispatchToSlots(tmp, slots)?.id || null;
      return tmp;
    });
    const existing = await taskRepo.list();
    await taskRepo.save([...existing, parent, ...children]);
    Alert.alert('已安排', `已为你拆出 ${children.length} 个 5–30 分钟步骤并排入今晚的时段`, [
      { text: '好的', onPress: () => router.back() },
    ]);
  };

  return (
    <Screen>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
            <FontAwesome6 name="chevron-left" size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>把大目标拆成小动作</Text>
          <View style={{ width: 20 }} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.lead}>
            别想太多，先写下一句让你焦虑或一直拖着的事。慢一点，也往前一点。
          </Text>

          <Card>
            <Field
              label="一句话任务"
              value={title}
              onChangeText={(t) => { setTitle(t); if (!breakdown.length) { /* keep manual */ } }}
              placeholder="例如：把下周 presentation 的提纲列出来"
              required
              multiline
            />
            <Text style={styles.fieldLabel}>领域</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {DOMAIN_KEYS.map((k) => {
                const active = domain === k;
                const color = DOMAIN_COLORS[k];
                return (
                  <TouchableOpacity
                    key={k}
                    onPress={() => setDomain(k)}
                    style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
                  >
                    <View style={[styles.chipDot, { backgroundColor: active ? '#fff' : color }]} />
                    <Text style={{ color: active ? '#fff' : color, fontWeight: '600', fontSize: 13 }}>{DOMAIN_LABELS[k]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>关联目标（可选）</Text>
            <View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setGoalId(null)}
                    style={[styles.chip, goalId === null && { backgroundColor: C.primarySoft, borderColor: C.primary }]}
                  >
                    <Text style={{ color: goalId === null ? C.primary : C.muted, fontWeight: '600', fontSize: 13 }}>暂不关联</Text>
                  </TouchableOpacity>
                {goals.map((g) => {
                  const active = goalId === g.id;
                  return (
                    <TouchableOpacity key={g.id} onPress={() => setGoalId(g.id)} style={[styles.chip, active && { backgroundColor: C.primarySoft, borderColor: C.primary }]}>
                      <Text style={{ color: active ? C.primary : C.muted, fontWeight: '600', fontSize: 13 }}>{g.title}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            </View>

            <Btn
              title={hasAi ? 'AI 拆解成步骤（✦ 联网可用）' : 'AI 拆解成步骤'}
              variant="accent"
              onPress={runBreakdown}
              loading={loading}
            />
            {!hasAi ? (
              <Text style={styles.hint}>未配置 LLM 时使用本地模板化拆解（在「我的 → LLM」可配置 OpenAI 兼容接口）</Text>
            ) : null}
          </Card>

          {breakdown.length > 0 ? (
            <Card style={{ marginTop: 16 }}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>拆解结果（可编辑）</Text>
                <TouchableOpacity onPress={runBreakdown} disabled={loading}>
                  <Text style={{ color: C.accent, fontWeight: '600', fontSize: 13 }}>重新拆解</Text>
                </TouchableOpacity>
              </View>
              {breakdown.map((s, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepIndex}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{i + 1}</Text></View>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      value={s.title}
                      onChangeText={(t) => updateStep(i, { title: t })}
                      style={styles.stepTitle}
                      multiline
                    />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <TextInput
                        value={String(s.minutes)}
                        onChangeText={(t) => updateStep(i, { minutes: Math.max(5, Math.min(30, Number(t) || 15)) })}
                        style={[styles.stepMinutes, { minWidth: 52 }]}
                        keyboardType="numeric"
                      />
                      <Text style={{ color: C.muted, fontSize: 12 }}>分钟</Text>
                      <Segmented
                        options={[{ label: '轻量', value: 'light' }, { label: '深度', value: 'deep' }]}
                        value={s.type}
                        onChange={(v) => updateStep(i, { type: v })}
                        color={C.info}
                      />
                      <TouchableOpacity onPress={() => setBreakdown((prev) => prev.filter((_, idx) => idx !== i))} hitSlop={8}>
                        <FontAwesome6 name="trash" size={14} color={C.warn} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
              <TouchableOpacity
                onPress={() => setBreakdown((prev) => [...prev, { title: '', minutes: 10, type: 'light' }])}
                style={styles.addStep}
              >
                <Text style={{ color: C.primary, fontWeight: '600' }}>＋ 添加一个步骤</Text>
              </TouchableOpacity>
            </Card>
          ) : null}

          <View style={{ marginTop: 20 }}>
            <Btn title="保存并排入今晚" onPress={save} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  lead: { color: C.muted, fontSize: 14, lineHeight: 21, marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: '500' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.pill,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surface,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  hint: { color: C.muted, fontSize: 11, marginTop: 8, lineHeight: 16 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  stepRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  stepIndex: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  stepTitle: { fontSize: 15, color: C.text, fontWeight: '600' },
  stepMinutes: {
    backgroundColor: C.primarySoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    fontSize: 13, color: C.text, textAlign: 'center',
  },
  addStep: { alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border, marginTop: 4 },
});