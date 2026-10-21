import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/ui';
import { C, RADIUS } from '@/theme';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Alert } from 'react-native';

export default function ProfileScreen() {
  const router = useSafeRouter();

  const entries: { icon: string; color: string; label: string; sub: string; onPress?: () => void; disabled?: boolean }[] = [
    { icon: 'scale-balanced', color: C.accent, label: '记账 · 个人三张表', sub: '资产 / 收支 / 现金流', onPress: () => router.push('/ledger') },
    { icon: 'clock', color: C.primary, label: '时间方案', sub: '工作日 / 周末双轨，逐星期几微调', onPress: () => router.push('/timescheme') },
    { icon: 'bell', color: C.info, label: '通知', sub: '六类开关 · 声音 / 震动 / 测试', onPress: () => router.push('/notifications') },
    { icon: 'robot', color: C.complete, label: 'AI / LLM', sub: '配置 OpenAI 兼容接口', onPress: () => router.push('/llm') },
    { icon: 'file-export', color: C.warn, label: 'Markdown 导出', sub: '增量写入 life_log.md 并分享', onPress: () => router.push('/export') },
    { icon: 'comment-dots', color: '#5B8AA6', label: '应用锁（V1.1）', sub: '本地 PIN 锁屏 · 计划中', disabled: true },
    { icon: 'cloud-arrow-up', color: '#5B8AA6', label: '自动云备份（V1.1）', sub: '接入对象存储 · 计划中', disabled: true },
  ];

  return (
    <Screen>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Card style={styles.hero}>
          <Text style={styles.heroTitle}>日拱</Text>
          <Text style={styles.heroSub}>Habit AI · 本地优先</Text>
          <View style={styles.privacyPill}>
            <FontAwesome6 name="lock" size={11} color={C.primary} />
            <Text style={styles.privacyText}>所有数据仅保存在这台设备</Text>
          </View>
        </Card>

        <Text style={styles.declare} onPress={() => Alert.alert('隐私说明', '日拱采用本地优先架构：目标、任务、习惯、复盘、记账、焦虑急救记录全部仅保存在本机（AsyncStorage / SecureStore）。未配置任何账号，不上传云端。配置的 LLM 仅在你主动点击分析时向你自己填写的接口发起请求。导出的 life_log.md 由你自行分享。')}>
          隐私说明：所有数据仅保存在本机，无账号、无云后端。
        </Text>

        {entries.map((e, i) => (
          <TouchableOpacity key={e.label} onPress={e.onPress} disabled={e.disabled} activeOpacity={0.8}>
            <Card style={[styles.row, e.disabled && { opacity: 0.5 }]}>
              <View style={[styles.icon, { backgroundColor: hexA(e.color, 0.14) }]}>
                <FontAwesome6 name={e.icon as any} size={18} color={e.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{e.label}</Text>
                {e.sub ? <Text style={styles.rowSub}>{e.sub}</Text> : null}
              </View>
              {!e.disabled ? <FontAwesome6 name="chevron-right" size={14} color={C.muted} /> : <Text style={styles.soon}>敬请期待</Text>}
            </Card>
          </TouchableOpacity>
        ))}

        <Text style={styles.foot}>日拱 · 慢一点，也往前一点</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', padding: 22, marginBottom: 14, backgroundColor: C.primary, borderColor: C.primary },
  heroTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  privacyPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 5, marginTop: 12 },
  privacyText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  declare: { color: C.muted, fontSize: 12, textAlign: 'center', marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, padding: 14 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 15, fontWeight: '600', color: C.text },
  rowSub: { color: C.muted, fontSize: 12, marginTop: 2 },
  soon: { color: C.muted, fontSize: 11 },
  foot: { textAlign: 'center', color: C.muted, fontSize: 12, marginTop: 20 },
});

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}