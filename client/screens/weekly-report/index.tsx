import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card, Btn, Tag, Empty } from '@/components/ui';
import { C, RADIUS, DOMAIN_LABELS } from '@/theme';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { goalRepo, taskRepo, habitRepo, journalRepo, anxietyRepo, txRepo, stopRepo, uid } from '@/lib/db';
import { weeklyReport, hasAiConfigured } from '@/lib/llm';
import { todayStr, fmtDate } from '@/lib/utils';

export default function WeeklyReportScreen() {
  const router = useSafeRouter();
  const [summary, setSummary] = useState('');
  const [audit, setAudit] = useState('');
  const [motivate, setMotivate] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasAi, setHasAi] = useState(false);
  const [suggestions, setSuggestions] = useState<{ id: string; text: string }[]>([
    { id: 's1', text: '把精力最旺的一小时留给深度目标' },
    { id: 's2', text: '每晚为第二天留一个 5 分钟最小行动' },
  ]);

  const run = useCallback(async () => {
    setLoading(true);
    const ctx = await buildContext();
    const res = await weeklyReport(ctx);
    setSummary(res.summary); setAudit(res.audit); setMotivate(res.motivate);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => {
    hasAiConfigured().then(setHasAi);
    run();
  }, [run]));

  const addTask = async (text: string) => {
    const tasks = await taskRepo.list();
    const today = todayStr();
    const rec = {
      id: uid(), title: text, domain: 'other' as const, goalId: null, estMinutes: 10,
      type: 'light' as const, status: 'todo' as const, parentId: null,
      scheduledDate: today, scheduledSlot: null,
      // eslint-disable-next-line react-hooks/purity
      createdAt: Date.now(),
    };
    await taskRepo.save([...tasks, rec]);
    Alert.alert('已加入今日任务', text, [{ text: '回到今天', onPress: () => router.replace('/') }]);
  };

  const addStop = async (text: string) => {
    const stops = await stopRepo.list();
    const now = Date.now();
    const rec = {
      id: uid(), text, reason: '来自 AI 周报的梳理建议', category: '精力',
      version: 1, status: 'active' as const, createdAt: now, updatedAt: now, history: [],
    };
    await stopRepo.save([...stops, rec]);
    Alert.alert('已加入不为清单', text);
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestions.find((x) => x.text === text)?.id));
  };

  return (
    <Screen>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <FontAwesome6 name="chevron-left" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI 周报</Text>
        <TouchableOpacity onPress={run} hitSlop={10} disabled={loading}>
          <FontAwesome6 name="rotate" size={18} color={C.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {!hasAi ? (
          <Card style={{ backgroundColor: C.accentSoft, borderColor: hexA(C.accent, 0.3), marginBottom: 16 }}>
            <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }}>当前使用本地模板周报</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>在「我的 → LLM」配置 OpenAI 兼容接口后，可获得更有针对性的梳理与持续追问。</Text>
          </Card>
        ) : null}

        {loading ? (
          <Empty text="正在梳理这段时间的记录…" hint="稍等片刻" />
        ) : (
          <>
            <Section icon="magnifying-glass-chart" label="梳理" color={C.primary} content={summary} />
            {audit ? <Section icon="shield-exclamation" label="审计" color={C.warn} content={audit} /> : null}
            {motivate ? <Section icon="fire" label="激励" color={C.accent} content={motivate} /> : null}

            <Text style={styles.sectionTitle}>建议项 · 一键加入</Text>
            {suggestions.map((s) => (
              <Card key={s.id} style={{ marginBottom: 10 }}>
                <View style={styles.sugRow}>
                  <Text style={{ flex: 1, color: C.text, fontSize: 14, lineHeight: 21 }}>{s.text}</Text>
                </View>
                <View style={styles.sugActions}>
                  <TouchableOpacity onPress={() => addTask(s.text)} style={styles.sugBtn}><Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>加入今日任务</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => addStop(s.text)} style={[styles.sugBtn, { backgroundColor: C.accent }]}><Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>加入不为清单</Text></TouchableOpacity>
                </View>
              </Card>
            ))}

            <Card style={{ marginTop: 4 }}>
              <Text style={styles.auditNote}>
                周报基于你的真实记录生成，AI 的「审计」带着善意，是为了帮你把精力放回长期方向，而不是评判你。所有数据仅保存在本机。
              </Text>
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Section({ icon, label, content, color }: { icon: string; label: string; content: string; color: string }) {
  return (
    <Card style={{ marginBottom: 12 }}>
      <View style={styles.sectionHeadRow}>
        <View style={[styles.sectionIcon, { backgroundColor: hexA(color, 0.14) }]}>
          <FontAwesome6 name={icon as any} size={15} color={color} />
        </View>
        <Text style={[styles.sectionLabel, { color }]}>{label}</Text>
      </View>
      <Text style={styles.sectionContent}>{content}</Text>
    </Card>
  );
}

async function buildContext(): Promise<string> {
  const [goals, tasks, habits, journals, anxieties, txs] = await Promise.all([
    goalRepo.list(), taskRepo.list(), habitRepo.list(), journalRepo.list(), anxietyRepo.list(), txRepo.list(),
  ]);
  const L: string[] = [];
  L.push(`目标数：${goals.filter(g => g.status === 'active').length}，其中已完成（progress≥100）${goals.filter(g => g.progress >= 100).length} 个。`);
  const done = tasks.filter(t => t.status === 'done');
  L.push(`已完成任务总 ${done.length} 个；领域分布：`);
  const dom: Record<string, number> = {};
  for (const t of done) dom[DOMAIN_LABELS[t.domain]] = (dom[DOMAIN_LABELS[t.domain]] || 0) + 1;
  for (const [k, v] of Object.entries(dom)) L.push(`- ${k}: ${v}`);
  const activeHabits = habits.filter(h => h.active);
  if (activeHabits.length) L.push(`维持中的习惯（连续天数）：${activeHabits.map(h => `${h.name}(${h.streak}天)`).join('、')}`);
  const recentJ = [...journals].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  if (recentJ.length) {
    L.push(`最近复盘情绪均值：${(recentJ.reduce((a, j) => a + j.moodScore, 0) / recentJ.length).toFixed(1)}/10；情绪标签：${recentJ.flatMap(j => j.moodTags).join('、')}`);
  }
  if (anxieties.length) L.push(`焦虑急救 ${anxieties.length} 次，平均下降 ${(anxieties.reduce((a, x) => a + (x.beforeScore - x.afterScore), 0) / anxieties.length).toFixed(1)} 分。`);
  const exp = txs.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  const inc = txs.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  L.push(`累计收入 ${inc.toFixed(0)}、支出 ${exp.toFixed(0)}、结余 ${(inc - exp).toFixed(0)}。`);
  L.push(`最近记录起始：${journals.length ? journals[journals.length - 1].date : fmtDate(new Date())}。`);
  return L.join('\n');
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginTop: 8, marginBottom: 10 },
  sectionHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 15, fontWeight: '800' },
  sectionContent: { color: C.text, fontSize: 14, lineHeight: 23 },
  sugRow: { flexDirection: 'row', alignItems: 'center' },
  sugActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  sugBtn: { flex: 1, backgroundColor: C.primary, borderRadius: RADIUS.control, paddingVertical: 10, alignItems: 'center' },
  auditNote: { color: C.muted, fontSize: 12, lineHeight: 18 },
});

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}