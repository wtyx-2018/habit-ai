import type { Domain } from '@/theme';

// ===== 数据模型（集中管理，便于未来云同步）=====

export type GoalLevel = 'vision' | 'year' | 'quarter' | 'week' | 'day';
export type TaskType = 'light' | 'deep';
export type TaskStatus = 'todo' | 'done' | 'skipped';

export interface Goal {
  id: string;
  parentId: string | null;      // 上级目标，null 表示愿景
  level: GoalLevel;
  title: string;
  progress: number;             // 0 - 100
  status: 'active' | 'done' | 'archived';
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  title: string;
  domain: Domain;
  goalId: string | null;        // 关联子任务/上级目标
  estMinutes: number;           // 5 - 30
  type: TaskType;               // 轻量 / 深度
  status: TaskStatus;
  parentId: string | null;      // 主任务 -> 子任务
  scheduledDate: string | null; // YYYY-MM-DD
  scheduledSlot: string | null; // 对应时段 id
  createdAt: number;
}

export interface Habit {
  id: string;
  name: string;
  anchor: string;               // 触发锚点
  minimumAction: string;        // 最小行动
  environmentSetup: string;     // 环境预置
  fallbackVersion: string;      // 降级版本
  streak: number;               // 连续天数
  active: boolean;
  lastCheckedDate: string | null;
}

export interface StopRule {
  id: string;
  text: string;
  reason: string;
  category: string;
  version: number;              // 修订版本
  status: 'active' | 'archived';
  createdAt: number;
  updatedAt: number;
  history?: { text: string; reason: string; updatedAt: number }[];
}

export interface Journal {
  id: string;
  date: string;                 // YYYY-MM-DD
  wins: string;                 // 做成了什么
  misses: string;               // 没做完的客观原因
  moodTags: string[];
  moodScore: number;            // 1-10
  feeling: string;
  tomorrowAction: string;       // 给明天的一个最小行动
}

export interface AnxietyCheckIn {
  id: string;
  date: string;
  time: number;                 // 时间戳
  beforeScore: number;          // 1-10
  thoughts: string;
  reframing: string;
  afterScore: number;
  chosenAction: string;
}

export type TxType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  time: number;
  date: string;                 // YYYY-MM-DD
  type: TxType;
  amount: number;
  category: string;
  account: string;
  note: string;
}

export type SlotKind = 'light' | 'deep' | 'review';

export interface TimeSlot {
  id: string;
  weekdays: number[];           // 0=周日 ... 6=周六
  start: string;                // "19:00"
  end: string;
  kind: SlotKind;
  enabled: boolean;
}

// 记账预置分类与账户
export const LEDGER_CATEGORIES = {
  income: ['工资', '副业', '理财', '其它收入'],
  expense: ['餐饮', '交通', '居家', '娱乐', '学习', '健康', '人情', '其它支出'],
};

export const LEDGER_ACCOUNTS = ['现金', '储蓄卡', '信用卡', '电子钱包'];

export const MOOD_TAGS = ['平静', '充实', '疲惫', '焦虑', '迷茫', '开心', '低落', '专注'];

export interface AppSettings {
  notifTasks: boolean;
  notifSlots: boolean;
  notifReview: boolean;
  notifHabit: boolean;
  notifLedger: boolean;
  notifReport: boolean;
  sound: boolean;
  vibrate: boolean;
  silentMode: boolean;
  exportFrequency: 'off' | 'daily' | 'weekly';
  lastExportedAt: number;
}

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  notifTasks: true,
  notifSlots: true,
  notifReview: true,
  notifHabit: true,
  notifLedger: true,
  notifReport: true,
  sound: true,
  vibrate: true,
  silentMode: false,
  exportFrequency: 'weekly',
  lastExportedAt: 0,
};

export const DEFAULT_AI_CONFIG: AiConfig = {
  baseUrl: '',
  apiKey: '',
  model: '',
};