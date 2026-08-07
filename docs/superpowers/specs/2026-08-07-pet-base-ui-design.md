# 宠物基地 UI 设计（计划 C-1）

> 日期：2026-08-07
> 状态：已定稿（用户批准）
> 前置：计划 A（后端宠物闭环）+ 计划 B（前端 3 Tab 重构）已完成

## 背景

基地 Tab 当前是占位组件 `PetBasePlaceholder`（只显示 Sprout 图标）。后端宠物闭环已就绪：
- `get_pet` 返回 level / exp / 四维 / gold / satiety / form / power
- `complete_item` 完成事项结算，返回 `CompletedSummary`（含 level_up / new_level / 经验金币明细）
- `log_pomodoro` 番茄钟结算
- `pet_growth_log` 表存成长日志，**但只写不读**

本设计将基地 Tab 实装为宠物展示区，把既有成长数据呈现给用户。

## 范围

### 做

1. **后端**：新增 `get_growth_log` 命令（读最近 N 条成长日志）
2. **前端**：新组件 `PetBase` 替换占位符，三区块（形象 / 属性 / 日志）
3. **数据流**：`loadPet()` 初始化 + 切回 base Tab 时刷新 + 结算后实时刷新
4. **升级庆祝**：`level_up=true` 时今日 Tab 顶部 toast

### 不做（后续迭代）

- 喂食 / 改名 / 商店 / 道具
- 后端 form 进化（前端 level 映射三态，form 字段留给后端长期演进）
- 宠物动画帧 / 音效

## 后端设计

### 新命令 `get_growth_log`

```rust
#[tauri::command]
pub fn get_growth_log(
    db: tauri::State<'_, Database>,
    limit: Option<i64>,   // 默认 20，前端传 20
) -> Result<Vec<GrowthLogEntry>, String>
```

返回结构：

```rust
pub struct GrowthLogEntry {
    pub id: String,
    pub event_type: String,      // 'completed_item' | 'pomodoro'
    pub amount: String,          // 如 "+10力量 +5敏捷 +10金币"
    pub created_at: String,      // datetime('now') ISO
}
```

SQL：`SELECT id, event_type, amount, created_at FROM pet_growth_log ORDER BY created_at DESC, rowid DESC LIMIT ?1`

沿用现有 pattern：`#[tauri::command]` pub fn + 内层 `_inner`（testable），锁 `db.conn`，读写用 `rusqlite`。

表已存在（`CREATE TABLE IF NOT EXISTS pet_growth_log`），**零迁移**。在 `lib.rs` 注册命令。

### 自带测试

- 空表返回空 vec（无 error）
- 写 3 条后 limit=2 返回最近 2 条（顺序 id DESC）
- limit ≤ 0 时按默认 20 处理（或全部返回，选其一，写死在测试）

## 前端设计

### 新组件 `src/components/PetBase.tsx`

前置：`PetBasePlaceholder.tsx` 删除。3 Tab 结构不变（base tab 渲染 PetBase）。

**数据 props（受控，App 持有 state）：**

```ts
interface AvatarSpec {
  level: number
  emoji: string
  exp: number
  expToNext: number   // = level * 100
  strength: number
  agility: number
  focus: number
  endurance: number
  gold: number
  satiety: number
  power: number
  logs: GrowthLogEntry[]
}
```

实际传递：直接用 Pet 对象 + logs 数组。App 传 `pet`（无则渲染加载中 skeleton）+ `logs`。

**三区布局**（纵向 stack，`md` 两列可再调）：

1. **形象区**：大号 Emoji（`text-7xl`），旁边等级徽章 (Lv. N)，下方经验条（`level*100` 满级进度，`(exp % (level*100)) / (level*100)`）；形态由 `LEVEL_FORMS` 映射
2. **属性区**：四维横条（strength/agility/focus/endurance 各自 max=当前等级*10 或 100，显示数值）+ 金币 + 饱食度（`<30` 红字提示「经验 8 折！」）+ 战斗力 `power`
3. **日志区**：`📜 成长日志`，滚动区（`max-h-48 overflow-y-auto`），单条渲染 `event_type` 图标（✅完成事项 / 🍅番茄钟）+ `amount` + 时间（`formatDateLabel` 复用），倒序。空则「暂无成长记录」

**Emoji 三态映射 `LEVEL_FORMS`**（前端常量，放 `src/lib/constants.ts`）：

```ts
export const LEVEL_FORMS = [
  { min: 1,  max: 4,  emoji: '🥔', label: '幼苗' },
  { min: 5,  max: 9,  emoji: '🪴', label: '生长' },
  { min: 10, max: Infinity, emoji: '✨', label: '成熟' },
]
```

形象 Emoji 用 `LEVEL_EMOJI(level)` 辅助函数查找（`src/lib/utils.ts`）。

### App.tsx 改动

- 新增 state：`pet: Pet | null`、`growthLog: GrowthLogEntry[]`、`levelUpToast`（`{ message: string } | null`）
- `loadPet()`：`Promise.all([invoke('get_pet'), invoke('get_growth_log', { limit: 20 })])` 依次 set state
- 初始化 `useEffect`（mounted 一次）+ 切到 base tab 时刷新（`handleTabChange` 里若 target==='base' 调 `loadPet()`）
- `complete_item` 成功：若 `res.level_up` → 先 `setLevelUpToast(...)` 再 `loadPet()`（toast 3s 自动消失，`setTimeout`）
- `log_pomodoro` 成功：`loadPet()`（无 toast）
- toast UI：今日 Tab 顶部固定小浮层（绿色背景 + `🎉 Lv.${newLevel}` + 「四维各 +1」），点击关闭

### DescriptionEditor/现有组件

不动。仅 App.tsx 接线 + 新增 PetBase + 删占位组件。

## 数据流

```
[今日 Tab] complete_item ---> 后端结算 --> CompletedSummary
                                        ↓ level_up=true
                          → setLevelUpToast → loadPet() → get_pet + get_growth_log
[今日 Tab] log_pomodoro → loadPet()
[切到 base Tab] → loadPet()（兜底刷新）
[base Tab 渲染] pet + logs → PetBase 三区展示
```

## 验收

- `pnpm build` 零报错（`verbatimModuleSyntax`：类型导入必须 `import type`）
- `pnpm lint`：新增组件零新增（存量 29 忽略）
- `cargo test`：get_growth_log 三例测试通过
- `pnpm dev` 手动：基地 Tab 显示宠物形象 + 四维 + 金币 + 饱食度 + 日志；完成一个事项 → 今日 Tab 出现升级 toast（若 level_up）+ 宠物刷新；切 Tab 刷新
- 中文注释 / commit

## 风险

- Emoji 在部分 WebView 渲染差异 → 无（emoji 是系统文字，跨平台安全）
- 结算后 loadPet 时序 → `await` 顺序写死，先 toast 后 refresh
- 升级多次（连升）→ toast 显示最终 new_level，日志会显示多级五维+1（后端已按 levels_gained 加）