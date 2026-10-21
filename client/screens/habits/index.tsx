import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput, Switch } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card, Btn, Field, ModalSheet, Empty, Tag, hexA } from '@/components/ui';
import { C, RADIUS } from '@/theme';
import { habitRepo, uid } from '@/lib/db';
import type { Habit } from '@/lib/models';
import { todayStr } from '@/lib/utils';

const EMPTY: Habit = {
  id: '', name: '', anchor: '', minimumAction: '', environmentSetup: '', fallbackVersion: '', streak: 0,
  active: true, lastCheckedDate: null,
};

export default function HabitsScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Habit>(EMPTY);

  const load = useCallback(() => {
    habitRepo.list().then(setHabits);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAdd = () => { setEditing({ ...EMPTY, id: uid() }); setModal(true); };
  const openEdit = (h: Habit) => { setEditing({ ...h }); setModal(true); };

  const set = (k: keyof Habit, v: string | number | boolean) => setEditing((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    if (!editing.name.trim()) { Alert.alert('提示', '请给习惯起个名字'); return; }
    const exists = habits.some((h) => h.id === editing.id);
    const item: Habit = { ...editing, name: editing.name.trim() };
    const next = exists ? habits.map((h) => (h.id === item.id ? item : h)) : [...habits, item];
    await habitRepo.save(next);
    setHabits(next);
    setModal(false);
  };

  const checkin = async (h: Habit, mode: 'full' | 'fallback') => {
    const today = todayStr();
    if (h.lastCheckedDate === today) {
      Alert.alert('今天已打卡', '链条已维持，明天再来也一样很棒。');
      return;
    }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    const streak = h.lastCheckedDate === yStr ? h.streak + 1 : 1;
    const next = habits.map((x) => (x.id === h.id ? { ...x, streak, lastCheckedDate: today } : x));
    await habitRepo.save(next);
    setHabits(next);
    Alert.alert(mode === 'full' ? '完整打卡' : '降级完成', `连续 ${streak} 天${mode === 'fallback' ? '（降级也算维持链条）' : ''}`);
  };

  const toggleActive = async (h: Habit) => {
    const next = habits.map((x) => (x.id === h.id ? { ...x, active: !x.active } : x));
    await habitRepo.save(next);
    setHabits(next);
  };

  const activeHabits = habits.filter((h) => h.active);
  const streakSum = habits.reduce((a, h) => a + h.streak, 0);

  return (
    <Screen>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View>
            <Text style={styles.greet}>习惯与环境设计</Text>
            <Text style={styles.sub}>别靠意志力，靠锚点与预置好的环境</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <FontAwesome6 name="plus" size={15} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* 正向鼓励：总维持天数，放大 */}
        <Card style={styles.streakCard}>
          <Text style={styles.streakNum}>{streakSum}<Text style={styles.streakUnit}> 天</Text></Text>
          <Text style={styles.streakLabel}>累计维持 · 断链不追责，接住每一个微小日常</Text>
        </Card>

        {activeHabits.length === 0 ? (
          <Empty text="还没有习惯" hint="先从设计一个最小的触发锚点开始" />
        ) : (
          activeHabits.map((h) => (
            <Card key={h.id} style={{ marginBottom: 12 }}>
              {/* 上区：名称 + 连续天数 */}
              <TouchableOpacity onPress={() => openEdit(h)} activeOpacity={0.7}>
                <View style={styles.rowBetween}>
                  <Text style={styles.habitName} numberOfLines={1}>{h.name}</Text>
                  <Tag text={`维持 ${h.streak} 天`} color={C.complete} />
                </View>
              </TouchableOpacity>
              {/* 下区：五要素 → pill 标签 */}
              <View style={styles.pillWrap}>
                <Pill icon="location-dot" color={C.primary} label="锚点" value={h.anchor} />
                <Pill icon="person-running" color={C.info} label="最小行动" value={h.minimumAction} />
                <Pill icon="house" color={C.quarter} label="环境预置" value={h.environmentSetup} />
                {h.fallbackVersion ? <Pill icon="shield-heart" color={C.tipWarm} label="降级版" value={h.fallbackVersion} /> : null}
              </View>
              {/* 打卡：完整=主色填充；降级=描边弱化 */}
              <View style={styles.checkRow}>
                <Btn small title="完整打卡" variant="primary" style={{ flex: 1 }} onPress={() => checkin(h, 'full')} />
                <Btn small title="降级完成" variant="outline" style={{ flex: 1 }} onPress={() => checkin(h, 'fallback')} />
                <TouchableOpacity onPress={() => toggleActive(h)} hitSlop={8} style={styles.pauseBtn}>
                  <FontAwesome6 name="pause" size={15} color={C.muted} />
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <ModalSheet visible={modal} onClose={() => setModal(false)} title={habits.some((h) => h.id === editing.id) ? '编辑习惯' : '设计一个新习惯'}>
        <Field label="习惯名称" value={editing.name} onChangeText={(v) => set('name', v)} placeholder="例如：晚饭后散步" required />
        <Field label="触发锚点（After …I will…）" value={editing.anchor} onChangeText={(v) => set('anchor', v)} placeholder="吃完晚饭 -> 穿上鞋" />
        <Field label="最小行动（能立即做到的一小步）" value={editing.minimumAction} onChangeText={(v) => set('minimumAction', v)} placeholder="穿好鞋、出门走 2 分钟" />
        <Field label="环境预置（提前布置好条件）" value={editing.environmentSetup} onChangeText={(v) => set('environmentSetup', v)} placeholder="鞋放在门口、手机提示关掉" />
        <Field label="降级版本（状态差时的保底）" value={editing.fallbackVersion} onChangeText={(v) => set('fallbackVersion', v)} placeholder="就在楼下站 1 分钟" />
        <View style={styles.rowBetween}>
          <Text style={styles.fLabel}>启用该习惯</Text>
          <Switch value={editing.active} onValueChange={(v) => set('active', v)} trackColor={{ true: C.primary }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <View style={{ flex: 1 }}><Btn title="取消" variant="ghost" onPress={() => setModal(false)} /></View>
          <View style={{ flex: 1 }}><Btn title="保存" onPress={save} /></View>
        </View>
      </ModalSheet>
    </Screen>
  );
}

function Pill({ icon, color, label, value }: { icon: string; color: string; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: hexA(color, 0.09), borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 6, maxWidth: '100%' }}>
      <FontAwesome6 name={icon as any} size={11} color={color} />
      <Text style={{ color, fontSize: 11, fontWeight: '600' }}>{label}</Text>
      <Text style={{ color: C.text, fontSize: 12, flexShrink: 1 }} numberOfLines={1}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  greet: { fontSize: 22, fontWeight: '600', color: C.text },
  sub: { color: C.muted, fontSize: 13, marginTop: 2 },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  streakCard: { alignItems: 'center', paddingVertical: 22, marginBottom: 16, backgroundColor: C.primarySoft },
  streakNum: { fontSize: 42, fontWeight: '600', color: C.primary },
  streakUnit: { fontSize: 18, fontWeight: '500', color: C.primary },
  streakLabel: { color: C.muted, fontSize: 12, marginTop: 4 },
  habitName: { fontSize: 16, fontWeight: '600', color: C.text, flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  checkRow: { flexDirection: 'row', gap: 8, marginTop: 16, alignItems: 'center' },
  pauseBtn: { width: 40, height: 40, borderRadius: RADIUS.control, borderWidth: 1, borderColor: C.divider, alignItems: 'center', justifyContent: 'center' },
  fLabel: { fontSize: 13, color: C.muted, fontWeight: '500' },
});