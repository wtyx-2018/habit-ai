// 本地通知服务：Android 通知渠道、权限请求、定时/重复通知、测试通知、引导去系统设置
import * as Notifications from 'expo-notifications';
import { Platform, Linking, Alert, AppState } from 'react-native';
import { settingsRepo } from '@/lib/db';
import type { TimeSlot } from '@/lib/models';
import { parseTimeHHMM, weekdayCN } from '@/lib/utils';

let handlerSet = false;

// 启动时设置通知处理器（必须）
export function configureNotifications(): void {
  if (handlerSet) return;
  handlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function setupAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const { silentMode } = await settingsRepo.get();
  const importance = silentMode
    ? Notifications.AndroidImportance.LOW
    : Notifications.AndroidImportance.DEFAULT;
  await Notifications.setNotificationChannelAsync('daily', {
    name: '日拱提醒',
    importance,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
    enableVibrate: !silentMode,
    bypassDnd: true,
  }).catch(() => undefined);
}

// 请求通知权限；未授权时引导去系统设置
export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'unavailable'> {
  if (Platform.OS === 'web') return 'unavailable';
  configureNotifications();
  await setupAndroidChannels();
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return 'granted';
  const req = await Notifications.requestPermissionsAsync();
  if (req.granted) return 'granted';
  return 'denied';
}

export function openSystemSettings(): void {
  Linking.openSettings().catch(() => undefined);
}

// 发送一条测试通知
export async function sendTestNotification(): Promise<void> {
  if (Platform.OS === 'web') {
    Alert.alert('通知', 'Web 预览环境不支持本地通知，请在 Android 设备上测试。');
    return;
  }
  await Notifications.scheduleNotificationAsync({
    content: { title: '日拱 · 测试通知', body: '通知通道已就绪，今晚记得安排一个小动作。' },
    trigger: null,
  });
}

// 一次性提醒（立即 + N 秒后）
export async function scheduleInSeconds(title: string, body: string, seconds = 3): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
  });
}

// 根据设置与时间方案调度每日重复提醒，并取消旧的
export async function rescheduleAll(slots: TimeSlot[]): Promise<void> {
  if (Platform.OS === 'web') return;
  configureNotifications();
  await setupAndroidChannels();
  const s = await settingsRepo.get();
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);

  const times: { hour: number; minute: number; title: string; body: string }[] = [];

  if (s.notifSlots) {
    // 时段开始提醒（取每个时段开始时间）
    const seen = new Set<string>();
    for (const slot of slots) {
      if (!slot.enabled) continue;
      const t = parseTimeHHMM(slot.start);
      const key = `${t}`;
      if (seen.has(key)) continue;
      seen.add(key);
      times.push({
        hour: Math.floor(t / 60),
        minute: t % 60,
        title: '时段开始',
        body: `${weekdayCN(new Date().getDay())}·${slot.kind === 'deep' ? '深度' : slot.kind === 'review' ? '复盘' : '轻量'}时段：安排一个 5-30 分钟小动作吧。`,
      });
    }
  }
  // 提醒时间默认：工作日 18:30 / 周末 09:30 / 复盘 22:00
  if (s.notifTasks) {
    const wd = new Date().getDay();
    const isWeekend = wd === 0 || wd === 6;
    times.push({
      hour: isWeekend ? 9 : 18,
      minute: isWeekend ? 30 : 30,
      title: '今晚安排',
      body: '花一分钟，为今晚挑一个能立即开始的小动作。',
    });
  }
  if (s.notifReview) {
    times.push({ hour: 22, minute: 0, title: '每日复盘', body: '今天做成了什么？给明天留一个最小行动。' });
  }
  if (s.notifHabit) {
    times.push({ hour: 20, minute: 30, title: '习惯环境', body: '检查一下今天要维持的习惯锚点，环境预置好了吗？' });
  }

  for (const t of times) {
    await Notifications.scheduleNotificationAsync({
      content: { title: t.title, body: t.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: t.hour,
        minute: t.minute,
        channelId: 'daily',
      },
    }).catch(() => undefined);
  }
}

// 应用回到前台时若权限变化则提示
export function watchPermission(listener: (status: string) => void): () => void {
  if (Platform.OS === 'web') return () => undefined;
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      Notifications.getPermissionsAsync().then((p) => listener(p.granted ? 'granted' : 'denied'));
    }
  });
  return () => sub.remove();
}