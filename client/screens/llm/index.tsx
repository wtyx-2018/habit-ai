import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card, Field, Btn, Tag } from '@/components/ui';
import { C } from '@/theme';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { loadAiConfig, saveAiConfig, chatCompletion } from '@/lib/llm';
import type { AiConfig } from '@/lib/models';

export default function LlmScreen() {
  const router = useSafeRouter();
  const [cfg, setCfg] = useState<AiConfig>({ baseUrl: '', apiKey: '', model: '' });
  const [testing, setTesting] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  const load = useCallback(async () => {
    const c = await loadAiConfig();
    setCfg(c);
    setHasKey(!!(c.apiKey && c.baseUrl && c.model));
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k: keyof AiConfig, v: string) => setCfg((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    if (!cfg.baseUrl.trim()) { Alert.alert('提示', '请填写接口地址'); return; }
    await saveAiConfig({ ...cfg, baseUrl: cfg.baseUrl.trim(), model: cfg.model.trim(), apiKey: cfg.apiKey.trim() });
    setHasKey(!!(cfg.apiKey.trim() && cfg.baseUrl.trim() && cfg.model.trim()));
    Alert.alert('已保存', 'LLM 配置已安全保存在本机');
  };

  const test = async () => {
    if (!cfg.apiKey.trim() || !cfg.baseUrl.trim()) { Alert.alert('提示', '先填入接口地址与密钥'); return; }
    setTesting(true);
    try {
      const res = await chatCompletion('你是一个测试助手', '请只回复：连接成功');
      Alert.alert('连接成功', res.slice(0, 100));
    } catch (e) {
      Alert.alert('连接失败', (e as Error).message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Screen>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <FontAwesome6 name="chevron-left" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI / LLM</Text>
        <View style={{ width: 20 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Card style={styles.statusCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.dot, { backgroundColor: hasKey ? C.complete : C.warn }]} />
              <Text style={styles.statusText}>{hasKey ? '已配置，AI 功能可用' : '未配置或未填全，将使用本地模板'}</Text>
            </View>
            <Text style={styles.statusSub}>无 Key 或离线时，任务拆解 / 焦虑急救会走纯本地模板化引导，不阻塞使用。</Text>
          </Card>

          <Card>
            <Field label="Base URL" value={cfg.baseUrl} onChangeText={(v) => set('baseUrl', v)} placeholder="https://api.openai.com 或 /v1 结尾" required />
            <Field label="API Key" value={cfg.apiKey} onChangeText={(v) => set('apiKey', v)} placeholder="sk-…（安全存储于本机）" />
            <Field label="Model" value={cfg.model} onChangeText={(v) => set('model', v)} placeholder="例如 gpt-4o-mini / deepseek-chat" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Btn title="保存" onPress={save} /></View>
              <View style={{ flex: 1 }}><Btn title="测试连接" variant="soft" onPress={test} loading={testing} /></View>
            </View>
          </Card>

          <Card style={{ marginTop: 12 }}>
            <Text style={styles.tipTitle}>说明</Text>
            <Text style={styles.tipText}>· 接口符合 OpenAI Chat Completions 兼容格式（POST {cfg.baseUrl || '{base_url}'}/v1/chat/completions）。</Text>
            <Text style={styles.tipText}>· 密钥仅保存在本机安全存储（SecureStore），仅在主动点击分析时向你自己填写的接口发起请求。</Text>
            <Text style={styles.tipText}>· 未配置时所有 AI 功能自动降级为本地模板，可放心使用。</Text>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  statusCard: { backgroundColor: C.accentSoft, borderColor: hexA(C.accent, 0.3), marginBottom: 14 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontWeight: '700', color: C.text, fontSize: 14 },
  statusSub: { color: C.muted, fontSize: 12, marginTop: 6, lineHeight: 18 },
  tipTitle: { fontWeight: '700', color: C.text, fontSize: 14, marginBottom: 8 },
  tipText: { color: C.muted, fontSize: 12, lineHeight: 19, marginBottom: 6 },
});

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}