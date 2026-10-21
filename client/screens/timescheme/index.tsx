import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, TextInput, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card, Btn, ModalSheet, Segmented, Tag, Empty } from '@/components/ui';
import { C, RADIUS } from '@/theme';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { slotRepo, uid } from '@/lib/db';
import type { TimeSlot, SlotKind } from '@/lib/models';
import { weekdayCN, parseTimeHHMM, slotsForToday } from '@/lib/utils';
import { rescheduleAll } from '@/lib/notify';

const WD = ['日', '一', '二', '三', '四', '五', '六'];
const KIND_COLOR: Record<SlotKind, string> = { light: C.complete, deep: C.info, review: C.accent };

export default function TimeschemeScreen() {
  const router = useSafeRouter();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<TimeSlot | null>(null);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [start, setStart] = useState('19:00');
  const [end, setEnd] = useState('20:30');
  const [kind, setKind] = useState<SlotKind>('light');
  const [enabled, setEnabled] = useState(true);

  const load = useCallback(async () => {
    const s = await slotRepo.list();
    if (s.length === 0) await slotRepo.save(slots);
    setSlots(s);
  }, [slots]);
  useFocusEffect(useCallback(() => {
    slotRepo.list().then(setSlots);
  }, []));

  const openAdd = () => {
    setEditing(null); setWeekdays([1, 2, 3, 4, 5]); setStart('19:00'); setEnd('20:30'); setKind('light'); setEnabled(true); setModal(true);
  };
  const openEdit = (s: TimeSlot) => {
    setEditing(s); setWeekdays([...s.weekdays]); setStart(s.start); setEnd(s.end); setKind(s.kind); setEnabled(s.enabled); setModal(true);
  };

  const toggleEnabled = async (s: TimeSlot) => {
    const next = slots.map((x) => (x.id === s.id ? { ...x, enabled: !x.enabled } : x));
    setSlots(next); await slotRepo.save(next); rescheduleAll(next);
  };

  const save = async () => {
    if (parseTimeHHMM(end) - parseTimeHHMM(start) <= 0) { Alert.alert('提示', '结束时间需晚于开始时间'); return; }
    if (weekdays.length === 0) { Alert.alert('提示', '至少选择一个星期几'); return; }
    if (editing) {
      const next = slots.map((x) => (x.id === editing.id ? { ...x, weekdays, start, end, kind, enabled } : x));
      setSlots(next); await slotRepo.save(next); rescheduleAll(next);
    } else {
      const item: TimeSlot = { id: uid(), weekdays, start, end, kind, enabled };
      const next = [...slots, item];
      setSlots(next); await slotRepo.save(next); rescheduleAll(next);
    }
    setModal(false);
  };

  const remove = async (s: TimeSlot) => {
    Alert.alert('删除时段', '确认删除这个时段？派发规则将不再使用它。', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => {
        const next = slots.filter((x) => x.id !== s.id);
        setSlots(next); await slotRepo.save(next); rescheduleAll(next);
      } },
    ]);
  };

  const todaySlots = slotsForToday(slots);

  return (
    <Screen>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <FontAwesome6 name="chevron-left" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>时间方案</Text>
        <TouchableOpacity onPress={openAdd} hitSlop={10}>
          <FontAwesome6 name="plus" size={20} color={C.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Card style={styles.intro}>
          <Text style={styles.introTitle}>工作日轻量 · 周末深度</Text>
          <Text style={styles.introSub}>推荐默认：工作日晚上只排 ≤20 分钟轻量任务；深度任务优先排周末上午。任务类型×时段×时长匹配，超容量顺延下一合适时段。</Text>
        </Card>

        <Text style={styles.todayLabel}>今天生效：{todaySlots.length} 段</Text>
        {todaySlots.map((s) => (
          <View key={s.id} style={styles.todayRow}>
            <View style={[styles.todayDot, { backgroundColor: KIND_COLOR[s.kind] }]} />
            <Text style={{ color: C.text, fontWeight: '600' }}>{s.start}–{s.end}</Text>
            <Tag text={s.kind === 'deep' ? '深度' : s.kind === 'review' ? '复盘' : '轻量'} color={KIND_COLOR[s.kind]} />
          </View>
        ))}

        <Text style={styles.todayLabel}>全部时段</Text>
        {slots.length === 0 ? <Empty text="还没有时段" /> : null}
        {slots.map((s) => (
          <Card key={s.id} style={{ marginBottom: 10 }}>
            <View style={styles.slotHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.slotTime}>{s.start}–{s.end}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  {WD.map((d, i) => (
                    <View key={i} style={[styles.wdDot, s.weekdays.includes(i) && { backgroundColor: KIND_COLOR[s.kind] }]}>
                      <Text style={{ color: s.weekdays.includes(i) ? '#fff' : C.muted, fontSize: 10, fontWeight: '600' }}>{d}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Tag text={s.kind === 'deep' ? '深度' : s.kind === 'review' ? '复盘' : '轻量'} color={KIND_COLOR[s.kind]} />
                <Switch value={s.enabled} onValueChange={() => toggleEnabled(s)} trackColor={{ true: C.primary }} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 10 }}>
              <TouchableOpacity onPress={() => openEdit(s)}><Text style={{ color: C.primary, fontWeight: '600', fontSize: 13 }}>编辑</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => remove(s)}><Text style={{ color: C.warn, fontWeight: '600', fontSize: 13 }}>删除</Text></TouchableOpacity>
            </View>
          </Card>
        ))}
      </ScrollView>

      <ModalSheet visible={modal} onClose={() => setModal(false)} title={editing ? '编辑时段' : '新增时段'}>
        <Text style={styles.fLabel}>适用星期几（{weekdays.length} 选）</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {WD.map((d, i) => {
            const active = weekdays.includes(i);
            return (
              <TouchableOpacity
                key={i}
                onPress={() => setWeekdays((prev) => (active ? prev.filter((x) => x !== i) : [...prev, i]))}
                style={[styles.wdChip, active && { backgroundColor: C.primary, borderColor: C.primary }]}
              >
                <Text style={{ color: active ? '#fff' : C.muted, fontWeight: '700' }}>{d}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.fLabel}>开始 – 结束</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
          <TimeInput value={start} onChange={setStart} />
          <Text style={{ alignSelf: 'center', color: C.muted }}>—</Text>
          <TimeInput value={end} onChange={setEnd} />
        </View>
        <Text style={styles.fLabel}>时段类型</Text>
        <Segmented
          options={[{ label: '轻量', value: 'light' }, { label: '深度', value: 'deep' }, { label: '复盘', value: 'review' }]}
          value={kind}
          onChange={setKind}
          color={C.info}
        />
        <View style={{ height: 14 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.fLabel}>启用该时段</Text>
          <Switch value={enabled} onValueChange={setEnabled} trackColor={{ true: C.primary }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <View style={{ flex: 1 }}><Btn title="取消" variant="ghost" onPress={() => setModal(false)} /></View>
          <View style={{ flex: 1 }}><Btn title="保存时段" onPress={save} /></View>
        </View>
      </ModalSheet>
    </Screen>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder="HH:MM"
      placeholderTextColor={C.muted}
      style={styles.timeInput}
      maxLength={5}
    />
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  intro: { backgroundColor: C.primarySoft, borderColor: C.primarySoft, marginBottom: 16 },
  introTitle: { fontSize: 15, fontWeight: '700', color: C.primary },
  introSub: { color: C.muted, fontSize: 13, lineHeight: 20, marginTop: 6 },
  todayLabel: { fontSize: 13, fontWeight: '700', color: C.muted, marginTop: 6, marginBottom: 8 },
  todayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: RADIUS.card, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  todayDot: { width: 8, height: 8, borderRadius: 4 },
  slotHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  slotTime: { fontSize: 16, fontWeight: '700', color: C.text },
  wdDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  fLabel: { fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: '500' },
  wdChip: { width: 40, height: 34, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  timeInput: {
    backgroundColor: C.primarySoft, borderRadius: RADIUS.control, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: C.text, fontWeight: '600', flex: 1, textAlign: 'center',
  },
});