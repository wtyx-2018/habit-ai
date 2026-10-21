// LLM Service — OpenAI 兼容接口（base_url / api_key / model 本地安全存储）
// 无 Key 或离线时走纯本地模板化降级方案，不阻塞使用。

import { aiConfigRepo } from '@/lib/db';
import type { AiConfig, TaskType } from '@/lib/models';

// ===== 安全存储（原生用 SecureStore，Web 回退 AsyncStorage）=====
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SECURE_KEY = 'rigong:ai';

export async function loadAiConfig(): Promise<AiConfig> {
  if (Platform.OS !== 'web') {
    try {
      const raw = (await SecureStore.getItemAsync(SECURE_KEY)) as string | null;
      if (raw) return { ...(await aiConfigRepo.get()), ...JSON.parse(raw) };
    } catch {
      /* fallthrough */
    }
  }
  return aiConfigRepo.get();
}

export async function saveAiConfig(cfg: AiConfig): Promise<void> {
  if (Platform.OS !== 'web') {
    try {
      await SecureStore.setItemAsync(SECURE_KEY, JSON.stringify(cfg));
    } catch {
      /* fallthrough */
    }
  }
  await aiConfigRepo.set(cfg);
}

export async function hasAiConfigured(): Promise<boolean> {
  const cfg = await loadAiConfig();
  return !!(cfg.apiKey && cfg.baseUrl && cfg.model);
}

