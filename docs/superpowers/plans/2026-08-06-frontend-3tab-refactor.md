# 前端 3 Tab 游戏基地重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 2068 行的 `App.tsx` 拆分为按 Tab 组织的多组件结构，落地移动端优先的底部 3 Tab 导航（土豆基地/今日/设置），实现触控双轨（手机长按排序 + 跨天移动菜单），桌面端保留 HTML5 拖拽。

**Architecture:** 纯前端重构（不新增后端命令、不改数据库）。`App.tsx` 只保留全局状态、数据加载与布局接线；类型/常量/纯函数抽到 `src/lib/`，组件抽到 `src/components/`。布局改为「顶部内容区 + 底部固定 TabBar」，移动端优先（`safe-area-inset-bottom`），桌面内容区 `max-w` 居中。拖拽双轨：桌面保留现有 HTML5 DnD；触屏设备改用 `@atlaskit/pragmatic-drag-and-drop` 的 touch 传感器（长按 0.5s 进入排序模式），跨天移动用长按弹出菜单。

**Tech Stack:** React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4 + Radix UI（`@radix-ui/react-dropdown-menu` 已装）+ `@atlaskit/pragmatic-drag-and-drop`（已装，当前未使用）

## Global Constraints

- **移动端优先**：底部 3 Tab（土豆基地/今日/设置）替代桌面侧边栏；底部 TabBar 加 `pb-[env(safe-area-inset-bottom)]`
- **触控双轨**：手机长按 0.5s → 进入排序模式（`@atlaskit/pragmatic-drag-and-drop` touch 支持）；跨天移动 = 长按 → 弹出菜单选目标日（Radix 菜单）；桌面保留现有 HTML5 拖拽
- **桌面适配**：同一布局横向适配（内容区居中），不单独做侧边栏（spec 7.2）
- **App 只用 `useState` + `useRef` + `invoke`**；不要添加路由、query hooks 或 Zustand store（`main.tsx` 已有初始化但不用）
- **无新依赖**：所有用到的库已在 `package.json`（Radix DropdownMenu、pragmatic-drag-and-drop、lucide-react）
- **TypeScript 严格项**：`verbatimModuleSyntax` → 类型导入必须 `import type { ... }`；`noUnusedLocals/noUnusedParameters` → 不允许任何未使用变量/参数；`erasableSyntaxOnly` → 不允许 `enum`
- **注释/commit 全程中文**，commit 前缀 `feat:` / `fix:` / `chore:` / `refactor:`
- **验收基线**：每个任务结束 `pnpm build`（tsc -b && vite build）+ `pnpm lint` 必须通过；行为不变（纯移动任务）
- **行号说明**：任务中所有行号引用的是**重构前的原始 App.tsx**（Task 1 删除代码后行号会偏移）。定位组件/函数一律用 grep 按名称找（如 `rg "function NoteCard" src/App.tsx`），行号仅供参考
- **export 约定**：lib 文件与组件文件统一 **named export + named import**（`import { NoteCard } from './components/NoteCard'`）；现有 `DescriptionEditor` 是 default export，保持不动
- **范围外（归计划 C，本计划不做）**：宠物系统 UI（土豆基地场景/宠物面板/商城/成长中心）、功能精简（砍标签系统/项目→轻量场景/砍富文本/砍子任务/搜索弱化图标入口）

---

### Task 1: 抽取类型、常量与纯函数到 lib/

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/constants.ts`
- Create: `src/lib/utils.ts`
- Create: `src/lib/theme.ts`
- Modify: `src/App.tsx`（删除被抽走的定义，改为 import）

**Interfaces:**
- Consumes: 无（从 App.tsx 原样搬移）
- Produces: 以下导出供后续所有任务使用：

```ts
// src/lib/types.ts（全部为 type-only 导出）
export interface Tag { name: string; color: string }
export interface Subtask { id: string; text: string; done: boolean }
export interface Item { id: string; text: string; description: string; start: string; end: string; done: boolean; priority: string; tags: Tag[]; subtasks: Subtask[]; repeat: string }
export interface Card { id: string; title: string; date: string | null; items: Item[] }
export interface Project { id: string; name: string; color: string; sort_order: number }
export interface ProjectTag { id: string; project_id: string; name: string; color: string }
export interface ThemePreset { id: string; label: string; accent: string; light: Record<string, string>; dark: Record<string, string> }

// src/lib/constants.ts（普通导出）
export const PROJECT_COLORS: string[]  // 原 App.tsx:1013
export const CARD_COLORS: string[]     // 原 App.tsx:699

// src/lib/utils.ts（普通导出）
export function hexToRgb(hex: string): string            // 原 App.tsx:51-54
export function darken(hex: string, amt: number): string // 原 App.tsx:56-62
export function calcMinutes(start: string, end: string): number   // 原 App.tsx:210-216
export function formatDuration(min: number): string      // 原 App.tsx:218-225
export function timeToMinutes(t: string): number         // 原 App.tsx:227-231
export function genId(): string                          // 原 App.tsx:233-235
export function formatDateLabel(d: string): string       // 原 App.tsx:701-709

