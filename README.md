# 日拱（Habit AI）

一款 **Android 优先、本地优先（local-first）、无账号无云后端** 的个人习惯设计 App，把大目标拆成 5–30 分钟、能立即开始的小动作，并通过打卡、环境设计、每日复盘、记账（个人三张表）、不为清单与 AI 定期梳理/审计/激励，缓解焦虑、对齐长期方向、增强元认知。

## 技术栈

- 前端：Expo 54 + React Native + TypeScript（Expo Router，5-Tab 底部导航）
- 本地持久化：AsyncStorage 封装的 Repository 层（`client/lib/db.ts`，数据模型集中在 `client/lib/models.ts`，便于未来迁移云同步）
- 本地通知：`expo-notifications`（Android 通知渠道、定时/重复提醒、通知权限请求与引导去系统设置）
- Markdown 导出：`expo-file-system` + `expo-sharing`，增量追加写入 `life_log.md`
- AI（可选）：OpenAI 兼容 HTTP 接口，`base_url / api_key / model` 存储在本地安全存储 `expo-secure-store`；无 Key 或离线时自动使用**纯本地模板化降级**，不阻塞功能
- 主题：深青绿 + 暖琥珀、暖米白背景、圆角卡片（见 `client/theme.ts` 与 `client/global.css`）

## 快速开始

```bash
cd /workspace/projects/client
npm install        # 或 pnpm install
npx expo start
# 按 a 打开 Android 模拟器，或 m 扫码用 Expo Go；Web: npx expo start --web
```

> 说明：本应用**完全本地**，无需启动后端服务器即可使用全部功能（模板自带的最小 Express 服务仅作环境健康检查）。本地数据保存在设备 AsyncStorage，清除应用数据即重置。

## 页面结构（底部 5 Tab）

| Tab | 名称 | 内容 |
|-----|------|------|
| 今日 | Today | 问候与今晚可用时长、连续/已完成/方向对齐概览、焦虑急救入口、今晚时段条（轻量/深度/复盘）、5–30 分钟子任务（领域标签/时长/关联目标/圆形打卡）、今晚「不为」提醒、右下 FAB 新建任务 |
| 目标 | Goals | 目标金字塔（愿景→年度→季度→周→今日）层级展示、进度、方向对齐率、添加/编辑下级目标 |
| 习惯 | Habits | 习惯五要素（触发锚点/最小行动/环境预置/降级版本/连续天数）、完整或降级打卡、断链不追责 |
| 记录 | Journal | 每日复盘+感受（做成/没做到客观原因/情绪标签+1–10+感受文本/明天最小行动）、不为清单轮换提醒、AI 周报入口、焦虑急救记录 |
| 我的 | Profile | 记账（个人三张表：资产负债表/收支表/现金流量表）、时间方案、通知、AI 配置、Markdown 导出、隐私说明 |

Stack 页（从各 Tab 进入）：任务录入+AI 拆解、焦虑急救四步、记账+三张表、不为清单管理、AI 周报、时间方案、通知、LLM 配置、导出。

## 配置说明

### 1. 配置 AI（LLM）

进入「我的 → AI 配置」，填写：
- **Base URL**：如 `https://api.openai.com/v1` 或任意 OpenAI 兼容服务的基地址
- **API Key**：你的密钥（保存于系统安全存储）
- **Model**：如 `gpt-4o-mini` / `deepseek-chat` / `kimi` 等

用于：任务 AI 拆解、焦虑急救的苏格拉底式追问重构、AI 周报（梳理/审计/激励）。
**未配置或无网络时**：任务拆解、焦虑急救自动走「本地模板化降级」，仍可正常使用，不会阻断流程。

### 2. 打开通知权限

- 首次启动会自动向你请求通知权限。
- 若未授权：进入「我的 → 通知」，点击「打开系统设置」跳转到系统通知设置，为「日拱」开启通知并允许提醒（Notifications / Alerts）。
- 六类通知开关（任务派发、时段开始、复盘、习惯、记账、周报）、声音/震动、静默勿扰均可单独配置；可「发一条测试通知」验证，并设置工作日 18:30 / 周末 09:30 / 复盘 22:00 等提醒时间。
- Android 通知渠道随应用启动自动建立（`daily` 默认渠道）。

### 3. 导出 Markdown（life_log.md）

进入「我的 → 导出」：
- **立即导出**：把目标金字塔、每日任务/复盘/感受、记账（含三张表汇总）、习惯、不为清单、焦虑急救记录、AI 分析**增量追加**写入 `life_log.md`（不覆盖历史），并通过系统分享面板导出/分享到文件、网盘等。
- **自动导出频率**：可选关闭 / 每天 / 每周（导出文件保存在应用文档目录）。
- 导出的频率提醒与周报提醒共用通知开关「周报」。

## 数据模型（集中管理）

`Goal` / `Task`（主任务可 `parentId` 关联子任务，`type` 分 light/deep）/ `Habit` / `StopRule`（只修订归档不物理删除，含版本历史）/ `Journal` / `AnxietyCheckIn` / `Transaction`（income/expense/transfer）/ `TimeSlot`（工作日/周末双轨、逐星期几微调、light/deep/review、开关）/ `AppSettings` / `AiConfig`。

## 范围边界（V1.0）

- 仅本地 Android 优先；无账号、无社交、无云同步后端。
- 记账为本地个人记录，非真实支付。
- 焦虑急救为自助心理工具，**非医疗建议**；严重情况请寻求专业帮助。
- 应用锁与自动云备份列入 V1.1 占位。

## 设计主题

固定亮色、暖米白背景（`#F6F4EF`）。
- Primary `#2F6E63`、Accent `#C8823A`、完成 `#3E8C6A`、警示 `#C2684F`、信息 `#5B7FA6`
- 领域色：运动 `#3E8C6A`、开发 `#3E6FA8`、学习 `#8A6BB1`、工作 `#B0823E`、其他 `#7C8579`
- 卡片圆角 16、控件 12、胶囊 999；正文 15；系统字体；已适配 Android 安全区 inset。
```