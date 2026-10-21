// 日拱（Habit AI）设计 Token 常量 —— 纸感极简 / 柔和禅意
// 与 global.css 中的主题保持一致，供 RN 组件直接引用精确色值

export const C = {
  bgPage: '#F7F4ED',      // 页面米底
  bgCard: '#FBF9F4',      // 卡片底（比页面更浅）

  text: '#2D2B26',        // 主标题/正文（不纯黑）
  muted: '#75726B',       // 次要说明
  placeholder: '#A9A59D', // 输入框占位/最弱文字

  primary: '#3A7D6A',     // 主品牌（保存/新增/主按钮/正向打卡）
  primarySoft: '#E6EFEB', // 主色浅底

  tipWarm: '#C87941',     // 暖提示（仅焦虑/温和提醒，少量）
  tipWarmSoft: '#F7EDE2', // 暖提示浅底

  // 层级语义色（绑定愿景/年度/季度/周）
  vision: '#5C5470',      // 愿景｜灰紫
  year: '#4A6F82',        // 年度｜灰蓝
  quarter: '#3A7D6A',     // 季度｜主绿
  week: '#B47C58',        // 周｜暖棕

  // 兼容字段（旧组件引用，映射到柔和色系）
  background: '#F7F4ED',
  surface: '#FBF9F4',
  border: '#EAE6DD',      // 极淡分割线
  divider: '#EAE6DD',
  complete: '#3A7D6A',    // 正向完成（复用主色）
  warn: '#C87941',        // 温和提醒（非警示红）
  info: '#6A7C73',        // 柔和灰绿
  accent: '#C87941',      // 强调操作（暖提示，替代橙色）
  accentSoft: '#F7EDE2',
  white: '#FFFFFF',
};

// 金字塔层级色（固化绑定）
export const GOAL_LEVEL_COLORS: Record<string, string> = {
  vision: '#5C5470',
  year: '#4A6F82',
  quarter: '#3A7D6A',
  week: '#B47C58',
};

// 领域色
export const DOMAIN_COLORS: Record<Domain, string> = {
  sport: '#3E8C6A',
  dev: '#3E6FA8',
  learn: '#8A6BB1',
  work: '#B0823E',
  other: '#7C8579',
};

export type Domain = 'sport' | 'dev' | 'learn' | 'work' | 'other';

export const DOMAIN_LABELS: Record<Domain, string> = {
  sport: '运动',
  dev: '开发',
  learn: '学习',
  work: '工作',
  other: '其他',
};

export const DOMAIN_KEYS: Domain[] = ['sport', 'dev', 'learn', 'work', 'other'];

// 圆角
export const RADIUS = {
  card: 16,
  control: 12,
  pill: 999,
};

// 卡片内边距（上下 20 / 左右 18）
export const CARD_PAD = { paddingVertical: 20, paddingHorizontal: 18 };
// 卡片间距
export const CARD_GAP = 16;

// 极浅柔和软阴影
export const CARD_SHADOW = {
  shadowColor: '#2D2B26',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 1,
};

export const FONT = {
  body: 15,
  caption: 13,
  small: 12,
};