// src/lib/theme.ts
import type { ThemePreset } from './types'
export const THEME_PRESETS: ThemePreset[]   // 原 App.tsx:72-193（5 个预设，一个不落）
export function applyTheme(presetId: string, accent: string, isDark: boolean): void  // 原 App.tsx:195-208
```

- [ ] **Step 1: 创建 `src/lib/types.ts`**，内容 = 原 App.tsx:6-49 的 7 个 interface + 原 64-70 的 `ThemePreset`（逐字搬移，仅补 `export`）
- [ ] **Step 2: 创建 `src/lib/constants.ts`**，内容 = 原 App.tsx:699 的 `CARD_COLORS` + 原 1013 的 `PROJECT_COLORS`（逐字搬移，补 `export`）
- [ ] **Step 3: 创建 `src/lib/utils.ts`**，内容 = `hexToRgb`/`darken`/`calcMinutes`/`formatDuration`/`timeToMinutes`/`genId`/`formatDateLabel` 七个函数（逐字搬移，补 `export`）。`formatDateLabel` 在 App.tsx:701-709，其余在原位置不变
- [ ] **Step 4: 创建 `src/lib/theme.ts`**，内容 = `THEME_PRESETS`（原 72-193）+ `applyTheme`（原 195-208），逐字搬移并补 `export`；顶部 `import type { ThemePreset } from './types'`
- [ ] **Step 5: 修改 `src/App.tsx`**：删除原 6-49、51-62、64-208、699、701-709、1013 处定义（含 `interface Tag` 到 `function applyTheme` 的整块，以及 `CARD_COLORS`/`PROJECT_COLORS`/`formatDateLabel`），在文件顶部加：

```ts
import type { Tag, Subtask, Item, Card, Project, ProjectTag, ThemePreset } from './lib/types'
import { PROJECT_COLORS, CARD_COLORS } from './lib/constants'
import { hexToRgb, darken, calcMinutes, formatDuration, timeToMinutes, genId, formatDateLabel } from './lib/utils'
import { THEME_PRESETS, applyTheme } from './lib/theme'
```

  注意：`NoteCardProps`（原 269-286）**不要动**（Task 3 再处理）；`Statistics`（1878）/`PomodoroStats`（2068）也留在原处（Task 6 处理）

- [ ] **Step 6: 验证**：`pnpm build` 通过（无 TS 错误、无未使用导入）；`pnpm lint` 通过
- [ ] **Step 7: Commit**

```bash
git add src/lib src/App.tsx
git commit -m "refactor: 抽取类型常量与纯函数到 lib"
```

---

### Task 2: 抽取 TimePicker、DatePicker、NoteCard

**Files:**
- Create: `src/components/TimePicker.tsx`
- Create: `src/components/DatePicker.tsx`
- Create: `src/components/NoteCard.tsx`
- Modify: `src/App.tsx`（删除这三个组件定义，改为 import）

**Interfaces:**
- Consumes: `Item`/`Card`/`Tag`/`Subtask`（types.ts）、`calcMinutes`/`formatDuration`/`genId`/`timeToMinutes`/`hexToRgb`（utils.ts）、lucide-react 图标
- Produces:

```ts
// TimePicker.tsx（原 App.tsx:237-249）
export function TimePicker({ value, onChange, compact }: { value: string; onChange: (v: string) => void; compact?: boolean }): React.JSX.Element

// DatePicker.tsx（原 App.tsx:250-267）
export function DatePicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }): React.JSX.Element

// NoteCard.tsx（原 App.tsx:288-461 + NoteCardProps 269-286）
export interface NoteCardProps {
  card: Card
  onSetTitle: (id: string, title: string) => void
  onSetDate: (id: string, date: string | null) => void
  onDeleteCard: (id: string) => void
  onAddItem: (cardId: string) => void
  onUpdateItem: (cardId: string, itemId: string, field: keyof Item, value: unknown) => void
  onDeleteItem: (cardId: string, itemId: string) => void
  onDragItemStart: (cardId: string, idx: number) => void
  onDragItemOver: (cardId: string, idx: number) => void
  onDropItem: (cardId: string, idx: number) => void
  onDragItemEnd: () => void
  onOpenItem: (cardId: string, itemId: string) => void
  onCardDragStart: (id: string) => void
  onCardDragOver: (e: React.DragEvent, id: string) => void
  onCardDragEnd: () => void
  draggingTask: boolean
}
export function NoteCard(props: NoteCardProps): React.JSX.Element
```

- [ ] **Step 1: 创建 `src/components/TimePicker.tsx`**：搬移原 237-249 的 `TimePicker`，逐字保留逻辑与 className；补 `export`。需要的 import：`useRef`、`Clock`（lucide-react）、`TimePicker` 自身的 `timeToMinutes` 若用到则从 utils 导入（核对原实现）
- [ ] **Step 2: 创建 `src/components/DatePicker.tsx`**：搬移原 250-267 的 `DatePicker`，逐字保留；补 `export`。需要的 import：`useRef`、`Calendar`（lucide-react）
- [ ] **Step 3: 创建 `src/components/NoteCard.tsx`**：
  - 搬移原 269-286 的 `interface NoteCardProps`（加 `export`）
  - 搬移原 288-461 的 `NoteCard` 函数体（逐字）
  - 补 import：`useState`/`useRef`（react）、`Plus`/`Clock`/`X`/`Trash2`/`GripVertical`/`Calendar`/`ChevronDown`/`Check`（lucide-react）、`import type { Item, Card } from '../lib/types'`、`DatePicker`（本地）、必要时 `hexToRgb`/`darken`/`calcMinutes`/`formatDuration` 等（按原函数体内实际使用核对，从 `../lib/utils` 导入）
- [ ] **Step 4: 修改 `src/App.tsx`**：删除原 237-267、269-286、288-461 的整个块（含 `TimePicker`、`DatePicker`、`NoteCardProps`、`NoteCard`），文件顶部加：

```ts
import { TimePicker } from './components/TimePicker'
import { DatePicker } from './components/DatePicker'
import { NoteCard } from './components/NoteCard'
```

  删除后立即 `pnpm build`，若有「未使用 import」报错（如 `ChevronDown`、`GripVertical` 等图标只剩 NoteCard 用），从 App.tsx 的 lucide import 行删除对应名字，直到 build 通过
- [ ] **Step 5: 验证**：`pnpm build` 通过；`pnpm lint` 通过；`pnpm dev` 打开 `http://localhost:1420` 确认卡片渲染、折叠、增删事项、拖拽 handle 与改造前一致（无控制台报错）
- [ ] **Step 6: Commit**

