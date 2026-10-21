import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card, Btn, Field, Segmented, Tag, Empty } from '@/components/ui';
import { C, RADIUS } from '@/theme';
import { txRepo, uid } from '@/lib/db';
import type { Transaction, TxType } from '@/lib/models';
import { LEDGER_CATEGORIES, LEDGER_ACCOUNTS } from '@/lib/models';
import { todayStr, fmtDate } from '@/lib/utils';

type Tab = 'assets' | 'income' | 'cash';

export default function LedgerScreen() {
  const [records, setRecords] = useState<Transaction[]>([]);
  const [tab, setTab] = useState<Tab>('assets');
  const [type, setType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [account, setAccount] = useState('现金');
  const [note, setNote] = useState('');
  const [customCat, setCustomCat] = useState('');

  const load = useCallback(() => { txRepo.list().then(setRecords); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const effectiveCat = customCat.trim() || category;
  const cats = [...(type === 'income' ? LEDGER_CATEGORIES.income : type === 'expense' ? LEDGER_CATEGORIES.expense : [] as string[]), '自定义'];

  const save = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { Alert.alert('提示', '请输入有效金额'); return; }
    if (type !== 'transfer' && !effectiveCat) { Alert.alert('提示', '请选择分类'); return; }
    const rec: Transaction = {
      id: uid(), time: Date.now(), date: todayStr(), type,
      amount: amt, category: type === 'transfer' ? '转账' : effectiveCat, account, note: note.trim(),
    };
    const next = [rec, ...records];
    await txRepo.save(next);
    setRecords(next);
    setAmount(''); setCategory(''); setCustomCat(''); setNote('');
  };

  // ===== 汇总 =====
  const accountBalances: Record<string, number> = {};
  for (const r of records) { accountBalances[r.account] = (accountBalances[r.account] || 0) + (r.type === 'income' ? r.amount : -r.amount); }
  const totalAssets = Object.values(accountBalances).reduce((a, b) => a + b, 0);

  const monthStart = todayStr().slice(0, 7);
  const monthRecs = records.filter((r) => r.date.startsWith(monthStart));
  const sumType = (arr: Transaction[], t: 'income' | 'expense') => arr.filter((r) => r.type === t).reduce((a, r) => a + r.amount, 0);
  const monthIncome = sumType(monthRecs, 'income');
  const monthExpense = sumType(monthRecs, 'expense');
  const balance = monthIncome - monthExpense;

  const expByCat: Record<string, number> = {};
  for (const r of monthRecs) if (r.type === 'expense') expByCat[r.category] = (expByCat[r.category] || 0) + r.amount;
  const expTotal = Object.values(expByCat).reduce((a, b) => a + b, 0);

  const transfers = records.filter((r) => r.type === 'transfer');

  return (
    <Screen>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View>
            <Text style={styles.greet}>记账 · 个人三张表</Text>
            <Text style={styles.sub}>小账记清，心里不慌</Text>
          </View>
        </View>

        {/* 快速记账 */}
        <Card>
          <Segmented
            options={[{ label: '支出', value: 'expense' }, { label: '收入', value: 'income' }, { label: '转账', value: 'transfer' }]}
            value={type}
            onChange={setType}
            color={C.accent}
          />
          <View style={{ height: 14 }} />
          <View style={styles.amountRow}>
            <Text style={[styles.currency, { color: type === 'income' ? C.complete : type === 'expense' ? C.warn : C.info }]}>¥</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={C.muted}
              keyboardType="decimal-pad"
              style={styles.amountInput}
            />
          </View>

          {type !== 'transfer' ? (
            <Text style={styles.fLabel}>分类</Text>
          ) : null}
          {type !== 'transfer' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {cats.map((c) => {
                const active = c === '自定义' ? !!customCat : category === c;
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => { if (c === '自定义') return; setCategory(c); setCustomCat(''); }}
                    style={[styles.chip, active && { backgroundColor: C.accentSoft, borderColor: C.accent }]}
                  >
                    <Text style={{ color: active ? C.accent : C.muted, fontWeight: '600', fontSize: 13 }}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
          {type !== 'transfer' && customCat ? (
            <Field label="自定义分类" value={customCat} onChangeText={setCustomCat} placeholder="输入自定义分类，回车保持" style={{ marginBottom: 10 }} />
          ) : null}

          <Text style={styles.fLabel}>账户</Text>
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[...LEDGER_ACCOUNTS, '自定义'].map((a) => {
                  const active = a === '自定义' ? !LEDGER_ACCOUNTS.includes(account) : account === a;
                  return (
                    <TouchableOpacity key={a} onPress={() => { if (a !== '自定义') setAccount(a); }} style={[styles.chip, active && { backgroundColor: C.primarySoft, borderColor: C.primary }]}>
                      <Text style={{ color: active ? C.primary : C.muted, fontWeight: '600', fontSize: 13 }}>{a}</Text>
                    </TouchableOpacity>
                  );
                })}
            </View>
          </ScrollView>
          </View>
          {!LEDGER_ACCOUNTS.includes(account) ? (
            <Field label="自定义账户名" value={account} onChangeText={setAccount} placeholder="如：储蓄卡2" style={{ marginBottom: 10 }} />
          ) : null}

          <Field label="备注（可写 从 → 到）" value={note} onChangeText={setNote} placeholder={type === 'transfer' ? '例如：储蓄卡 → 电子钱包' : '可选'} style={{ marginBottom: 10 }} />
          <Btn title="记一笔" onPress={save} />
        </Card>

        {/* 三张表切换 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>个人三张表</Text>
        </View>
        <Segmented
          options={[{ label: '资产负债表', value: 'assets' }, { label: '收支表', value: 'income' }, { label: '现金流量表', value: 'cash' }]}
          value={tab}
          onChange={setTab}
        />
        <View style={{ height: 14 }} />

        {tab === 'assets' ? (
          <Card>
            <View style={styles.bigNumRow}>
              <View>
                <Text style={styles.bigLabel}>净资产</Text>
                <Text style={[styles.bigVal, { color: totalAssets >= 0 ? C.complete : C.warn }]}>¥ {totalAssets.toFixed(2)}</Text>
              </View>
              <FontAwesome6 name="scale-balanced" size={22} color={C.primary} />
            </View>
            <Text style={styles.subLabel}>账户（资产项）</Text>
            {Object.entries(accountBalances).length === 0 ? <Empty text="还没有账户余额" /> : null}
            {Object.entries(accountBalances).map(([acct, bal]) => (
              <View key={acct} style={styles.line}>
                <Text style={{ color: C.text, fontWeight: '500' }}>{acct}</Text>
                <Text style={{ color: bal >= 0 ? C.text : C.warn, fontWeight: '700' }}>¥ {bal.toFixed(2)}</Text>
              </View>
            ))}
            {records.some((r) => r.type === 'expense') ? (
              <Text style={styles.smallNote}>负债项在本机记账中未建模，净资产 = 累计资产 ± 流量估算</Text>
            ) : null}
          </Card>
        ) : null}

        {tab === 'income' ? (
          <Card>
            <View style={styles.bigNumRow}>
              <View>
                <Text style={styles.bigLabel}>本月结余</Text>
                <Text style={[styles.bigVal, { color: balance >= 0 ? C.complete : C.warn }]}>¥ {balance.toFixed(2)}</Text>
              </View>
            </View>
            <View style={styles.incRow}>
              <View style={styles.incCell}><Text style={styles.incLabel}>期内收入</Text><Text style={[styles.incVal, { color: C.complete }]}>¥ {monthIncome.toFixed(2)}</Text></View>
              <View style={styles.incCell}><Text style={styles.incLabel}>期内支出</Text><Text style={[styles.incVal, { color: C.warn }]}>¥ {monthExpense.toFixed(2)}</Text></View>
            </View>
            <Text style={styles.subLabel}>支出分类占比（本月）</Text>
            {expTotal > 0 ? (
              Object.entries(expByCat).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
                const pct = Math.round((amt / expTotal) * 100);
                return (
                  <View key={cat} style={{ marginBottom: 10 }}>
                    <View style={styles.line}><Text style={{ color: C.text, fontSize: 13 }}>{cat}</Text><Text style={{ color: C.muted, fontSize: 12 }}>{pct}% · ¥{amt.toFixed(2)}</Text></View>
                    <View style={styles.barTrack}><View style={[styles.barFill, { width: `${pct}%`, backgroundColor: C.accent }]} /></View>
                  </View>
                );
              })
            ) : <Empty text="本月还没有支出" />}
          </Card>
        ) : null}

        {tab === 'cash' ? (
          <Card>
            <Text style={styles.subLabel}>账户间流动明细</Text>
            {transfers.length === 0 ? <Empty text="还没有转账记录" /> : null}
            {transfers.map((r) => (
              <View key={r.id} style={styles.cashRow}>
                <View style={styles.cashIcon}><FontAwesome6 name="arrow-right-arrow-left" size={14} color={C.info} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '600' }}>{r.account} {r.note ? `· ${r.note}` : ''}</Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>{fmtDate(new Date(r.time))}</Text>
                </View>
                <Text style={{ color: C.info, fontWeight: '700' }}>¥ {r.amount.toFixed(2)}</Text>
              </View>
            ))}
            <Text style={[styles.subLabel, { marginTop: 16 }]}>最近流水</Text>
            {records.slice(0, 20).map((r) => (
              <View key={r.id} style={styles.cashRow}>
                <View style={[styles.cashIcon, { backgroundColor: r.type === 'expense' ? hexA(C.warn, 0.15) : hexA(C.complete, 0.15) }]}>
                  <FontAwesome6 name={r.type === 'expense' ? 'minus' : 'plus'} size={13} color={r.type === 'expense' ? C.warn : C.complete} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '500', fontSize: 13 }}>{r.category} · {r.account}</Text>
                  <Text style={{ color: C.muted, fontSize: 11 }}>{fmtDate(new Date(r.time))}</Text>
                </View>
                <Text style={{ color: r.type === 'expense' ? C.warn : C.complete, fontWeight: '700' }}>{r.type === 'expense' ? '-' : '+'}¥ {r.amount.toFixed(2)}</Text>
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  greet: { fontSize: 22, fontWeight: '800', color: C.text },
  sub: { color: C.muted, fontSize: 13, marginTop: 2 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  currency: { fontSize: 30, fontWeight: '800' },
  amountInput: { fontSize: 32, fontWeight: '800', color: C.text, flex: 1 },
  fLabel: { fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: '500' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  bigNumRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  bigLabel: { color: C.muted, fontSize: 13 },
  bigVal: { fontSize: 34, fontWeight: '900' },
  subLabel: { color: C.muted, fontSize: 13, marginBottom: 8, fontWeight: '700', marginTop: 4 },
  smallNote: { color: C.muted, fontSize: 11, marginTop: 12, lineHeight: 16 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  incRow: { flexDirection: 'row', marginBottom: 10 },
  incCell: { flex: 1 },
  incLabel: { color: C.muted, fontSize: 12 },
  incVal: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: C.primarySoft, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  cashRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  cashIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: hexA(C.info, 0.15), alignItems: 'center', justifyContent: 'center' },
});

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}