// ===== 通用对话 =====
export async function chatCompletion(
  system: string,
  user: string,
  temperature = 0.6,
): Promise<string> {
  const cfg = await loadAiConfig();
  if (!cfg.apiKey || !cfg.baseUrl) {
    throw new Error('尚未配置 LLM（请在"设置 → LLM"中填写接口地址与密钥）');
  }
  const base = cfg.baseUrl.replace(/\/+$/, '');
  const endpoint = /\/v\d+$/i.test(base) ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`LLM 接口错误 ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('LLM 未返回内容');
  return content;
}

// ===== AI 任务拆解 =====
export interface SubtaskPlan {
  title: string;
  minutes: number;
  type: TaskType;
}

export async function breakDownTask(input: string, domain: string): Promise<SubtaskPlan[]> {
  const system =
    '你是一位温和的经验主义者，擅长把一个 5-30 分钟的 "足够小、能立即开始的行动" 拆成有序的执行步骤。' +
    '输出必须是合法 JSON 数组，每项格式 {"title":"步骤标题","minutes":数字5-30,"type":"light"|"deep"}。' +
    '步骤 3-6 个，总时长控制在 30 分钟内。只输出 JSON，不要解释。';
  const user = `请把下面这个任务/想法拆成 5-30 分钟的小动作（领域：${domain}）：\n${input}`;
  try {
    const raw = await chatCompletion(system, user, 0.5);
    const json = extractJson(raw);
    const arr = JSON.parse(json) as SubtaskPlan[];
    return arr
      .map((x) => ({
        title: String(x.title ?? '').slice(0, 60),
        minutes: Math.max(5, Math.min(30, Number(x.minutes) || 15)),
        type: (x.type === 'deep' ? 'deep' : 'light') as TaskType,
      }))
      .filter((x) => x.title)
      .slice(0, 6);
  } catch {
    return localBreakDown(input);
  }
}

function extractJson(s: string): string {
  const m = s.match(/\[[\s\S]*\]/);
  return m ? m[0] : s;
}

// 本地模板化拆解（离线兜底）
export function localBreakDown(input: string): SubtaskPlan[] {
  const steps = [
    `拆解"${input.slice(0, 20)}"：先厘清目标与产出`,
    `列出达成目标需要的 2-3 个关键动作`,
    '从最小、可立即开始的一个动作入手',
    '设定本轮专注时长并启动计时',
  ];
  // 取前几步填充分钟数
  const plans: SubtaskPlan[] = steps.map((t, i) => ({
    title: t,
    minutes: i === 0 ? 5 : 10,
    type: i < 2 ? ('light' as TaskType) : ('deep' as TaskType),
  }));
  return plans.slice(0, 4);
}

// ===== 焦虑急救：苏格拉底式追问重构 =====
export async function reframeThoughts(
  thoughts: string,
  score: number,
): Promise<{ reframe: string; questions: string[] }> {
  const system =
    '你是一位温和、非评判的苏格拉底式思考伙伴。你会用提问帮助对方看见自动化的负面念头，' +
    '并温和地给出更平衡的视角。你不是医生，只做认知重构，不诊断不治疗。语气平静简短。';
  const user = `我此刻比较焦虑（1-10 分给 ${score} 分）。我脑子里的想法是：\n${thoughts}\n请：1) 提出 2-3 个温和的追问；2) 帮我把这个想法改写成一个更平衡、可行动的说法。`;
  try {
    const raw = await chatCompletion(system, user, 0.7);
    return { reframe: raw, questions: [] };
  } catch {
    return localReframe(thoughts, score);
  }
}

export function localReframe(thoughts: string, _score: number): { reframe: string; questions: string[] } {
  return {
    questions: [
      '这件事最坏会怎样？发生的概率有多大？',
      '如果是好朋友遇到同样的事，你会对他说什么？',
      '现在我能改变的、最小的一件事是什么？',
    ],
    reframe:
      '这个想法更多是"对未来的担心"，而不是眼前的事实。你先不急着消灭它，只需要做一件 5 分钟就能启动的小事，让身体动起来，念头就会松动。',
  };
}

// ===== AI 周报 =====
export async function weeklyReport(
  context: string,
): Promise<{ summary: string; audit: string; motivate: string }> {
  const system =
    '你是一位温和又敢追问的个人教练，基于用户一段时间的真实记录输出周报。分三部分：' +
    '[梳理] 完成情况、领域分布、习惯维持；' +
    '[审计] 目标偏离、时间方案问题、财务/情绪潜在关联（敢追问、有依据）；' +
    '[激励] 基于用户画像给出个性化、具体的鼓励。语言温和、克制、不鸡汤。';
  try {
    const raw = await chatCompletion(system, context, 0.7);
    return parseReport(raw);
  } catch {
    return parseReport(localReport(context));
  }
}

function parseReport(raw: string): { summary: string; audit: string; motivate: string } {
  // 按小节标题切分（支持 [梳理]【梳理】(梳理) 等写法），无需正则转义
  const MARKERS = ['梳理', '审计', '激励'];
  const findSection = (label: string): string => {
    const startIndex = raw.indexOf(label);
    if (startIndex < 0) return '';
    const after = raw.slice(startIndex + label.length);
    // 找到下一个小节标题
    let endIndex = after.length;
    for (const next of MARKERS) {
      const idx = after.indexOf(next);
      if (idx >= 0 && (endIndex === after.length || idx < endIndex)) endIndex = idx;
    }
    return after.slice(0, endIndex).replace(/\n/g, ' ').trim().slice(0, 400);
  };
  return {
    summary: findSection('梳理') || raw.replace(/\n/g, ' ').slice(0, 200),
    audit: findSection('审计'),
    motivate: findSection('激励'),
  };
}

export function localReport(ctx: string): string {
  return (
    '[梳理]\n' +
    `过去这段时间你累计记录了：\n${ctx.slice(0, 300)}\n` +
    '你保持了记录与行动的习惯，这本身值得肯定。\n' +
    '[审计]\n' +
    '可以追问：有多少精力投入在真正对齐长期方向的目标上？工作日晚上是否塞进了过重的任务？焦虑评分高的日子，是否伴随某些支出或没睡好？\n' +
    '[激励]\n' +
    '你不必追求每天完美，只需让每个晚上都有一个 5 分钟的小动作落地。把注意力从"我要完成多少"收回到"今天启动哪一件"，焦虑就会让位给踏实。'
  );
}