```bash
git add src/components src/App.tsx
git commit -m "refactor: 抽取 TimePicker/DatePicker/NoteCard 组件"
```

---

### Task 3: 抽取 TaskDetailModal

**Files:**
- Create: `src/components/TaskDetailModal.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `Item`/`Card`/`ProjectTag`（types.ts）、`DescriptionEditor`（`./DescriptionEditor`）、`genId`/`hexToRgb`/`darken` 等 utils、lucide-react
- Produces:

```ts
// TaskDetailModal.tsx（原 App.tsx:462-700）
export function TaskDetailModal({ card, item, projectTags, onClose, onUpdate, onDelete }: {
  card: Card
  item: Item
  projectTags: ProjectTag[]
  onClose: () => void
  onUpdate: (cardId: string, itemId: string, field: keyof Item, value: unknown) => void
  onDelete: (cardId: string, itemId: string) => void
}): React.JSX.Element
```

- [ ] **Step 1: 创建 `src/components/TaskDetailModal.tsx`**：搬移原 462-700 的 `TaskDetailModal` 函数体（逐字）。补 import：`useEffect`/`useState`（react）、`X`/`Clock`/`Trash2`/`Check`/`Calendar` 等（按原函数体内实际使用从 lucide-react 导入）、`import type { Item, Card, ProjectTag } from '../lib/types'`、`DescriptionEditor`（`'./DescriptionEditor'`）、utils 中实际用到的函数
- [ ] **Step 2: 修改 `src/App.tsx`**：删除原 462-700 的 `TaskDetailModal` 定义，顶部加 `import { TaskDetailModal } from './components/TaskDetailModal'`；清理 App.tsx 中因此不再使用的 lucide 图标 import 与 utils import（直到 `pnpm build` 无「未使用」报错）
- [ ] **Step 3: 验证**：`pnpm build` + `pnpm lint` 通过；`pnpm dev` 打开事项详情弹窗：编辑文本/优先级/时间/标签/子任务/富文本描述、删除事项、Esc 关闭，与改造前一致
- [ ] **Step 4: Commit**

```bash
git add src/components/TaskDetailModal.tsx src/App.tsx
git commit -m "refactor: 抽取 TaskDetailModal 组件"
```

---

### Task 4: 抽取 TodayBriefing、TimeGrid

**Files:**
- Create: `src/components/TodayBriefing.tsx`
- Create: `src/components/TimeGrid.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `Item`/`Card`（types.ts）、`formatDateLabel`/`timeToMinutes`/`calcMinutes`（utils.ts）、lucide-react
- Produces:

```ts
// TodayBriefing.tsx（原 App.tsx:711-786）
export function TodayBriefing({ cards, onReschedule }: {
  cards: Card[]
  onReschedule: (cardId: string, itemId: string, start: string, end: string) => void
}): React.JSX.Element | null

// TimeGrid.tsx（原 App.tsx:788-877）
export interface TimeGridItem extends Item { cardId: string; cardTitle: string; color: string; startMin: number; endMin: number }
export function TimeGrid({ items, minHour, maxHour, showNow, onOpenItem, onUpdateItem }: {
  items: TimeGridItem[]
  minHour: number
  maxHour: number
  showNow: boolean
  onOpenItem: (cardId: string, itemId: string) => void
  onUpdateItem: (cardId: string, itemId: string, field: keyof Item, value: unknown) => void
}): React.JSX.Element
```

