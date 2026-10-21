// 本地持久化 Repository 层（基于 AsyncStorage，跨 Android/iOS/Web）
// 通过统一的数据访问接口封装，未来可平滑迁移到云同步后端。

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import type {
  Goal, Task, Habit, StopRule, Journal, AnxietyCheckIn, Transaction,
  TimeSlot, AppSettings, AiConfig,
} from './models';
import { DEFAULT_SETTINGS, DEFAULT_AI_CONFIG } from './models';

export function uid(): string {
  return Crypto.randomUUID();
}

const PREFIX = 'rigong:';

async function loadArr<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(PREFIX + key);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

async function saveArr<T>(key: string, items: T[]): Promise<void> {
  await AsyncStorage.setItem(PREFIX + key, JSON.stringify(items));
}

async function loadObj<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(PREFIX + key);
  if (!raw) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
  } catch {
    return fallback;
  }
}

// ===== Goal 仓库 =====
export const goalRepo = {
  list: () => loadArr<Goal>('goals'),
  save: (items: Goal[]) => saveArr('goals', items),
};

// ===== Task 仓库 =====
export const taskRepo = {
  list: () => loadArr<Task>('tasks'),
  save: (items: Task[]) => saveArr('tasks', items),
};

// ===== Habit 仓库 =====
export const habitRepo = {
  list: () => loadArr<Habit>('habits'),
  save: (items: Habit[]) => saveArr('habits', items),
};

// ===== StopRule 仓库 =====
export const stopRepo = {
  list: () => loadArr<StopRule>('stops'),
  save: (items: StopRule[]) => saveArr('stops', items),
};

// ===== Journal 仓库 =====
export const journalRepo = {
  list: () => loadArr<Journal>('journals'),
  save: (items: Journal[]) => saveArr('journals', items),
};

// ===== AnxietyCheckIn 仓库 =====
export const anxietyRepo = {
  list: () => loadArr<AnxietyCheckIn>('anxieties'),
  save: (items: AnxietyCheckIn[]) => saveArr('anxieties', items),
};

// ===== Transaction 仓库 =====
export const txRepo = {
  list: () => loadArr<Transaction>('transactions'),
  save: (items: Transaction[]) => saveArr('transactions', items),
};

// ===== TimeSlot 仓库 =====
export const slotRepo = {
  list: () => loadArr<TimeSlot>('slots'),
  save: (items: TimeSlot[]) => saveArr('slots', items),
};

// ===== Settings / AiConfig =====
export const settingsRepo = {
  get: () => loadObj<AppSettings>('settings', DEFAULT_SETTINGS),
  set: (s: AppSettings) => AsyncStorage.setItem(PREFIX + 'settings', JSON.stringify(s)),
};

export const aiConfigRepo = {
  get: () => loadObj<AiConfig>('aiconfig', DEFAULT_AI_CONFIG),
  set: (c: AiConfig) => AsyncStorage.setItem(PREFIX + 'aiconfig', JSON.stringify(c)),
};

// ===== 预置默认时间方案 =====
export const DEFAULT_SLOTS: TimeSlot[] = [
  { id: 'wd-light', weekdays: [1, 2, 3, 4, 5], start: '19:00', end: '20:30', kind: 'light', enabled: true },
  { id: 'wd-deep', weekdays: [1, 2, 3, 4, 5], start: '20:30', end: '22:00', kind: 'deep', enabled: true },
  { id: 'wd-review', weekdays: [1, 2, 3, 4, 5], start: '22:00', end: '22:30', kind: 'review', enabled: true },
  { id: 'we-morning', weekdays: [6, 0], start: '09:30', end: '12:00', kind: 'deep', enabled: true },
  { id: 'we-afternoon', weekdays: [6, 0], start: '14:00', end: '18:00', kind: 'deep', enabled: true },
  { id: 'we-review', weekdays: [6, 0], start: '19:30', end: '22:30', kind: 'review', enabled: true },
];

// 首次启动写入默认时间方案与示例数据（目标金字塔 / 习惯 / 不为清单）
export async function ensureDefaults(): Promise<void> {
  const slots = await slotRepo.list();
  if (slots.length === 0) {
    await slotRepo.save(DEFAULT_SLOTS);
  }

  const goals = await goalRepo.list();
  if (goals.length === 0) {
    const now = Date.now();
    const seedGoals: Goal[] = [
      { id: seg('g-v'), parentId: null, level: 'vision', title: '成为专注而从容的长期主义者', progress: 15, status: 'active', createdAt: now, updatedAt: now },
      { id: seg('g-y'), parentId: seg('g-v'), level: 'year', title: '本年度完成 4 个重要项目并保持健康作息', progress: 20, status: 'active', createdAt: now, updatedAt: now },
      { id: seg('g-q'), parentId: seg('g-y'), level: 'quarter', title: '本季度建立稳定的晨间深度工作习惯', progress: 40, status: 'active', createdAt: now, updatedAt: now },
      { id: seg('g-w'), parentId: seg('g-q'), level: 'week', title: '本周完成关键里程碑并保证睡眠', progress: 30, status: 'active', createdAt: now, updatedAt: now },
    ];
    await goalRepo.save(seedGoals);
  }

  const habits = await habitRepo.list();
  if (habits.length === 0) {
    await habitRepo.save([
      { id: seg('h-med'), name: '晨间阅读 20 分钟', anchor: '起床后走进阳台前', minimumAction: '翻开昨夜晚读到的一页', environmentSetup: '书放在餐桌显眼处，手机留在卧室', fallbackVersion: '读 3 段就达标', streak: 6, active: true, lastCheckedDate: null },
      { id: seg('h-walk'), name: '晚饭后散步', anchor: '晚餐结束放筷后', minimumAction: '出门走 10 分钟', environmentSetup: '跑鞋放在玄关', fallbackVersion: '原地拉伸 5 分钟', streak: 3, active: true, lastCheckedDate: null },
    ]);
  }

  const stops = await stopRepo.list();
  if (stops.length === 0) {
    const now = Date.now();
    await stopRepo.save([
      { id: seg('s-snack'), text: '刷短视频超过 20 分钟', reason: '时间黑洞且易引发焦虑', category: '时间', version: 1, status: 'active', createdAt: now, updatedAt: now },
      { id: seg('s-bed'), text: '23:00 后继续处理工作消息', reason: '会推迟入睡并影响第二天专注', category: '健康', version: 1, status: 'active', createdAt: now, updatedAt: now },
      { id: seg('s-junk'), text: '深夜报复性吃零食', reason: '情绪性进食而非真饿', category: '情绪', version: 1, status: 'active', createdAt: now, updatedAt: now },
    ]);
  }
}

function seg(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}