import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Animated, Easing, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card, Btn } from '@/components/ui';
import { C, RADIUS } from '@/theme';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { anxietyRepo, taskRepo, uid } from '@/lib/db';
import { reframeThoughts } from '@/lib/llm';
import { todayStr } from '@/lib/utils';

const STEPS = ['呼吸', '写下', '重构', '行动'];

export default function AnxietyScreen() {
  const router = useSafeRouter();
  const [step, setStep] = useState(0);
  const [thoughts, setThoughts] = useState('');
  const [before, setBefore] = useState(5);
  const [after, setAfter] = useState(5);
  const [reframe, setReframe] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [chosen, setChosen] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [scale] = useState(() => new Animated.Value(0.7));
  const [phase, setPhase] = useState('吸气');
  const cycleStart = useRef(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.15, duration: 4000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(scale, { toValue: 0.7, duration: 6000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    cycleStart.current = Date.now();
    loop.start();
    const ph = setInterval(() => {
      const t = (Date.now() - cycleStart.current) % 12000;
      setPhase(t < 4000 ? '吸气' : t < 6000 ? '屏住' : '呼气');
    }, 400);
    // 初始加载今日任务作为建议
    taskRepo.list().then((ts) => {
      const today = todayStr();
      const titles = ts.filter((t) => t.scheduledDate === today && t.status !== 'done' && !t.parentId).map((t) => t.title).slice(0, 3);
      setSuggestions([...titles, '给绿植浇个水', '把明天一件小事写进清单', '起来踱步 3 分钟']);
    });
    return () => { loop.stop(); clearInterval(ph); };
  }, []);

  const runReframe = async () => {
    if (!thoughts.trim()) { Alert.alert('提示', '先写下此刻脑子里的想法'); return; }
    setLoading(true);
    const res = await reframeThoughts(thoughts.trim(), before);
    setReframe(res.reframe);
    setQuestions(res.questions || []);
    setLoading(false);
    setStep(2);
  };

  const save = async () => {
    const record = {
      id: uid(), date: todayStr(), time: Date.now(),
      beforeScore: before, thoughts: thoughts.trim(), reframing: reframe, afterScore: after,
      chosenAction: chosen.trim(),
    };
    const list = await anxietyRepo.list();
    await anxietyRepo.save([record, ...list]);
    Alert.alert('记下了', `焦虑 ${before} → ${after}。你已经比刚才更清楚自己了。`, [
      { text: '回今天', onPress: () => router.back() },
    ]);
  };

  return (
    <Screen>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <FontAwesome6 name="chevron-left" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={styles.steps}>
          {STEPS.map((s, i) => (
            <View key={s} style={styles.stepWrap}>
              <View style={[styles.stepDot, i <= step && { backgroundColor: C.primary }]}>
                {i < step ? <FontAwesome6 name="check" size={11} color="#fff" /> : <Text style={[styles.stepNum, i <= step && { color: '#fff' }]}>{i + 1}</Text>}
              </View>
              <Text style={[styles.stepLabel, i <= step && { color: C.primary }, i > step && { color: C.muted }]}>{s}</Text>
            </View>
          ))}
        </View>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.notice}>自助工具 · 非医疗 · 若严重或持续请及时寻求专业帮助</Text>

        {step === 0 ? (
          <Card style={{ alignItems: 'center', padding: 28 }}>
            <Text style={styles.phTitle}>{phase}</Text>
            <Animated.View style={[styles.breath, { transform: [{ scale }] }]}>
              <View style={styles.breathInner}>
                <Text style={styles.breathText}>跟着圆呼吸</Text>
              </View>
            </Animated.View>
            <Text style={styles.phHint}>吸气 4 秒 · 屏住 2 秒 · 呼气 6 秒，连续 3-4 轮</Text>
            <Btn title="我感觉平静了一些，继续" onPress={() => setStep(1)} style={{ alignSelf: 'stretch', marginTop: 8 }} />
          </Card>
        ) : null}

        {step === 1 ? (
          <Card>
            <Text style={styles.phTitle}>把想法放下来</Text>
            <Text style={styles.phHint}>不用组织语言，把脑子里转个不停的事原样写下来。</Text>
            <TextInput
              value={thoughts}
              onChangeText={setThoughts}
              placeholder="此刻让我停不下来的想法是…"
              placeholderTextColor={C.muted}
              style={styles.textarea}
              multiline
            />
            <Text style={styles.fLabel}>现在的焦虑程度：{before} / 10</Text>
            <RowDots value={before} onChange={setBefore} />
            <Btn title="交给 AI 追问重构" variant="accent" onPress={runReframe} loading={loading} />
            {loading ? <Text style={styles.loadingHint}>正在用温和的提问帮你松一松…</Text> : null}
          </Card>
        ) : null}

        {step === 2 ? (
          <Card>
            <Text style={styles.phTitle}>换个角度看</Text>
            {questions.length > 0 ? (
              <View style={{ marginBottom: 12 }}>
                {questions.map((q, i) => (
                  <Text key={i} style={styles.question}>· {q}</Text>
                ))}
              </View>
            ) : null}
            <View style={styles.reframeBox}>
              <Text style={styles.reframeText}>{reframe}</Text>
            </View>
            <Btn title="好像没那么紧了，再评一次" onPress={() => setStep(3)} style={{ marginTop: 8 }} />
          </Card>
        ) : null}

        {step === 3 ? (
          <Card>
            <Text style={styles.phTitle}>再感受一次</Text>
            <View style={styles.compareRow}>
              <View style={styles.compareCell}>
                <Text style={styles.compareLabel}>急救前</Text>
                <Text style={[styles.compareVal, { color: C.warn }]}>{before}</Text>
              </View>
              <FontAwesome6 name="arrow-right" size={18} color={C.muted} />
              <View style={styles.compareCell}>
                <Text style={styles.compareLabel}>现在</Text>
                <Text style={[styles.compareVal, { color: C.complete }]}>{after}</Text>
              </View>
            </View>
            <Text style={styles.fLabel}>现在的焦虑程度：{after} / 10</Text>
            <RowDots value={after} onChange={setAfter} />
            <Text style={styles.fLabel}>挑一个 5 分钟最小行动（可选）</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {suggestions.map((s, i) => (
                <TouchableOpacity key={i} onPress={() => setChosen(s)} style={[styles.sug, chosen === s && { backgroundColor: C.primarySoft, borderColor: C.primary }]}>
                  <Text style={{ color: chosen === s ? C.primary : C.muted, fontSize: 13, fontWeight: '600' }}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Btn title="保存这次急救" onPress={save} />
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function RowDots({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 5, marginBottom: 16 }}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const active = value === n;
        return (
          <TouchableOpacity key={n} onPress={() => onChange(n)} style={[styles.dot, active && { backgroundColor: n > 5 ? C.primary : C.warn, borderColor: n > 5 ? C.primary : C.warn }]}>
            <Text style={{ color: active ? '#fff' : C.muted, fontSize: 11, fontWeight: '600' }}>{n}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14 },
  steps: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepWrap: { alignItems: 'center', gap: 4 },
  stepDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center' },
  stepNum: { color: C.muted, fontSize: 12, fontWeight: '700' },
  stepLabel: { fontSize: 11 },
  notice: { textAlign: 'center', color: C.warn, fontSize: 11, marginBottom: 16 },
  phTitle: { fontSize: 20, fontWeight: '800', color: C.text, textAlign: 'center', marginBottom: 10 },
  phHint: { color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 20, marginVertical: 10 },
  breath: { width: 180, height: 180, borderRadius: 90, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center', marginVertical: 24 },
  breathInner: { width: 120, height: 120, borderRadius: 60, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  breathText: { color: '#fff', fontWeight: '700' },
  textarea: {
    backgroundColor: C.primarySoft, borderRadius: RADIUS.control, padding: 14,
    fontSize: 15, color: C.text, minHeight: 110, textAlignVertical: 'top', marginBottom: 14,
  },
  fLabel: { fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: '500' },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  question: { fontSize: 14, color: C.info, lineHeight: 22, marginBottom: 6 },
  reframeBox: { backgroundColor: C.accentSoft, borderRadius: RADIUS.card, padding: 16, marginBottom: 8 },
  reframeText: { color: C.text, fontSize: 15, lineHeight: 23 },
  loadingHint: { color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 10 },
  compareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 16 },
  compareCell: { alignItems: 'center' },
  compareLabel: { color: C.muted, fontSize: 12 },
  compareVal: { fontSize: 36, fontWeight: '900', marginTop: 2 },
  sug: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.border },
});