- [ ] **Step 1: 创建 `src/components/TodayBriefing.tsx`**：搬移原 711-786（函数体逐字）。补 import：`Calendar`/`Clock`（lucide-react）、`import type { Card } from '../lib/types'`、`formatDateLabel`（`../lib/utils`）。注意 `handleReschedule` 里 `onReschedule` 的调用与"推迟到现在"按钮逻辑原样保留
- [ ] **Step 2: 创建 `src/components/TimeGrid.tsx`**：搬移原 788-877（函数体逐字，含 `TimeGridItem` 形状——原代码用 `items: (Item & {...})[]`，导出为 `export interface TimeGridItem extends Item {...}` 即可，或保持内联类型）。补 import：`useEffect`/`useRef`/`useState`（按原实现）、lucide 图标（按原实现）、`import type { Item } from '../lib/types'`、`calcMinutes`/`timeToMinutes`/`formatDuration`（`../lib/utils`，按原实现核对）
- [ ] **Step 3: 修改 `src/App.tsx`**：删除原 711-786 与 788-877，顶部加：

```ts
import { TodayBriefing } from './components/TodayBriefing'
import { TimeGrid } from './components/TimeGrid'
```

  清理 App.tsx 不再使用的 import（尤其 `Calendar`/`Clock`/`formatDateLabel`，若 TimelineView 仍用则保留），`pnpm build` 到无报错。

- [ ] **Step 4: 验证**：`pnpm build` + `pnpm lint` 通过；`pnpm dev` 确认今日简报（进度条、被打断事项、推迟按钮）与时间网格视图（在 TimelineView 内）行为一致
- [ ] **Step 5: Commit**

```bash
git add src/components/TodayBriefing.tsx src/components/TimeGrid.tsx src/App.tsx
git commit -m "refactor: 抽取 TodayBriefing 与 TimeGrid 组件"
```

---

### Task 5: 抽取 TimelineView

**Files:**
- Create: `src/components/TimelineView.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `Card`/`Item`（types.ts）、`CARD_COLORS`（constants.ts）、`calcMinutes`/`timeToMinutes`/`formatDuration`/`formatDateLabel`（utils.ts）、`TimeGrid`（`./TimeGrid`）、lucide-react
- Produces:

```ts
// TimelineView.tsx（原 App.tsx:878-1729，约 850 行，最大文件，逐字搬移）
export function TimelineView({ cards, onOpenItem, onUpdateItem, onTimelineAddItem }: {
  cards: Card[]
  onOpenItem: (cardId: string, itemId: string) => void
  onUpdateItem: (cardId: string, itemId: string, field: keyof Item, value: unknown) => void
  onTimelineAddItem: (date: string) => void
}): React.JSX.Element
```

- [ ] **Step 1: 创建 `src/components/TimelineView.tsx`**：把原 App.tsx:878-1729 整块搬入（含 `timedItems`/`noTimeItems` 的 flatMap 计算、日期分组、时间网格渲染、无时间事项列表、添加按钮）。补 import：
  - `useMemo`/`useState`/`useEffect`/`useRef` 等（按原实现实际使用）
  - lucide-react 图标（按原实现实际使用，逐字核对）
  - `import type { Card, Item } from '../lib/types'`
  - `import { CARD_COLORS } from '../lib/constants'`
  - `import { calcMinutes, timeToMinutes, formatDuration, formatDateLabel } from '../lib/utils'`
  - `import { TimeGrid } from './TimeGrid'`
  - **第 878 行函数签名处需要 `import type { React } from 'react'` 吗？不需要**——返回类型标注 `React.JSX.Element` 时用全局 JSX 或显式 `import type { JSX } from 'react'`（本项目 `verbatimModuleSyntax` 下建议写 `: React.JSX.Element` 且顶部 `import type { React } from 'react'`，或省略返回类型标注，任选其一保持全文件一致）
- [ ] **Step 2: 修改 `src/App.tsx`**：删除原 878-1729，顶部加 `import { TimelineView } from './components/TimelineView'`；清理不再使用的 import（`Calendar`/`CARD_COLORS`/`formatDateLabel` 等若 App 内不再使用必须删），`pnpm build` 到无报错
- [ ] **Step 3: 验证**：`pnpm build` + `pnpm lint` 通过；`pnpm dev` 切换到时间线视图：按日期分组、带时间事项渲染到时间网格、无时间事项列表、点网格打开详情、顶部添加按钮创建事项、拖拽时间条（若存在）——与改造前一致
- [ ] **Step 4: Commit**

```bash
git add src/components/TimelineView.tsx src/App.tsx
git commit -m "refactor: 抽取 TimelineView 组件"
```

---

### Task 6: 抽取 StatisticsPanel、PomodoroTimer

**Files:**
- Create: `src/components/StatisticsPanel.tsx`
- Create: `src/components/PomodoroTimer.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `Statistics`/`PomodoroStats`（从 App.tsx 原 1878-1886/2068-2073 搬来）、`invoke`（`@tauri-apps/api/core`）、lucide-react、`formatDuration`/`calcMinutes`（utils.ts）
- Produces:

