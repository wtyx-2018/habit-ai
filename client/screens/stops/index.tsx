import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card, Btn, Field, ModalSheet, Tag, Segmented, Empty } from '@/components/ui';
import { C, RADIUS } from '@/theme';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { stopRepo, uid } from '@/lib/db';
import type { StopRule } from '@/lib/models';

const CATS = ['时间', '精力', '消费', '情绪', '人际', '其他'];
const CAT_COLOR: Record<string, string> = { 时间: C.info, 精力: C.accent, 消费: C.warn, 情绪: C.complete, 人际: C.primary, 其他: C.muted };

export default function StopsScreen() {
  const router = useSafeRouter();
  const [rules, setRules] = useState<StopRule[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<StopRule | null>(null);
  const [text, setText] = useState('');
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('时间');

  const load = useCallback(() => { stopRepo.list().then(setRules); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAdd = () => { setEditing(null); setText(''); setReason(''); setCategory('时间'); setModal(true); };
  const openEdit = (r: StopRule) => { setEditing(r); setText(r.text); setReason(r.reason); setCategory(r.category); setModal(true); };

  const save = async () => {
    if (!text.trim()) { Alert.alert('提示', '请写下这条"不为"原则'); return; }
    if (editing) {
      // 修订：版本 +1，保留历史
      const history = editing.history || [];
      history.push({ text: editing.text, reason: editing.reason, updatedAt: editing.updatedAt });
      const next = rules.map((r) => (r.id === editing.id
        ? { ...r, text: text.trim(), reason: reason.trim(), category, status: 'active' as const, version: r.version + 1, history, updatedAt: Date.now() }
        : r));
      await stopRepo.save(next); setRules(next);
    } else {
      const item: StopRule = {
        id: uid(), text: text.trim(), reason: reason.trim(), category,
        version: 1, status: 'active', createdAt: Date.now(), updatedAt: Date.now(), history: [],
      };
      const next = [...rules, item];
      await stopRepo.save(next); setRules(next);
    }
    setModal(false);
  };

  const archive = async (r: StopRule) => {
    Alert.alert('归档', `归档后不再出现在每日提醒里（不物理删除，可在归档中找回）。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '归档', style: 'destructive', onPress: async () => {
          const next = rules.map((x) => (x.id === r.id ? { ...x, status: 'archived' as const } : x));
          await stopRepo.save(next); setRules(next);
        },
      },
    ]);
  };

  const restore = async (r: StopRule) => {
    const next = rules.map((x) => (x.id === r.id ? { ...x, status: 'active' as const } : x));
    await stopRepo.save(next); setRules(next);
  };

  const shown = rules.filter((r) => (showArchived ? r.status === 'archived' : r.status === 'active'));

  return (
    <Screen>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <FontAwesome6 name="chevron-left" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>不为清单</Text>
        <TouchableOpacity onPress={openAdd} hitSlop={10}>
          <FontAwesome6 name="plus" size={20} color={C.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Card style={styles.intro}>
          <Text style={styles.introTitle}>做减法，比做加法更难，也更省力</Text>
          <Text style={styles.introSub}>写下长期原则（什么你不再做），每天在复盘时轮换提醒 1-3 条。只修订、可归档，绝不物理删除。</Text>
        </Card>

        <Segmented
          options={[{ label: `进行中 · ${rules.filter(r => r.status === 'active').length}`, value: 'active' }, { label: `已归档 · ${rules.filter(r => r.status === 'archived').length}`, value: 'archived' }]}
          value={showArchived ? 'archived' : 'active'}
          onChange={(v) => setShowArchived(v === 'archived')}
          color={C.accent}
        />
        <View style={{ height: 14 }} />

        {shown.length === 0 ? (
          <Empty text={showArchived ? '暂无已归档' : '还没有不为原则'} hint="先写一条最消耗你的事" />
        ) : (
          shown.map((r) => (
            <Card key={r.id} style={{ marginBottom: 12, backgroundColor: C.accentSoft, borderColor: hexA(C.accent, 0.25) }}>
              <View style={styles.rowBetween}>
                <Tag text={r.category} color={CAT_COLOR[r.category] || C.muted} />
                <Text style={{ color: C.muted, fontSize: 11 }}>v{r.version} · {r.status === 'archived' ? '已归档' : '进行中'}</Text>
              </View>
              <Text style={styles.ruleText}>“{r.text}”</Text>
              {r.reason ? <Text style={styles.ruleReason}>为什么：{r.reason}</Text> : null}
              <View style={styles.ruleActions}>
                {showArchived ? (
                  <TouchableOpacity onPress={() => restore(r)}><Text style={{ color: C.primary, fontWeight: '600', fontSize: 13 }}>恢复</Text></TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity onPress={() => openEdit(r)}><Text style={{ color: C.primary, fontWeight: '600', fontSize: 13 }}>修订</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => archive(r)}><Text style={{ color: C.warn, fontWeight: '600', fontSize: 13 }}>归档</Text></TouchableOpacity>
                  </>
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <ModalSheet visible={modal} onClose={() => setModal(false)} title={editing ? `修订原则（v${editing.version} → v${editing.version + 1}）` : '新增一条不为原则'}>
        <Field label="原则（我不再做…）" value={text} onChangeText={setText} placeholder="例如：不再在刷手机上度过整个晚上" required multiline />
        <Field label="为什么" value={reason} onChangeText={setReason} placeholder="当初为什么定下这条（提醒自己）" multiline />
        <Text style={styles.fLabel}>分类</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
          {CATS.map((c) => {
            const active = category === c;
            const color = CAT_COLOR[c] || C.muted;
            return (
              <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}>
                <Text style={{ color: active ? '#fff' : color, fontWeight: '600', fontSize: 13 }}>{c}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <View style={{ flex: 1 }}><Btn title="取消" variant="ghost" onPress={() => setModal(false)} /></View>
          <View style={{ flex: 1 }}><Btn title={editing ? '保存修订' : '记下来'} onPress={save} /></View>
        </View>
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  intro: { backgroundColor: C.primarySoft, borderColor: C.primarySoft, marginBottom: 16 },
  introTitle: { fontSize: 15, fontWeight: '700', color: C.primary },
  introSub: { color: C.muted, fontSize: 13, lineHeight: 20, marginTop: 6 },
  fLabel: { fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: '500' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.border },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ruleText: { fontSize: 16, fontWeight: '700', color: C.text, marginTop: 12, lineHeight: 23 },
  ruleReason: { color: C.muted, fontSize: 13, marginTop: 8, lineHeight: 19 },
  ruleActions: { flexDirection: 'row', gap: 18, marginTop: 14, borderTopWidth: 1, borderTopColor: hexA('#20261F', 0.06), paddingTop: 12 },
});

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}