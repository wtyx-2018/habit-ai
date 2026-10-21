import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card, Field, Btn } from '@/components/ui';
import { C } from '@/theme';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { loadAiConfig, saveAiConfig, chatCompletion } from '@/lib/llm';
import type { AiConfig } from '@/lib/models';

// DeepSeek 默认配置（OpenAI 兼容接口）
const DEEPSEEK_BASE = 'https://api.deepseek.com';
const DEEPSEEK_MODEL = 'deepseek-chat';

export default function LlmScreen() {
  const router = useSafeRouter();
  const [cfg, setCfg] = useState<AiConfig>({ baseUrl: DEEPSEEK_BASE, apiKey: '', model: DEEPSEEK_MODEL });
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const load = useCallback(async () => {
    const c = await loadAiConfig();
    // 首次使用：若完全没有配置，预填 DeepSeek 默认值，用户只需填入 API Key
    setCfg({
      baseUrl: (c.baseUrl || DEEPSEEK_BASE).trim(),
      apiKey: (c.apiKey || '').trim(),
      model: (c.model || DEEPSEEK_MODEL).trim(),
    });
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k: keyof AiConfig, v: string) => setCfg((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    if (!cfg.baseUrl.trim()) { Alert.alert('提示', '请填写接口地址'); return; }
    if (!cfg.apiKey.trim()) { Alert.alert('提示', '请填写 DeepSeek API Key（在 platform.deepseek.com 获取）'); return; }
    await saveAiConfig({ ...cfg, baseUrl: cfg.baseUrl.trim(), model: cfg.model.trim(), apiKey: cfg.apiKey.trim() });
    Alert.alert('已保存', 'API Key 已安全保存在本机');
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

  const applyDeepSeek = () => {
    setCfg((prev) => ({ ...prev, baseUrl: DEEPSEEK_BASE, model: DEEPSEEK_MODEL }));
    Alert.alert('已选择 DeepSeek', '接口与模型已填充，填入 API Key 后点保存即可。');
  };

  return (
    <Screen>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <FontAwesome6 name="chevron-left" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI 配置</Text>
        <View style={{ width: 20 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Card style={styles.statusCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.dot, { backgroundColor: cfg.apiKey.trim() ? C.complete : C.placeholder }]} />
              <Text style={styles.statusText}>{cfg.apiKey.trim() ? '已配置，AI 功能可用' : '填入 DeepSeek API Key 即可启用 AI'}</Text>
            </View>
            <Text style={styles.statusSub}>无 Key 或离线时，任务拆解 / 焦虑急救会走纯本地模板化引导，不阻塞使用。</Text>
          </Card>

          <Card>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>模型连接</Text>
              <TouchableOpacity onPress={applyDeepSeek} hitSlop={8}>
                <Text style={{ color: C.primary, fontWeight: '600', fontSize: 13 }}>使用 DeepSeek 预设</Text>
              </TouchableOpacity>
            </View>
            <Field label="Base URL" value={cfg.baseUrl} onChangeText={(v) => set('baseUrl', v)} placeholder="https://api.deepseek.com" required />
            <Field label="API Key" value={cfg.apiKey} onChangeText={(v) => set('apiKey', v)} placeholder="sk-…（仅存本机，安全存储）" secureTextEntry={!showKey} rightAccessory={
              <TouchableOpacity onPress={() => setShowKey((p) => !p)} hitSlop={8}>
                <FontAwesome6 name={showKey ? 'eye-slash' : 'eye'} size={16} color={C.placeholder} />
              </TouchableOpacity>
            } />
            <Field label="Model" value={cfg.model} onChangeText={(v) => set('model', v)} placeholder="deepseek-chat" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Btn title="保存" onPress={save} /></View>
              <View style={{ flex: 1 }}><Btn title="测试连接" variant="soft" onPress={test} loading={testing} /></View>
            </View>
          </Card>

          <Card style={{ marginTop: 12 }}>
            <Text style={styles.tipTitle}>说明</Text>
            <Text style={styles.tipText}>· 默认预设：DeepSeek（base=https://api.deepseek.com，model=deepseek-chat），接口符合 OpenAI Chat Completions 兼容格式。</Text>
            <Text style={styles.tipText}>· 获取 Key：platform.deepseek.com 控制台的「API Keys」。密钥仅保存在本机安全存储，仅在主动点击分析时向接口发起请求。</Text>
            <Text style={styles.tipText}>· 未配置时所有 AI 功能自动降级为本地模板，可放心使用。</Text>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: C.text },
  statusCard: { backgroundColor: C.primarySoft, marginBottom: 14 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontWeight: '600', color: C.text, fontSize: 14 },
  statusSub: { color: C.muted, fontSize: 12, marginTop: 6, lineHeight: 18 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  tipTitle: { fontWeight: '600', color: C.text, fontSize: 14, marginBottom: 8 },
  tipText: { color: C.muted, fontSize: 12, lineHeight: 19, marginBottom: 6 },
});