```ts
// StatisticsPanel.tsx（原 App.tsx:1730-1887；interface Statistics 原 1878-1886 一并搬入并 export）
export interface Statistics {
  total_items: number
  completed_items: number
  completion_rate: number
  total_minutes: number
  items_by_date: { date: string; count: number }[]
  priority_distribution: { label: string; count: number }[]
  daily_stats: { date: string; total: number; completed: number; minutes: number }[]
}
export function StatisticsPanel({ onClose }: { onClose: () => void }): React.JSX.Element

// PomodoroTimer.tsx（原 App.tsx:1888-2066；interface PomodoroStats 原 2068-2073 一并搬入并 export）
export interface PomodoroStats {
  total_sessions: number
  total_minutes: number
  today_sessions: number
  today_minutes: number
}
export function PomodoroTimer({ onClose }: { onClose: () => void }): React.JSX.Element
```

- [ ] **Step 1: 创建 `src/components/StatisticsPanel.tsx`**：搬移原 1730-1886 的 `StatisticsPanel` + 原 1878-1886 的 `interface Statistics`（补 `export`）。补 import：`useEffect`/`useState`（react）、`invoke`（`@tauri-apps/api/core`）、lucide 图标（按原实现）、utils（按原实现）
- [ ] **Step 2: 创建 `src/components/PomodoroTimer.tsx`**：搬移原 1888-2066 的 `PomodoroTimer` + 原 2068-2073 的 `interface PomodoroStats`（补 `export`）。补 import：`useEffect`/`useRef`/`useState`（react）、`invoke`、lucide 图标（`Timer`/`Play`/`Pause`/`RotateCcw`/`X` 等按原实现）、utils（按原实现）。**注意保留 `log_pomodoro` 调用（含 `item_id: ''` 参数）与 localStorage 读写（`pomodoroWork`/`pomodoroBreak`）**
- [ ] **Step 3: 修改 `src/App.tsx`**：删除原 1730-2073（含两个组件与两个 interface），顶部加：

```ts
import { StatisticsPanel } from './components/StatisticsPanel'
import { PomodoroTimer } from './components/PomodoroTimer'
```

  清理不再使用的 import（`Timer` 等），`pnpm build` 到无报错。注意：App.tsx 中 `showStats`/`showPomodoro` state 与 `{showStats && <StatisticsPanel .../>}` 渲染行保留不动

- [ ] **Step 4: 验证**：`pnpm build` + `pnpm lint` 通过；`pnpm dev` 打开统计看板（概览/每日 tab、图表数据渲染）与番茄钟（开始/暂停/重置、完成后日志记录、Esc 关闭），与改造前一致
- [ ] **Step 5: Commit**

```bash
git add src/components/StatisticsPanel.tsx src/components/PomodoroTimer.tsx src/App.tsx
git commit -m "refactor: 抽取 StatisticsPanel 与 PomodoroTimer 组件"
```

---

### Task 7: 底部 3 Tab 布局重构（土豆基地/今日/设置）

**Files:**
- Create: `src/components/BottomTabBar.tsx`
- Create: `src/components/PetBasePlaceholder.tsx`
- Create: `src/components/SettingsPanel.tsx`
- Modify: `src/App.tsx`（布局与 Tab 接线，删除侧边栏）

**Interfaces:**
- Consumes: Task 1-6 的全部导出；App.tsx 现有 handlers（`handleSetTitle` 等）
- Produces:

```ts
// BottomTabBar.tsx
export type TabId = 'base' | 'today' | 'settings'
export function BottomTabBar({ tab, onChange }: { tab: TabId; onChange: (t: TabId) => void }): React.JSX.Element

// PetBasePlaceholder.tsx —— 土豆基地占位（宠物 UI 归计划 C）
export function PetBasePlaceholder(): React.JSX.Element

// SettingsPanel.tsx —— 收纳原侧边栏的设置/项目管理/标签管理/统计入口
export function SettingsPanel(props: {
  projects: Project[]
  currentProjectId: string
  projectTags: ProjectTag[]
  dark: boolean
  themePreset: string
  accentColor: string
  showThemePicker: boolean
  onSwitchProject: (id: string) => void
  onToggleDark: () => void
  onToggleThemePicker: () => void
  onSelectThemePreset: (id: string, accent: string) => void
  onSelectAccent: (color: string) => void
  onExport: () => void
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void
  importRef: React.RefObject<HTMLInputElement | null>
  renamingProject: string | null
  renameValue: string
  onRenameProject: (id: string) => void
  onStartRename: (p: Project) => void
  onDeleteProject: (id: string) => void
  onCreateProject: (name: string, color: string) => void
  showCreateForm: boolean
  newProjectName: string
  newProjectColor: string
  onShowCreateForm: (v: boolean) => void
  onNewProjectName: (v: string) => void
  onNewProjectColor: (c: string) => void
  showTagManager: boolean
  onToggleTagManager: () => void
  onDeleteTag: (id: string) => void
  onCreateTag: () => void
  newTagName: string
  newTagColor: string
  onNewTagName: (v: string) => void
  onNewTagColor: (c: string) => void
  onShowStats: () => void
  onShowPomodoro: () => void
  onShowViewToggle: () => void   // 视图切换（卡片/时间线），由 App 决定放到今日 Tab
  viewMode: 'grid' | 'timeline'
}): React.JSX.Element
```

