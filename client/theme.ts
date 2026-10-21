// 日拱（Habit AI）设计 Token 常量
// 与 global.css 中定义的主题保持一致，供 RN 组件直接引用精确色值

export const C = {
  primary: '#2F6E63',
  primarySoft: '#E4EEEA',
  accent: '#C8823A',
  accentSoft: '#F6EAD9',
  background: '#F6F4EF',
  surface: '#FFFFFF',
  text: '#20261F',
  muted: '#6B7268',
  border: '#E7E3DA',
  complete: '#3E8C6A',
  warn: '#C2684F',
  info: '#5B7FA6',
  white: '#FFFFFF',
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

export const FONT = {
  body: 15,
  caption: 13,
  small: 12,
};