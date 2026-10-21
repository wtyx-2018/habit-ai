// Markdown 导出服务：把累计记录写入 life_log.md，支持增量追加与系统分享。
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import {
  goalRepo, taskRepo, habitRepo, stopRepo, journalRepo, anxietyRepo, txRepo,
} from '@/lib/db';
import { DOMAIN_LABELS } from '@/theme';
import { fmtDate, todayStr } from '@/lib/utils';

const FS = FileSystem as any;
const LOG_NAME = 'life_log.md';

export function logPath(): string {
  if (Platform.OS === 'web') return '';
  return FS.documentDirectory + LOG_NAME;
}

// ===== 增量追加 =====
export async function appendToLog(section: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const path = logPath();
  const sep = '---\n\n';
  try {
    await FS.makeDirectoryAsync(FS.documentDirectory + 'logs/', { intermediates: true }).catch(() => undefined);
    const dir = FS.documentDirectory + 'logs/';
    const file = dir + LOG_NAME;
    const exists = (await FS.getInfoAsync(file)).exists;
    const existing = exists ? (await FS.readAsStringAsync(file)) : '';
    await FS.writeAsStringAsync(file, existing + sep + section);
  } catch {
    // 首写
    await FS.writeAsStringAsync(path, section);
  }
}

// ===== 编译完整日志 =====
export async function buildFullLog(): Promise<string> {
  const [goals, tasks, habits, stops, journals, anxieties, txs] = await Promise.all([
    goalRepo.list(), taskRepo.list(), habitRepo.list(), stopRepo.list(),
    journalRepo.list(), anxietyRepo.list(), txRepo.list(),
  ]);

  const L: string[] = [];
  L.push('# 日拱 · Life Log');
  L.push('');
  L.push(`> 导出时间：${new Date().toLocaleString()}`);
  L.push('');

  L.push('## 一、目标金字塔');
  L.push('');
  const byLevel = (lv: string) => goals.filter((g) => g.level === lv && g.status !== 'archived');
  const LV_CN: Record<string, string> = { vision: '愿景', year: '年度', quarter: '季度', week: '周', day: '今日' };
  for (const lv of ['vision', 'year', 'quarter', 'week', 'day']) {
    const items = byLevel(lv);
    if (items.length === 0) continue;
    const lvCN = LV_CN[lv];
    L.push(`### ${lvCN}`);
    for (const g of items) L.push(`- [${g.progress}%] ${g.title}`);
    L.push('');
  }

  L.push('## 二、每日任务');
  L.push('');
  const today = todayStr();
  const todayTasks = tasks.filter((t) => t.scheduledDate === today && !t.parentId);
  for (const t of todayTasks) {
    L.push(`- [${t.status === 'done' ? 'x' : ' '}] (${DOMAIN_LABELS[t.domain]}) ${t.title} · ${t.estMinutes}分钟 · ${t.type === 'deep' ? '深度' : '轻量'}`);
  }
  L.push('');

  L.push('## 三、每日复盘与感受');
  L.push('');
  const recentJournals = [...journals].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
  for (const j of recentJournals) {
    L.push(`### ${j.date} 情绪 ${j.moodScore}/10 · ${(j.moodTags || []).join(',')}`);
    if (j.wins) L.push(`- 做成：${j.wins}`);
    if (j.misses) L.push(`- 未做（原因）：${j.misses}`);
    if (j.feeling) L.push(`- 感受：${j.feeling}`);
    if (j.tomorrowAction) L.push(`- 最小行动：${j.tomorrowAction}`);
    L.push('');
  }

  L.push('## 四、焦虑急救记录');
  L.push('');
  const recentA = [...anxieties].sort((a, b) => b.time - a.time).slice(0, 10);
  for (const a of recentA) {
    L.push(`### ${fmtDate(new Date(a.time))} ${new Date(a.time).toLocaleTimeString()} · ${a.beforeScore} → ${a.afterScore}`);
    if (a.thoughts) L.push(`- 想法：${a.thoughts}`);
    if (a.reframing) L.push(`- 重构：${a.reframing}`);
    if (a.chosenAction) L.push(`- 最小行动：${a.chosenAction}`);
    L.push('');
  }

  L.push('## 五、记账（个人三张表）');
  L.push('');
  L.push(buildLedgerMarkdown(txs));
  L.push('');

  L.push('## 六、习惯清单');
  L.push('');
  const activeHabits = habits.filter((h) => h.active);
  for (const h of activeHabits) {
    L.push(`- ${h.name}（连续 ${h.streak} 天）：锚点「${h.anchor}」最小行动「${h.minimumAction}」`);
  }
  L.push('');

  L.push('## 七、不为清单');
  L.push('');
  for (const s of stops.filter((x) => x.status === 'active')) {
    L.push(`- ${s.text}（原因：${s.reason}，v${s.version}）`);
  }
  L.push('');

  return L.join('\n');
}

// 个人三张表
function buildLedgerMarkdown(txs: { type: string; amount: number; category: string; account: string; note: string; time: number }[]): string {
  const out: string[] = [];
  // 资产负债表（简化为资产/负债科目估算，此处按账户余额呈现）
  const sum = (fn: (t: { type: string; amount: number; category: string; account: string; note: string; time: number }) => number) => txs.reduce((acc, t) => acc + fn(t), 0);
  const income = sum((t) => (t.type === 'income' ? t.amount : 0));
  const expense = sum((t) => (t.type === 'expense' ? t.amount : 0));
  out.push('### 资产负债表（简版）');
  out.push(`- 累计收入（资产）≈ ${income.toFixed(2)}`);
  out.push(`- 累计支出 ≈ ${expense.toFixed(2)}`);
  out.push(`- 净资产 ≈ ${(income - expense).toFixed(2)}`);
  out.push('');
  out.push('### 收支表（当期）');
  out.push(`- 收入：${income.toFixed(2)}`);
  out.push(`- 支出：${expense.toFixed(2)}`);
  out.push(`- 结余：${(income - expense).toFixed(2)}`);
  out.push('');
  out.push('### 现金流量表（流转明细）');
  for (const t of txs.slice(-50)) {
    const sign = t.type === 'income' ? '+' : '-';
    out.push(`- ${new Date(t.time).toLocaleString()} [${t.type}] ${t.category}/${t.account} ${sign}${t.amount.toFixed(2)} ${t.note ? '(' + t.note + ')' : ''}`);
  }
  return out.join('\n');
}

// ===== 立即导出并分享 =====
export async function exportNow(): Promise<{ ok: boolean; message: string }> {
  const markdown = await buildFullLog();
  if (Platform.OS === 'web') {
    return { ok: false, message: 'Web 预览环境暂不支持导出文件，请在 Android 设备上使用。' };
  }
  const dir = FS.documentDirectory + 'logs/';
  await FS.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);
  const file = dir + LOG_NAME;
  await FS.writeAsStringAsync(file, markdown);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file, { mimeType: 'text/markdown', dialogTitle: '导出 life_log.md' });
    return { ok: true, message: `已导出至 ${file}` };
  }
  return { ok: true, message: `已写入 ${file}（当前设备不支持系统分享）` };
}