**布局结构（最终目标）：**

```
<div className="min-h-[100dvh] bg-gradient-to-b from-[var(--bg-page)] to-[var(--bg-page-to)] flex flex-col">
  <main className="flex-1 min-w-0 mx-auto w-full max-w-7xl p-4 md:p-6">
    {tab === 'base' && <PetBasePlaceholder />}
    {tab === 'today' && (
      <>搜索栏 + TodayBriefing + 卡片/时间线视图（现 App.tsx:1612-1714 主区域内容）+ 视图切换按钮</>
    )}
    {tab === 'settings' && <SettingsPanel ... />}
  </main>
  <BottomTabBar tab={tab} onChange={setTab} />
  {/* Modals（openItem/showStats/showPomodoro）保持不变 */}
</div>
```

- [ ] **Step 1: 创建 `src/components/BottomTabBar.tsx`**：

```tsx
import { Sprout, CalendarDays, Settings } from 'lucide-react'
export type TabId = 'base' | 'today' | 'settings'

const TABS: { id: TabId; label: string; icon: typeof Sprout }[] = [
  { id: 'base', label: '土豆基地', icon: Sprout },
  { id: 'today', label: '今日', icon: CalendarDays },
  { id: 'settings', label: '设置', icon: Settings },
]

export function BottomTabBar({ tab, onChange }: { tab: TabId; onChange: (t: TabId) => void }) {
  return (
    <nav className="shrink-0 border-t border-[var(--border-divider)]/40 bg-[var(--bg-surface)]/80 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-7xl px-4 py-1.5 flex items-stretch gap-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => onChange(t.id)}
            className={'flex flex-1 flex-col items-center gap-0.5 py-2 rounded-xl text-[11px] transition-all active:scale-[0.97] ' +
              (tab === t.id ? 'text-[var(--accent)] bg-[var(--accent)]/8 font-semibold' : 'text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] hover:bg-[var(--bg-surface-hover)]')}>
            <t.icon size={18} strokeWidth={1.75} />
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: 创建 `src/components/PetBasePlaceholder.tsx`**：土豆基地占位（spec 7.2 主场景，宠物 UI 归计划 C）：

```tsx
import { Sprout } from 'lucide-react'
export function PetBasePlaceholder() {
  return (
    <div className="h-full min-h-[60dvh] flex flex-col items-center justify-center gap-3 text-stone-400 dark:text-stone-500">
      <div className="w-20 h-20 rounded-3xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
        <Sprout size={36} strokeWidth={1.5} className="text-[var(--accent)]/60" />
      </div>
      <p className="text-sm font-medium text-stone-500 dark:text-stone-400">土豆基地建设中</p>
      <p className="text-xs">宠物场景 / 商城 / 成长中心将在后续版本登场</p>
    </div>
  )
}
```

- [ ] **Step 3: 创建 `src/components/SettingsPanel.tsx`**：把原 App.tsx 侧边栏（1405-1610）的内容**按功能拆分搬入**：
  - **项目管理块**（原 1414-1478：项目列表、重命名、删除、新建表单）→ 顶部「项目管理」分区
  - **标签管理块**（原 1480-1519：toggle、标签列表、新建标签）→ 「标签管理」分区（保留，砍标签功能归计划 C）
  - **视图/统计/番茄钟入口**（原 1523-1538）→ 「功能入口」分区，其中视图切换按钮保留在 SettingsPanel（传 `viewMode` + `onShowViewToggle`）
  - **主题设置块**（原 1544-1584：明暗、主题预设、强调色）→ 「外观」分区
  - **数据管理块**（原 1586-1604：导出/导入 + importRef hidden input）→ 「数据」分区
  - 原 1606-1608 的计数提示改为「今日」分区顶部信息或移除
  - 每个分区用 `<div className="mb-4"><h2 className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2">分区名</h2>...</div>` 组织，样式复用原 CSS 变量（`bg-[var(--bg-surface)]` 等），风格与现有 UI 一致
  - 所有交互通过 props 回调到 App（避免在 SettingsPanel 内直接改 App 的 state）
- [ ] **Step 4: 修改 `src/App.tsx`**：
  - 新增 `const [tab, setTab] = useState<TabId>('base')`（默认土豆基地，spec 7.2）
  - 删除整个侧边栏 JSX（原 1404-1610），主区域改为 `{tab === 'today' && (原 1612-1714 内容 + 视图切换按钮)}`、`{tab === 'settings' && <SettingsPanel ... />}`、`{tab === 'base' && <PetBasePlaceholder />}`
  - 根 div 从 `flex p-6 gap-4` 改为 `flex flex-col`；`main` 用 `flex-1 min-w-0 mx-auto w-full max-w-7xl p-4 md:p-6`
  - 视图切换按钮从 SettingsPanel 通过 props 传（`onShowViewToggle` 调 `setViewMode`），或直接在今日 Tab 搜索栏右侧放一个小按钮（任选，保证桌面/移动都能切换视图）
  - Modals 区块（原 1716-1725）原样保留在根 div 内
  - 快捷键（1050-1068）、备份（1076-1081）、主题应用（1070-1074）等 effect 不动
  - 清理不再使用的 import（`Sun`/`Moon`/`Download`/`Upload`/`LayoutGrid`/`CalendarDays`/`BarChart3`/`Timer`/`Edit3`/`Plus` 等若 App 内不再直接使用则删除；`importRef` 若移入 SettingsPanel 则把 ref 从 App 传给 SettingsPanel，见 Interfaces）
