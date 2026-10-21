import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card, Btn } from '@/components/ui';
import { C } from '@/theme';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { settingsRepo, slotRepo } from '@/lib/db';
import type { AppSettings } from '@/lib/models';
import { DEFAULT_SETTINGS } from '@/lib/models';
import {
  requestNotificationPermission, openSystemSettings, sendTestNotification, rescheduleAll, watchPermission,
} from '@/lib/notify';

const TOGGLES: { key: keyof AppSettings; label: string; sub: string }[] = [
  { key: 'notifTasks', label: '任务派发', sub: '工作日 18:30 · 周末 09:30' },
  { key: 'notifSlots', label: '时段开始', sub: '每个时段的开始提醒' },
  { key: 'notifReview', label: '每日复盘', sub: '22:00 提醒做复盘' },
  { key: 'notifHabit', label: '习惯环境', sub: '检查习惯锚点与环境预置' },
  { key: 'notifLedger', label: '记账', sub: '定期提醒记一笔' },
  { key: 'notifReport', label: 'AI 周报', sub: '每周自动导出提醒' },
];

export default function NotificationsScreen() {
  const router = useSafeRouter();
  const [s, setS] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [perm, setPerm] = useState('unknown');

  const load = useCallback(async () => {
    const settings = await settingsRepo.get();
    setS(settings);
    if (Platform.OS !== 'web') {
      const p = await requestNotificationPermission();
      setPerm(p);
    }
  }, []);
  useEffect(() => { watchPermission(setPerm); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const set = async (key: keyof AppSettings, value: boolean) => {
    const next = { ...s, [key]: value };
    setS(next); await settingsRepo.set(next);
    const slots = await slotRepo.list();
    rescheduleAll(slots);
  };

  const test = async () => { await sendTestNotification(); };

  return (
    <Screen>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <FontAwesome6 name="chevron-left" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>通知</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* 权限状态 */}
        <Card style={styles.permCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <FontAwesome6 name="bell" size={20} color={perm === 'granted' ? C.complete : C.warn} />
            <View style={{ flex: 1 }}>
              <Text style={styles.permTitle}>{perm === 'granted' ? '通知已开启' : perm === 'denied' ? '通知未开启' : '通知权限状态未知'}</Text>
              <Text style={styles.permSub}>
                {perm === 'denied' ? '请在系统设置中允许"日拱"发送通知，否则无法收到提醒。' : 'Android 通知渠道已配置，支持定时与重复通知。'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            {perm === 'denied' ? <View style={{ flex: 1 }}><Btn title="去系统设置开启" onPress={openSystemSettings} /></View> : null}
            <View style={{ flex: 1 }}><Btn title="发测试通知" variant="soft" onPress={test} /></View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>提醒类型</Text>
        {TOGGLES.map((t) => (
          <Card key={t.key} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{t.label}</Text>
              <Text style={styles.rowSub}>{t.sub}</Text>
            </View>
            <Switch value={!!s[t.key]} onValueChange={(v) => set(t.key, v)} trackColor={{ true: C.primary }} />
          </Card>
        ))}

        <Text style={styles.sectionTitle}>提醒方式</Text>
        <Card style={styles.row}>
          <View style={{ flex: 1 }}><Text style={styles.rowLabel}>声音</Text></View>
          <Switch value={s.sound} onValueChange={(v) => set('sound', v)} trackColor={{ true: C.primary }} />
        </Card>
        <Card style={styles.row}>
          <View style={{ flex: 1 }}><Text style={styles.rowLabel}>震动</Text></View>
          <Switch value={s.vibrate} onValueChange={(v) => set('vibrate', v)} trackColor={{ true: C.primary }} />
        </Card>
        <Card style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>勿扰静默</Text>
            <Text style={styles.rowSub}>降低通知渠道重要性，免打扰</Text>
          </View>
          <Switch value={s.silentMode} onValueChange={(v) => set('silentMode', v)} trackColor={{ true: C.primary }} />
        </Card>

        <Card style={{ marginTop: 8 }}>
          <Text style={styles.note}>小提示：通知仅用于你的规划与复盘提醒，不会收集任何数据。时间方案中每个时段都会生成重复提醒，切换勿扰静默后可统一降噪。</Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  permCard: { marginBottom: 8 },
  permTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  permSub: { color: C.muted, fontSize: 12, marginTop: 2, lineHeight: 18 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.muted, marginTop: 16, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, padding: 14 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: C.text },
  rowSub: { color: C.muted, fontSize: 12, marginTop: 2 },
  note: { color: C.muted, fontSize: 12, lineHeight: 18 },
});