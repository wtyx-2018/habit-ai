import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card, Btn, Segmented } from '@/components/ui';
import { C, RADIUS } from '@/theme';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { settingsRepo } from '@/lib/db';
import { DEFAULT_SETTINGS, type AppSettings } from '@/lib/models';
import { exportNow, logPath } from '@/lib/export';

export default function ExportScreen() {
  const router = useSafeRouter();
  const [s, setS] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [path, setPath] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const st = await settingsRepo.get();
    setS(st);
    setPath(logPath());
  }, []);
  useEffect(() => { load(); }, [load]);

  const setFreq = async (v: string) => {
    const next: AppSettings = { ...s, exportFrequency: v as AppSettings['exportFrequency'] };
    setS(next);
    await settingsRepo.set(next);
  };

  const doExport = async () => {
    setBusy(true);
    try {
      const res = await exportNow();
      Alert.alert(res.ok ? '导出完成' : '提示', res.message || '完成');
      await settingsRepo.set({ ...s, lastExportedAt: Date.now() });
    } catch (e) {
      Alert.alert('导出失败', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <FontAwesome6 name="chevron-left" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Markdown 导出</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
        <Card style={styles.hero}>
          <View style={styles.heroIcon}>
            <FontAwesome6 name="file-lines" size={22} color={C.primary} />
          </View>
          <Text style={styles.heroTitle}>life_log.md</Text>
          <Text style={styles.heroSub}>把目标金字塔、每日任务/复盘/感受、记账（含三张表）、习惯、不为清单、焦虑急救、AI 分析累计写入单个 Markdown 文件。增量追加，不覆盖历史。</Text>
          <View style={{ alignSelf: 'stretch', marginTop: 14 }}>
            <Btn title={busy ? '导出中…' : '立即导出并分享'} onPress={doExport} loading={busy} />
          </View>
        </Card>

        <Card>
          <Text style={styles.fLabel}>自动导出频率</Text>
          <Segmented
            options={[{ label: '仅手动', value: 'off' }, { label: '每周', value: 'weekly' }, { label: '每日', value: 'daily' }]}
            value={s.exportFrequency}
            onChange={setFreq}
            color={C.primary}
          />
          <Text style={styles.fLabel2}>导出位置</Text>
          <Text style={styles.path}>{path || 'Web 预览不支持本地文件，请在 Android 设备上使用。'}</Text>
          <Text style={styles.note}>在 Android 上导出会自动调起系统分享，可保存到任意位置或发送给自己。导出前会把你新增的任务、记录、账单一并追加。</Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  hero: { alignItems: 'center', marginBottom: 14 },
  heroIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginTop: 10 },
  heroSub: { color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  fLabel: { fontSize: 13, color: C.muted, marginBottom: 8 },
  fLabel2: { fontSize: 13, color: C.muted, marginTop: 18, marginBottom: 6 },
  path: { fontSize: 12, color: C.text, backgroundColor: C.background, borderRadius: 10, padding: 10, marginBottom: 12 },
  note: { color: C.muted, fontSize: 12, lineHeight: 18 },
});