- [ ] **Step 5: 验证**：`pnpm build` + `pnpm lint` 通过；`pnpm dev` 手动清单：
  - 3 个 Tab 可切换，默认落在土豆基地占位页
  - 今日 Tab：搜索、今日简报、卡片/时间线切换、增删改事项、拖拽（HTML5）全部正常
  - 设置 Tab：项目新建/重命名/删除、标签管理、主题预设/强调色/明暗切换即时生效、导出下载文件、导入确认覆盖
  - 窗口缩窄到手机宽度（Responsively App 或 DevTools 手机模式）时底部 TabBar 贴底、`safe-area-inset-bottom` 生效、无横向溢出
- [ ] **Step 6: Commit**

```bash
git add src/components/BottomTabBar.tsx src/components/PetBasePlaceholder.tsx src/components/SettingsPanel.tsx src/App.tsx
git commit -m "feat: 底部 3 Tab 导航重构（土豆基地/今日/设置）"
```

---

### Task 8: 触控双轨（手机长按排序 + 跨天移动菜单）

**Files:**
- Modify: `src/App.tsx`（拖拽接入、长按菜单状态）
- Modify: `src/components/NoteCard.tsx`（事项行加长按事件、排序模式样式）
- Modify: `src/components/TimelineView.tsx`（事项行加长按事件，如适用）

**Interfaces:**
- Consumes: `@atlaskit/pragmatic-drag-and-drop`（package.json 已有 `^1.8.1`，当前未使用）、`@radix-ui/react-dropdown-menu`（已有 `^2.1.16`）、现有 `handleDragItemStart/Over/Drop/End`、`move_item` 命令（后端已有）
- Produces: 无（行为层改造）

**交互定义（spec 7.3）：**
- **桌面（指针设备）**：保留现有 HTML5 DnD（`draggable` + `onDragStart/Over/Drop`），**不改动**
- **触屏设备**（`'ontouchstart' in window || navigator.maxTouchPoints > 0`）：
  - 长按 0.5s 任意事项行 → 进入该行的"排序模式"（行高亮 + 显示上下移动箭头），用 `@atlaskit/pragmatic-drag-and-drop` 的 touch 拖拽移动行序（跨卡片/同日排序）
  - 长按 0.5s 后松手不动 → 弹出 Radix DropdownMenu：「移动至」→ 目标日期列表（当前有事项的日期 + 今天 + 明天 + 前天/后天），选中后调 `invoke('move_item', { id, targetCardId })`（注意现有命令签名 `move_item({ id, targetCardId })`）
  - 桌面端也支持右键/长按弹出同一菜单（低优先，可选）
- **菜单触发与排序模式的区分**：长按 0.5s 进入排序模式后，若用户继续拖动 → 排序；若用户松开且未拖动 → 弹出移动菜单

- [ ] **Step 1: 在 App.tsx 新增触屏判定与菜单状态**：

```ts
const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
const [moveMenu, setMoveMenu] = useState<{ cardId: string; itemId: string } | null>(null)
```

- [ ] **Step 2: 在 App.tsx 新增移动菜单 handlers**：

```ts
const handleMoveItem = async (itemId: string, targetCardId: string) => {
  setMoveMenu(null)
  try { await invoke('move_item', { id: itemId, targetCardId }) } catch {}
  // 重新拉取或本地更新（与现有 onDropItem 的本地更新方式保持一致）
}
```

  本地更新方式参考现有 `handleDropItem`（原 1270-1290 附近）：把 item 从源卡片移除、push 到目标卡片，再调 `reorder_items` 修正顺序。实现时以现有代码为准，保持行为一致

- [ ] **Step 3: 在 `NoteCard.tsx` 事项行加长按检测**（仅 `isTouch` 时启用；桌面路径完全不动）：每行加 `onTouchStart`/`onTouchEnd`/`onTouchMove`，用 `useRef` 记 `touchTimer` 与按下位置，0.5s 内位移 < 10px 视为长按：
  - 触发 `onOpenMoveMenu?.(cardId, itemId)`（新 props，App 传 `setMoveMenu` 包装函数）
  - 长按后进入排序模式：对 pragmatic 用法，`NoteCard` 的 `draggable` 属性在触屏下替换为 pragmatic 的 `draggable({ element, getInitialData: () => ({ cardId, index }), onDragStart, onDragEnd })` + `dropTargetForElements({ element, getData, onDragEnter, onDragLeave, onDrop })`（原 1083-1090 的 `dragItemInfo` 数据形状沿用），并调现有 `onDragItemStart/Over/Drop/End` props 完成排序——**若 pragmatic 接入成本过高（需重构 drop 事件流），允许降级**：触屏排序模式改为显示上下箭头按钮（`↑`/`↓`）调 `handleDragItemOver/Drop` 完成相邻交换，跨天移动走长按菜单。**两种实现二选一，但必须保证：触屏下不出现 HTML5 拖拽、跨天移动可用**
