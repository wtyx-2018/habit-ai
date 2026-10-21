import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card, Btn, Field, Tag, Empty } from '@/components/ui';
import { C, RADIUS } from '@/theme';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { journalRepo, stopRepo, uid } from '@/lib/db';
import type { Journal, StopRule } from '@/lib/models';
import { MOOD_TAGS } from '@/lib/models';
import { todayStr, todayWeekday } from '@/lib/utils';

export default function ReviewScreen() {
  const router = useSafeRouter();
  const today = todayStr();
  const [journal, setJournal] = useState<Journal | null>(null);
  const [stops, setStops] = useState<StopRule[]>([]);
  const [wins, setWins] = useState('');
  const [misses, setMisses] = useState('');
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [moodScore, setMoodScore] = useState(5);
  const [feeling, setFeeling] = useState('');
  const [tomorrow, setTomorrow] = useState('');

  const load = useCallback(async () => {
    const [js, ss] = await Promise.all([journalRepo.list(), stopRepo.list()]);
    const inst = js.find((j) => j.date === today);
    setJournal(inst || null);
    if (inst) {
      setWins(inst.wins); setMisses(inst.misses); setMoodTags(inst.moodTags || []);
      setMoodScore(inst.moodScore); setFeeling(inst.feeling); setTomorrow(inst.tomorrowAction);
    }
    setStops(ss);
  }, [today]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleTag = (t: string) => {
    setMoodTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const save = async () => {
    const inst: Journal = {
      id: journal?.id || uid(), date: today, wins: wins.trim(), misses: misses.trim(),
      moodTags, moodScore, feeling: feeling.trim(), tomorrowAction: tomorrow.trim(),
    };
    const js = await journalRepo.list();
    const next = js.some((j) => j.date === today) ? js.map((j) => (j.date === today ? inst : j)) : [...js, inst];
    await journalRepo.save(next);
    setJournal(inst);
    // 焦虑/迷茫 或低分 → 引导急救
    const anxious = moodTags.includes('焦虑') || moodTags.includes('迷茫') || moodScore <= 4;
    if (anxious) {
      Alert.alert('今晚的你有点累', '要不要先做一个 4 分钟焦虑急救，给情绪按下暂停键？', [
        { text: '稍后' },
        { text: '去急救', onPress: () => router.push('/anxiety', { from: 'review' }) },
      ]);
    } else {
      Alert.alert('已记录', '今天的复盘写完了，稳稳收尾。');
    }
  };

  const activeStops = stops.filter((s) => s.status === 'active');
  // 轮换提醒 1-3 条（按今天的星期几取）
  const remindCount = Math.min(3, activeStops.length);
  const rotation = todayWeekday() % Math.max(1, activeStops.length);
  const reminds: StopRule[] = [];
  for (let i = 0; i < remindCount; i++) {
    reminds.push(activeStops[(rotation + i) % activeStops.length]);
  }

  const anxious = moodTags.includes('焦虑') || moodTags.includes('迷茫') || moodScore <= 4;

  return (
    <Screen>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View>
            <Text style={styles.greet}>每日复盘</Text>
            <Text style={styles.sub}>不追责，只看见，给明天留一个最小行动</Text>
          </View>
          <FontAwesome6 name="book-open" size={24} color={C.primary} />
        </View>

        <Card>
          <Text style={styles.cardTitle}>今天，{today}</Text>
          <Field label="做成了什么" value={wins} onChangeText={setWins} placeholder="哪怕只有一件很小的事，也算" multiline />
          <Field label="没做完/没做的客观原因（不追责）" value={misses} onChangeText={setMisses} placeholder="写客观原因，不写自我攻击" multiline />
          <Text style={styles.fLabel}>现在的感受（可多选）</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {MOOD_TAGS.map((t) => {
              const active = moodTags.includes(t);
              return (
                <TouchableOpacity key={t} onPress={() => toggleTag(t)} style={[styles.tag, active && { backgroundColor: C.info, borderColor: C.info }]}>
                  <Text style={{ color: active ? '#fff' : C.muted, fontWeight: '600', fontSize: 13 }}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.fLabel}>给今天的感受打分：{moodScore} / 10</Text>
          <View style={{ flexDirection: 'row', gap: 5, marginBottom: 14 }}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
              const active = moodScore === n;
              return (
                <TouchableOpacity key={n} onPress={() => setMoodScore(n)} style={[styles.scoreDot, active && { backgroundColor: n <= 4 ? C.warn : C.primary, borderColor: n <= 4 ? C.warn : C.primary }]}>
                  <Text style={{ color: active ? '#fff' : C.muted, fontSize: 12, fontWeight: '600' }}>{n}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Field label="今天的感受（一两句）" value={feeling} onChangeText={setFeeling} placeholder="平静地描述此刻的状态" multiline />
          <Field label="给明天的一个最小行动" value={tomorrow} onChangeText={setTomorrow} placeholder="例如：明早先洗漱，再打开想法清单" multiline />
          <Btn title="保存今日复盘" onPress={save} />
        </Card>

        {anxious ? (
          <TouchableOpacity style={styles.anxietyCta} onPress={() => router.push('/anxiety')} activeOpacity={0.85}>
            <FontAwesome6 name="spa" size={18} color="#fff" />
            <Text style={styles.anxietyCtaText}>检测到你的情绪需要一点照顾 · 开始 4 分钟焦虑急救</Text>
          </TouchableOpacity>
        ) : null}

        {/* 不为清单轮换提醒 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>今晚不为</Text>
          <TouchableOpacity onPress={() => router.push('/stops')}>
            <Text style={{ color: C.muted, fontSize: 12 }}>管理清单 →</Text>
          </TouchableOpacity>
        </View>
        {reminds.length === 0 ? (
          <Empty text="还没有不为清单" hint="在关注清单中管理你的长期原则" />
        ) : (
          reminds.map((s) => (
            <Card key={s.id} style={{ backgroundColor: C.accentSoft, borderColor: hexA(C.accent, 0.3), marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.stopMark}>✕</Text>
                <Text style={styles.stopText}>“{s.text}”</Text>
              </View>
              {s.reason ? <Text style={styles.stopReason}>原因：{s.reason}</Text> : null}
            </Card>
          ))
        )}

        {/* AI 周报入口 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>AI 周报</Text>
        </View>
        <TouchableOpacity style={styles.reportCard} onPress={() => router.push('/weekly-report')} activeOpacity={0.85}>
          <View style={styles.reportIcon}><FontAwesome6 name="chart-line" size={18} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reportTitle}>梳理 · 审计 · 激励</Text>
            <Text style={styles.reportSub}>基于这段时间的记录，看看方向有没有对齐</Text>
          </View>
          <FontAwesome6 name="chevron-right" size={14} color={C.primary} />
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  greet: { fontSize: 22, fontWeight: '800', color: C.text },
  sub: { color: C.muted, fontSize: 13, marginTop: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 14 },
  fLabel: { fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: '500' },
  tag: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.border },
  scoreDot: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  anxietyCta: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16,
    backgroundColor: C.warn, borderRadius: RADIUS.card, padding: 14,
  },
  anxietyCtaText: { color: '#fff', fontWeight: '700', flex: 1, fontSize: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  stopMark: { color: C.warn, fontWeight: '900', fontSize: 16 },
  stopText: { fontSize: 14, fontWeight: '600', color: C.text, flex: 1 },
  stopReason: { color: C.muted, fontSize: 12, marginTop: 6, marginLeft: 26 },
  reportCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.primarySoft, borderRadius: RADIUS.card, padding: 14 },
  reportIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  reportTitle: { color: C.text, fontWeight: '700', fontSize: 15 },
  reportSub: { color: C.muted, fontSize: 12, marginTop: 2 },
});

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}