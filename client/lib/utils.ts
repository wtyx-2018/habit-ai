import type { TimeSlot, Task } from '@/lib/models';

// ===== 日期工具（基于本机时区，返回 YYYY-MM-DD）=====
export function todayStr(): string {
  const d = new Date();
  return fmtDate(d);
}

export function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayWeekday(): number {
  return new Date().getDay(); // 0=周日
}

const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function weekdayCN(w: number): string {
  return WEEKDAY_CN[w];
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 12) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

// ===== 时间字符串工具 =====
export function parseTimeHHMM(s: string): number {
  const [h, m] = s.split(':').map((x) => Number(x));
  return (h || 0) * 60 + (m || 0);
}

export function slotDurationMinutes(s: TimeSlot): number {
  return parseInt((parseTimeHHMM(s.end) - parseTimeHHMM(s.start)).toFixed(0), 10);
}

// 当天时段（匹配今天星期几）
export function slotsForToday(slots: TimeSlot[]): TimeSlot[] {
  const w = todayWeekday();
  return slots.filter((s) => s.enabled && s.weekdays.includes(w));
}

const KIND_CN: Record<string, string> = { light: '轻量', deep: '深度', review: '复盘' };
export function kindCN(kind: string): string {
  return KIND_CN[kind] || kind;
}

// ===== 派发规则：把任务排入当天合适的时段 =====
// 规则：任务类型 × 时段 × 时长匹配；深度任务优先周末上午；
// 工作日晚上只放 ≤20 分钟轻量任务；超容量顺延到下一个合适时段。
export function dispatchToSlots(task: Task, slots: TimeSlot[]): TimeSlot | null {
  const w = todayWeekday();
  const isWeekend = w === 0 || w === 6;
  const candidates = slots.filter((s) => s.enabled && s.weekdays.includes(w));
  if (candidates.length === 0) return null;

  const sorted = [...candidates].sort((a, b) => parseTimeHHMM(a.start) - parseTimeHHMM(b.start));

  // 周末优先上午深度时段
  const prefer = (s: TimeSlot) => {
    let score = 0;
    if (task.type === 'deep' && s.kind === 'deep') score += 100;
    if (task.type === 'light' && s.kind === 'light') score += 80;
    if (task.type === 'light' && s.kind === 'deep') score += 20;
    if (s.kind === 'deep') score += 30;
    // 深度优先上午（早于 13:00）
    if (s.kind === 'deep' && parseTimeHHMM(s.start) < 13 * 60) score += 40;
    // 工作日晚上限制：浅任务 ≤ 20 分钟
    if (!isWeekend && task.estMinutes > 20) {
      if (s.kind === 'light' || s.kind === 'review') score -= 200;
    }
    return score;
  };

  const ordered = [...sorted].sort((a, b) => prefer(b) - prefer(a));
  // 容量判断：时段时长需至少容纳任务时长（估计）
  const fit = ordered.find((s) => slotDurationMinutes(s) >= task.estMinutes);
  return fit || (ordered.length > 0 ? ordered[0] : null);
}

export function formatMinutes(m: number): string {
  return `${m} 分钟`;
}

export function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}