- [ ] **Step 4: 在 App.tsx 今日 Tab 渲染 Radix 移动菜单**（挂长按菜单）：

```tsx
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
// 在今日 Tab 内容区末尾：
<DropdownMenu.Root open={!!moveMenu} onOpenChange={(o) => !o && setMoveMenu(null)}>
  <DropdownMenu.Trigger style={{ display: 'none' }} />
  <DropdownMenu.Portal>
    <DropdownMenu.Content side="bottom" align="start" className="z-50 min-w-[180px] bg-white dark:bg-[var(--bg-card-start)] border border-[var(--border-item)] rounded-xl shadow-[0_8px_32px_rgb(var(--shadow-rgb)/var(--shadow-modal-opacity))] p-1">
      <DropdownMenu.Label className="px-2 py-1 text-[10px] font-semibold text-stone-400 dark:text-stone-500">移动至</DropdownMenu.Label>
      {targetDates.map(d => (
        <DropdownMenu.Item key={d.cardId} onSelect={() => moveMenu && handleMoveItem(moveMenu.itemId, d.cardId)}
          className="px-2 py-1.5 text-xs rounded-lg outline-none cursor-pointer data-[highlighted]:bg-[var(--bg-surface-hover)] data-[highlighted]:text-[var(--accent)]">
          {d.label}
        </DropdownMenu.Item>
      ))}
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
```

  `targetDates` = 当天/前后两天有 `date` 的卡片（`cards.filter(c => c.date)` 取最近 5 个）→ `{ cardId, label: formatDateLabel(c.date!) }`，无任何卡片时用「新建便签并移动」项（调 `handleAddCard` 后取新卡片 id 移动，或隐藏该菜单——二选一，选实现简单者）

- [ ] **Step 5: 验证**：
  - `pnpm build` + `pnpm lint` 通过
  - 桌面：`pnpm dev` 鼠标拖拽排序/跨卡片拖拽与改造前一致（回归）
  - 触屏：用 Responsively App（`http://localhost:1420`）或 DevTools 触摸模拟：长按事项 0.5s 弹出移动菜单、选目标日期后事项跨天移动成功；长按拖动排序生效（若实现排序模式）
- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/NoteCard.tsx src/components/TimelineView.tsx
git commit -m "feat: 触控双轨（长按移动菜单 + 排序模式）"
```

---

## Self-Review

**1. Spec 覆盖：**
- 7.1 底部 3 Tab → Task 7 ✅
- 7.2 土豆基地默认 Tab + 场景占位 → Task 7（宠物 UI 归计划 C）✅
- 7.3 触控双轨（长按 0.5s 排序 + 长按菜单跨天移动 + safe-area）→ Task 8 + Task 7 BottomTabBar ✅
- 9.3 组件拆分重构（App.tsx 按 Tab 拆分）→ Task 1-6 ✅；导航替代侧边栏 → Task 7 ✅；桌面横向适配（max-w 居中）→ Task 7 ✅
- 8 功能精简清单（砍标签/项目→轻量/砍富文本/砍子任务/搜索弱化）→ **明确归计划 C**（本计划 Global Constraints 已声明范围外）⚠️ 需在最终汇报中提示用户确认
- 宠物系统 UI（计划 C 完整范围）→ 不在本计划，占位已建 ✅

**2. Placeholder 扫描：** Task 1-6 为逐字搬移任务（源行号已给出，无 TODO）；Task 7 给出完整布局结构与新组件源码；Task 8 的 pragmatic 接入给了 A/B 两条明确路径，均以现有 handler 为基础，无"待定"实现。**已知放宽**：Task 8 允许排序模式降级为箭头按钮方案（写入任务本身，非 TBD）。

**3. 类型一致性：** 各任务引用的函数/类型签名全部取自 App.tsx 现状（已在代码中核对：`NoteCardProps` 269-286、`Statistics` 1878、`PomodoroStats` 2068、`TimeGrid` 的 items 形状 788、`PROJECT_COLORS` 1013、`CARD_COLORS` 699）；跨任务引用统一用 `import type` 语法；`TabId` 仅 Task 7/8 使用，命名一致。

## 执行交接

计划已保存。两种执行方式：

1. **Subagent-Driven（推荐）**：每个任务派发独立 implementer，任务间由我审查把关，快速迭代
2. **Inline Execution**：本会话内批量执行，检查点暂停

**提醒（计划 B 范围外，写计划 C 前需确认）：** spec 八节功能精简（砍标签系统、项目管理→轻量场景、砍富文本描述、砍子任务、搜索弱化图标入口）与宠物系统 UI 一起归入计划 C，本计划不做任何功能删减。
