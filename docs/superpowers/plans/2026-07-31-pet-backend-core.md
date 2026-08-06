# 后端宠物系统核心闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Todo土豆 v2 建立宠物系统后端核心闭环——宠物数据表、行为结算纯函数、宠物读写与经验/金币/饱食度结算命令，全部可通过 `cargo test` 独立验证。

**Architecture:** 在现有 `db.rs` 增量迁移模式上新增 pet 系列表；行为结算抽为**纯函数模块** `reward.rs`（输入行为快照、输出奖励明细，独立可测）；核心逻辑实现为**接收 `&Database` 的内部函数**（可单测），`#[tauri::command]` 仅做薄封装传 `State`。经验/金币/饱食度以 `pet` 单行表为唯一定源。

**Tech Stack:** Rust（rusqlite bundled、uuid v4、chrono）、Tauri 2 命令模式。

> **平台说明（2026-08-08）**：项目已定**移动端优先**（Android 首发，Tauri Mobile 路线，见 `AGENTS.md` 与 `docs/mobile-app.md`）。本计划为纯后端（Rust/SQLite），Tauri Mobile 下**零重写复用**，不受移动端决策影响，照常执行。移动端影响的是前端 UI（3 Tab 游戏基地 + 触控双轨，见 spec 第七章），由计划 B 承担。

## Global Constraints

- 语言：全程中文注释/commit（AGENTS.md）
- 风格：沿用 `db.rs` 现有模式（`conn.lock().map_err(|e| e.to_string())?`、`Uuid::new_v4()`）
- 迁移：`CREATE TABLE IF NOT EXISTS` 追加（`.ok()` 可忽略重试错误）
- `pet` 表只有一行 `id='main'`
- 无新依赖（只用 rusqlite/uuid/chrono/serde_json）
- 数值规则（来自 spec 第 3.3/4 节，不得随意改动）：
  - 完成时间块：+10 力量经验、+10 金币（基础）
  - 按时/提前完成（实际 ≤ 计划且计划 > 0）：+5 敏捷经验
  - 延长专注：每整 15 分钟 +2 专注经验，封顶按计划时长 50% 折算
  - 完成番茄钟：+3 专注经验、+3 金币
  - 饱食度 0-100 每小时自然消耗 1 点；< 30 时经验获取打 8 折（金币不打折）
  - 战力 = 等级×20 + 力量×2 + 敏捷×1.5 + 专注×1.5 + 韧性×2
  - 升级曲线：升到 L+1 需要 `L×100` 经验，升级时四维各 +1
- 幂等：宠物不存在时 `get_pet` 自动初始化默认宠物（`土豆 / Lv.1 / 饱食度100 / 形态 sprout`）

---

## File Structure

| 文件 | 职责 | 类型 |
|---|---|---|
| `src-tauri/src/reward.rs` | 结算纯函数（经验/金币/饱食度/战力） | 新建 |
| `src-tauri/src/db.rs` | 新表迁移 + 内部函数 + 命令薄封装 | 修改 |
| `src-tauri/src/lib.rs` | `mod reward;` + 注册新命令 + 去掉重复注册 | 修改 |

---

### Task 1: 宠物数据表迁移

**Files:**
- Modify: `src-tauri/src/db.rs`（`init()` 函数内 `items_fts` rebuild 之前追加）

**Interfaces:**
- Produces: 表 `pet`、`pet_growth_log`、`shop_items`、`inventory`

- [ ] **Step 1: 在 `init()` 中追加建表**

在 `db.rs` 的 `init()` 中、`CREATE VIRTUAL TABLE IF NOT EXISTS items_fts` 之前追加：

```sql
CREATE TABLE IF NOT EXISTS pet (
    id TEXT PRIMARY KEY DEFAULT 'main',
    name TEXT NOT NULL DEFAULT '土豆',
    level INTEGER NOT NULL DEFAULT 1,
    exp INTEGER NOT NULL DEFAULT 0,
    strength INTEGER NOT NULL DEFAULT 0,
    agility INTEGER NOT NULL DEFAULT 0,
    focus INTEGER NOT NULL DEFAULT 0,
    endurance INTEGER NOT NULL DEFAULT 0,
    gold INTEGER NOT NULL DEFAULT 0,
    satiety INTEGER NOT NULL DEFAULT 100,
    form TEXT NOT NULL DEFAULT 'sprout',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS pet_growth_log (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    amount TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS shop_items (
    id TEXT PRIMARY KEY,
    item_type TEXT NOT NULL,
    name TEXT NOT NULL,
    desc TEXT NOT NULL DEFAULT '',
    price INTEGER NOT NULL,
    effect INTEGER NOT NULL DEFAULT 0,
    claim_once INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS inventory (
    pet_id TEXT NOT NULL DEFAULT 'main',
    item_id TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (pet_id, item_id)
);
```

- [ ] **Step 2: 编写迁移测试**

在 `db.rs` 文件末尾追加测试模块：

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn temp_db() -> Database {
        let path = std::env::temp_dir().join(format!("todo_pet_test_{}.db", Uuid::new_v4()));
        let db = Database::new(path.to_str().unwrap()).unwrap();
        std::fs::remove_file(&path).ok();
        db
    }

    #[test]
    fn pet_tables_created() {
        let db = temp_db();
        let conn = db.conn.lock().unwrap();
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('pet','pet_growth_log','shop_items','inventory')",
            [], |r| r.get(0),
        ).unwrap();
        assert_eq!(count, 4);
        let pet_count: i64 = conn.query_row("SELECT COUNT(*) FROM pet", [], |r| r.get(0)).unwrap();
        assert_eq!(pet_count, 0);
    }
}
```

- [ ] **Step 3: 运行测试验证通过**

Run: `cargo test pet_tables_created`
Expected: PASS（`count == 4`，`pet_count == 0`）

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/db.rs
git commit -m "feat: 宠物数据库表结构迁移"
```

---

### Task 2: 结算纯函数模块 `reward.rs`

**Files:**
- Create: `src-tauri/src/reward.rs`

**Interfaces:**
- Produces:
  - `#[derive(Debug, Clone, Copy, PartialEq, Default)] pub struct Reward { pub strength_exp: i32, pub agility_exp: i32, pub focus_exp: i32, pub endurance_exp: i32, pub gold: i32 }`
  - `pub fn settle_completion(planned_minutes: i32, actual_minutes: i32) -> Reward`
  - `pub fn satiety_tick(satiety: i32, hours: i64) -> i32`
  - `pub fn power(level: i32, strength: i32, agility: i32, focus: i32, endurance: i32) -> i32`

- [ ] **Step 1: 编写失败的测试**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn completion_on_time_gives_agility() {
        let r = settle_completion(120, 100);
        assert_eq!(r.strength_exp, 10);
        assert_eq!(r.agility_exp, 5);
        assert_eq!(r.gold, 10);
    }

    #[test]
    fn completion_extended_gives_focus_capped() {
        // 计划60分钟实际180：延长120分钟，封顶30（60×50%）→ 30/15×2 = 4
        let r = settle_completion(60, 180);
        assert_eq!(r.agility_exp, 0);
        assert_eq!(r.focus_exp, 4);
        // 无专注数据（actual=0）→ 按按时完成处理
        let r2 = settle_completion(60, 0);
        assert_eq!(r2.agility_exp, 5);
        // 无计划时间 → 只有基础奖励
        let r3 = settle_completion(0, 0);
        assert_eq!(r3.strength_exp, 10);
        assert_eq!(r3.gold, 10);
        assert_eq!(r3.agility_exp, 0);
    }

    #[test]
    fn satiety_decreases_and_caps_at_zero() {
        assert_eq!(satiety_tick(50, 10), 40);
        assert_eq!(satiety_tick(50, 100), 0);
        assert_eq!(satiety_tick(50, 1000), 0);
    }

    #[test]
    fn power_formula() {
        // 12*20 + 10*2 + 4*1.5 + 6*1.5 + 8*2 = 240+20+6+9+16 = 291
        assert_eq!(power(12, 10, 4, 6, 8), 291);
    }
}
```

- [ ] **Step 2: 运行验证失败**

Run: `cargo test -p app_lib`
Expected: FAIL（`mod reward` 不存在）

- [ ] **Step 3: 实现纯函数**

```rust
#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct Reward {
    pub strength_exp: i32,
    pub agility_exp: i32,
    pub focus_exp: i32,
    pub endurance_exp: i32,
    pub gold: i32,
}

/// 完成一个时间块的结算。
/// planned_minutes: 计划时长；actual_minutes: 实际专注时长（0 表示未记录）。
/// 规则：基础 +10 力量 +10 金币；
/// 实际 ≤ 计划（且计划 > 0）→ +5 敏捷；
/// 实际 > 计划 → 延长部分（封顶计划 50%）每整 15 分钟 +2 专注。
pub fn settle_completion(planned_minutes: i32, actual_minutes: i32) -> Reward {
    let mut r = Reward { strength_exp: 10, gold: 10, ..Default::default() };
    if planned_minutes <= 0 {
        return r;
    }
    if actual_minutes <= 0 || actual_minutes <= planned_minutes {
        r.agility_exp = 5;
    } else {
        let cap = (planned_minutes as f64 * 0.5) as i32;
        let extra = (actual_minutes - planned_minutes).min(cap);
        r.focus_exp = extra / 15 * 2;
    }
    r
}

/// 饱食度按小时自然消耗（每小时 -1，下限 0）。
pub fn satiety_tick(satiety: i32, hours: i64) -> i32 {
    (satiety - (hours as i32).min(10000)).max(0)
}

/// 战力公式：等级×20 + 力量×2 + 敏捷×1.5 + 专注×1.5 + 韧性×2
pub fn power(level: i32, strength: i32, agility: i32, focus: i32, endurance: i32) -> i32 {
    level * 20
        + strength * 2
        + ((agility as f64 * 1.5) as i32)
        + ((focus as f64 * 1.5) as i32)
        + endurance * 2
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cargo test -p app_lib`
Expected: 4 个测试全部 PASS

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/reward.rs
git commit -m "feat: 宠物行为结算纯函数（经验/饱食度/战力）"
```

---

### Task 3: 宠物模型 + 内部读写函数 + `get_pet` 命令

**Files:**
- Modify: `src-tauri/src/db.rs`（顶部加 `use crate::reward;`）

**Interfaces:**
- Consumes: `reward::{satiety_tick, power}`
- Produces:
  - `pub struct Pet { id, name, level, exp, strength, agility, focus, endurance, gold, satiety, form, power: i32 }`（derive Debug/Serialize/Deserialize/Clone）
  - `pub struct PetRow { id: String, name: String, level: i32, exp: i32, strength: i32, agility: i32, focus: i32, endurance: i32, gold: i32, satiety: i32, form: String }`（内部行读取，derive Clone）
  - `fn read_pet_row(conn: &rusqlite::Connection) -> Result<PetRow, String>`（内部，无 pet 行则 Err）
  - `fn apply_exp(conn: &rusqlite::Connection, s: i32, a: i32, f: i32, e: i32, gold: i32) -> Result<(bool, i32), String>`（内部：加四维/金币/经验（饱食度<30 打8折），循环升级，返回 (是否升级, 新等级)）
  - `pub fn get_pet_inner(db: &Database) -> Result<Pet, String>`（内部核心）
  - `#[tauri::command] pub fn get_pet(db: tauri::State<'_, Database>) -> Result<Pet, String>`（薄封装）

- [ ] **Step 1: 编写失败的测试**

```rust
#[test]
fn get_pet_initializes_default() {
    let db = temp_db();
    let pet = get_pet_inner(&db).unwrap();
    assert_eq!(pet.name, "土豆");
    assert_eq!(pet.level, 1);
    assert_eq!(pet.satiety, 100);
    assert_eq!(pet.form, "sprout");
    assert_eq!(pet.power, 20); // 1*20 + 0 + 0 + 0 + 0
}

#[test]
fn get_pet_is_idempotent() {
    let db = temp_db();
    let _ = get_pet_inner(&db).unwrap();
    let conn = db.conn.lock().unwrap();
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM pet", [], |r| r.get(0)).unwrap();
    assert_eq!(count, 1);
}

#[test]
fn satiety_decays_after_hours() {
    let db = temp_db();
    let _ = get_pet_inner(&db).unwrap();
    // 手动把 updated_at 拨回 5 小时前
    let conn = db.conn.lock().unwrap();
    conn.execute(
        "UPDATE pet SET satiety = 60, updated_at = datetime('now', '-5 hours') WHERE id='main'",
        [],
    ).unwrap();
    drop(conn);
    let pet = get_pet_inner(&db).unwrap();
    assert_eq!(pet.satiety, 55); // 60 - 5 小时
}

#[test]
fn apply_exp_levels_up_and_updates_attributes() {
    let db = temp_db();
    let _ = get_pet_inner(&db).unwrap();
    let conn = db.conn.lock().unwrap();
    let (leveled_up, new_level) = apply_exp(&conn, 200, 0, 0, 0, 100).unwrap();
    assert!(leveled_up);
    assert_eq!(new_level, 2); // 需要 1*100=100，200 经验升到 2 级，剩 100 不够 2*100=200
    let row = read_pet_row(&conn).unwrap();
    assert_eq!(row.strength, 201); // 0 + 200 + 升级+1
    assert_eq!(row.gold, 100);
    assert_eq!(row.exp, 100);
}
```

- [ ] **Step 2: 运行验证失败**

Run: `cargo test -p app_lib`
Expected: FAIL（未定义 `get_pet_inner` / `apply_exp` / `read_pet_row` / `Pet`）

- [ ] **Step 3: 实现内部函数与命令**

在 `db.rs` 中 `use crate::reward;` 之后、`// ── Project commands ──` 之前追加：

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Pet {
    pub id: String,
    pub name: String,
    pub level: i32,
    pub exp: i32,
    pub strength: i32,
    pub agility: i32,
    pub focus: i32,
    pub endurance: i32,
    pub gold: i32,
    pub satiety: i32,
    pub form: String,
    pub power: i32,
}

#[derive(Clone)]
struct PetRow {
    id: String,
    name: String,
    level: i32,
    exp: i32,
    strength: i32,
    agility: i32,
    focus: i32,
    endurance: i32,
    gold: i32,
    satiety: i32,
    form: String,
}

fn read_pet_row(conn: &rusqlite::Connection) -> Result<PetRow, String> {
    conn.query_row(
        "SELECT id, name, level, exp, strength, agility, focus, endurance, gold, satiety, form FROM pet WHERE id = 'main'",
        [],
        |row| {
            Ok(PetRow {
                id: row.get(0)?,
                name: row.get(1)?,
                level: row.get(2)?,
                exp: row.get(3)?,
                strength: row.get(4)?,
                agility: row.get(5)?,
                focus: row.get(6)?,
                endurance: row.get(7)?,
                gold: row.get(8)?,
                satiety: row.get(9)?,
                form: row.get(10)?,
            })
        },
    ).map_err(|e| e.to_string())
}

/// 应用经验/金币：四维直接累计；等级经验按饱食度打折（<30 打 8 折）；
/// 升到 L+1 级需要 L×100 经验，每次升级四维各 +1。
fn apply_exp(conn: &rusqlite::Connection, s: i32, a: i32, f: i32, e: i32, gold: i32) -> Result<(bool, i32), String> {
    let pet = read_pet_row(conn)?;
    let satiety_factor = if pet.satiety < 30 { 0.8 } else { 1.0 };
    let exp_gain = ((s + a + f + e) as f64 * satiety_factor) as i32;
    let mut level = pet.level;
    let mut exp = pet.exp + exp_gain;
    let mut leveled_up = false;
    while exp >= level * 100 {
        exp -= level * 100;
        level += 1;
        leveled_up = true;
    }
    let strength = pet.strength + s + if leveled_up { 1 } else { 0 };
    let agility = pet.agility + a + if leveled_up { 1 } else { 0 };
    let focus = pet.focus + f + if leveled_up { 1 } else { 0 };
    let endurance = pet.endurance + e + if leveled_up { 1 } else { 0 };
    conn.execute(
        "UPDATE pet SET strength = ?1, agility = ?2, focus = ?3, endurance = ?4, gold = ?5, exp = ?6, level = ?7, updated_at = datetime('now') WHERE id = 'main'",
        rusqlite::params![strength, agility, focus, endurance, pet.gold + gold, exp, level],
    ).map_err(|e| e.to_string())?;
    Ok((leveled_up, level))
}

// 成长日志统一使用下面单条语句插入（调用方在持锁连接上执行）：
// conn.execute(
//   "INSERT INTO pet_growth_log (id, event_type, amount) VALUES (?1, ?2, ?3)",
//   rusqlite::params![Uuid::new_v4().to_string(), event_type, amount],
// ).map_err(|e| e.to_string())?;

/// 宠物读取：不存在则初始化默认宠物，并按距上次更新的小时数衰减饱食度。
pub fn get_pet_inner(db: &Database) -> Result<Pet, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let exists: i64 = conn.query_row("SELECT COUNT(*) FROM pet", [], |r| r.get(0)).unwrap_or(0);
    if exists == 0 {
        conn.execute(
            "INSERT INTO pet (id, name, level, exp, strength, agility, focus, endurance, gold, satiety, form) VALUES ('main','土豆',1,0,0,0,0,0,0,100,'sprout')",
            [],
        ).map_err(|e| e.to_string())?;
    }
    let pet = read_pet_row(&conn)?;
    let hours_elapsed: i64 = conn.query_row(
        "SELECT CAST((julianday('now') - julianday(updated_at)) * 24 AS INTEGER) FROM pet WHERE id = 'main'",
        [],
        |r| r.get(0),
    ).unwrap_or(0);
    let new_satiety = reward::satiety_tick(pet.satiety, hours_elapsed);
    if new_satiety != pet.satiety {
        conn.execute(
            "UPDATE pet SET satiety = ?1, updated_at = datetime('now') WHERE id = 'main'",
            rusqlite::params![new_satiety],
        ).map_err(|e| e.to_string())?;
    }
    Ok(Pet {
        id: pet.id,
        name: pet.name,
        level: pet.level,
        exp: pet.exp,
        strength: pet.strength,
        agility: pet.agility,
        focus: pet.focus,
        endurance: pet.endurance,
        gold: pet.gold,
        satiety: new_satiety,
        form: pet.form,
        power: reward::power(pet.level, pet.strength, pet.agility, pet.focus, pet.endurance),
    })
}

#[tauri::command]
pub fn get_pet(db: tauri::State<'_, Database>) -> Result<Pet, String> {
    get_pet_inner(&db)
}
```

> 注：Task 3-5 中所有对 `pet_growth_log` 的插入统一使用上述单条语句写法。

- [ ] **Step 4: 验证通过**

Run: `cargo test -p app_lib`
Expected: 新增 4 个测试全部 PASS（含 `satiety_decays_after_hours` 的 55 断言）

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/db.rs
git commit -m "feat: 宠物读取与饱食度时间衰减"
```

---

### Task 4: 完成时间块结算命令 `complete_item`

**Files:**
- Modify: `src-tauri/src/db.rs`

**Interfaces:**
- Consumes: `reward::settle_completion`、`apply_exp`
- Produces:
  - `pub struct CompletedSummary { item_id: String, strength_exp: i32, agility_exp: i32, focus_exp: i32, endurance_exp: i32, gold: i32, level_up: bool, new_level: i32, form: String }`（derive Debug/Serialize/Deserialize/Clone）
  - `pub fn complete_item_inner(db: &Database, id: &str) -> Result<CompletedSummary, String>`
  - `#[tauri::command] pub fn complete_item(db: tauri::State<'_, Database>, id: String) -> Result<CompletedSummary, String>`
  - 内部辅助 `fn minutes_of(time: &str) -> i32`（解析 "HH:mm"，非法返回 0）

- [ ] **Step 1: 编写失败的测试**

```rust
#[test]
fn complete_item_rewards_and_updates_pet() {
    let db = temp_db();
    let _ = get_pet_inner(&db).unwrap();
    let conn = db.conn.lock().unwrap();
    let card_id = Uuid::new_v4().to_string();
    let item_id = Uuid::new_v4().to_string();
    conn.execute("INSERT INTO cards (id, title, collapsed, sort_order) VALUES (?1,'测试卡',0,0)", rusqlite::params![card_id]).unwrap();
    conn.execute("INSERT INTO items (id, card_id, text, description, start_time, end_time, done, sort_order) VALUES (?1,?2,'学习','','09:00','10:00',0,0)", rusqlite::params![&item_id, card_id]).unwrap();
    drop(conn);

    let sum = complete_item_inner(&db, &item_id).unwrap();
    assert_eq!(sum.strength_exp, 10);
    assert_eq!(sum.agility_exp, 5);
    assert_eq!(sum.gold, 10);
    assert!(!sum.level_up);

    let pet = get_pet_inner(&db).unwrap();
    assert_eq!(pet.gold, 10);
    assert_eq!(pet.strength, 10);
    assert_eq!(pet.agility, 5);
}

#[test]
fn complete_item_twice_errors() {
    let db = temp_db();
    let _ = get_pet_inner(&db).unwrap();
    let conn = db.conn.lock().unwrap();
    let card_id = Uuid::new_v4().to_string();
    let item_id = Uuid::new_v4().to_string();
    conn.execute("INSERT INTO cards (id, title, collapsed, sort_order) VALUES (?1,'测试卡',0,0)", rusqlite::params![card_id]).unwrap();
    conn.execute("INSERT INTO items (id, card_id, text, description, start_time, end_time, done, sort_order) VALUES (?1,?2,'学习','','09:00','10:00',0,0)", rusqlite::params![&item_id, card_id]).unwrap();
    drop(conn);

    complete_item_inner(&db, &item_id).unwrap();
    let err = complete_item_inner(&db, &item_id).unwrap_err();
    assert!(err.contains("已完成"));
}
```

- [ ] **Step 2: 运行验证失败**

Run: `cargo test -p app_lib`
Expected: FAIL（未定义 `complete_item_inner` / `CompletedSummary`）

- [ ] **Step 3: 实现**

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CompletedSummary {
    pub item_id: String,
    pub strength_exp: i32,
    pub agility_exp: i32,
    pub focus_exp: i32,
    pub endurance_exp: i32,
    pub gold: i32,
    pub level_up: bool,
    pub new_level: i32,
    pub form: String,
}

/// 解析 "HH:mm" 为当天分钟数，非法返回 0。
fn minutes_of(time: &str) -> i32 {
    let parts: Vec<&str> = time.split(':').collect();
    if parts.len() != 2 { return 0; }
    let h: i32 = parts[0].parse().unwrap_or(0);
    let m: i32 = parts[1].parse().unwrap_or(0);
    if !(0..=23).contains(&h) || !(0..=59).contains(&m) { return 0; }
    h * 60 + m
}

/// 完成一个时间块：标记 done、结算经验/金币（未接专注数据时按按时完成结算）、写成长日志。
pub fn complete_item_inner(db: &Database, id: &str) -> Result<CompletedSummary, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let (start, end, done): (String, String, i32) = conn.query_row(
        "SELECT start_time, end_time, done FROM items WHERE id = ?1",
        rusqlite::params![id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    ).map_err(|e| e.to_string())?;
    if done == 1 {
        return Err("事项已完成".into());
    }

    let planned = minutes_of(&end) - minutes_of(&start);
    // 暂无实际专注时长上报，默认按按时完成结算；延长奖励后续由番茄钟数据补充
    let r = reward::settle_completion(planned, planned);

    conn.execute(
        "UPDATE items SET done = 1 WHERE id = ?1",
        rusqlite::params![id],
    ).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO pet_growth_log (id, event_type, amount) VALUES (?1, 'completed_item', ?2)",
        rusqlite::params![Uuid::new_v4().to_string(), format!("+{}力量 +{}敏捷 +{}金币", r.strength_exp, r.agility_exp, r.gold)],
    ).map_err(|e| e.to_string())?;

    let (level_up, new_level) = apply_exp(&conn, r.strength_exp, r.agility_exp, r.focus_exp, r.endurance_exp, r.gold)?;
    let form = read_pet_row(&conn)?.form;

    Ok(CompletedSummary {
        item_id: id.to_string(),
        strength_exp: r.strength_exp,
        agility_exp: r.agility_exp,
        focus_exp: r.focus_exp,
        endurance_exp: r.endurance_exp,
        gold: r.gold,
        level_up,
        new_level,
        form,
    })
}

#[tauri::command]
pub fn complete_item(db: tauri::State<'_, Database>, id: String) -> Result<CompletedSummary, String> {
    complete_item_inner(&db, &id)
}
```

- [ ] **Step 4: 验证通过**

Run: `cargo test -p app_lib`
Expected: 2 个新测试 PASS

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/db.rs
git commit -m "feat: 完成时间块结算经验与金币"
```

---

### Task 5: 番茄钟结算改造 `log_pomodoro`

**Files:**
- Modify: `src-tauri/src/db.rs`（`log_pomodoro` 函数，保持命令签名不变）

**Interfaces:**
- Consumes: `apply_exp`
- Produces: 改造后 `pub fn log_pomodoro(db: tauri::State<'_, Database>, item_id: String, duration_minutes: i32) -> Result<(), String>`：插入会话后给宠物 +3 专注经验、+3 金币（保持原有返回 `()`，前端无需改动）

- [ ] **Step 1: 编写失败的测试**

```rust
#[test]
fn pomodoro_adds_focus_exp_and_gold() {
    let db = temp_db();
    let _ = get_pet_inner(&db).unwrap();
    log_pomodoro_inner(&db, "", 25).unwrap();
    let pet = get_pet_inner(&db).unwrap();
    assert_eq!(pet.focus, 3);
    assert_eq!(pet.gold, 3);
}
```

- [ ] **Step 2: 验证失败**

Run: `cargo test -p app_lib`
Expected: FAIL（未定义 `log_pomodoro_inner`）

- [ ] **Step 3: 实现**

将现有 `log_pomodoro` 拆为内部函数 + 命令封装，插入会话后追加宠物结算：

```rust
pub fn log_pomodoro_inner(db: &Database, item_id: &str, duration_minutes: i32) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO pomodoro_sessions (id, item_id, duration_minutes) VALUES (?1, ?2, ?3)",
        rusqlite::params![Uuid::new_v4().to_string(), item_id, duration_minutes],
    ).map_err(|e| e.to_string())?;

    // 番茄钟结算：+3 专注经验 +3 金币（规则来自 spec）
    apply_exp(&conn, 0, 0, 3, 0, 3)?;
    conn.execute(
        "INSERT INTO pet_growth_log (id, event_type, amount) VALUES (?1, 'pomodoro', ?2)",
        rusqlite::params![Uuid::new_v4().to_string(), format!("+3专注 +3金币({}分钟)", duration_minutes)],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn log_pomodoro(db: tauri::State<'_, Database>, item_id: String, duration_minutes: i32) -> Result<(), String> {
    log_pomodoro_inner(&db, &item_id, duration_minutes)
}
```

- [ ] **Step 4: 验证通过**

Run: `cargo test -p app_lib`
Expected: 新测试 PASS（focus == 3，gold == 3）

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/db.rs
git commit -m "feat: 番茄钟专注结算经验与金币"
```

---

### Task 6: 注册新命令并清理重复注册

**Files:**
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Consumes: Task 1-5 的所有命令（`get_pet` / `complete_item` / `log_pomodoro`）
- Produces: 无新接口；修复 `create_repeat_item` 重复注册

- [ ] **Step 1: 声明模块并注册命令**

在 `lib.rs` 顶部 `mod db;` 后追加 `mod reward;`。在 `invoke_handler` 列表中追加：

```rust
.invoke_handler(tauri::generate_handler![
    // ... 现有命令保留 ...
    db::get_pet,
    db::complete_item,
    // 其余原有命令
])
```

并**删除重复注册行**——当前列表第 35 行 `db::create_repeat_item,` 与第 41 行重复，保留一次（建议保留第 41 行 `db::create_repeat_item,` 并删除第 35 行）。

最终 `invoke_handler` 列表应包含：原 25 个唯一命令 + `db::get_pet` + `db::complete_item`。

- [ ] **Step 2: 编译验证**

Run: `cargo check`
Expected: 编译通过，无 warning

- [ ] **Step 3: 全量测试验证**

Run: `cargo test -p app_lib`
Expected: 全部测试 PASS（Task 1-5 的 9 个测试）

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: 注册宠物命令并清理重复注册"
```

---

## 范围说明

本计划覆盖 spec 第 9.1 节后端**核心闭环**（pet 系列表、结算引擎、宠物读写、完成/专注结算、命令注册）。**剩余后端子系统**（商城 `get_shop_items`/`buy_item`、闯关 `get_challenges`/`claim_challenge_reward`、成就 `get_achievements`、周擂台 `weekly_battle_result`、成长记录 `get_growth_log`）与前端 UI 一并归入**计划 B**（前端重构 + 宠物系统 UI），需在 A 完成后编写并执行。

## Self-Review

1. **Spec 覆盖**：核心数值规则（完成 +10/+5/延长封顶、番茄 +3、饱食度衰减与 8 折、战力公式、升级曲线）全部落地为 Task 2-5 的实现与测试；`get_pet` 幂等（Task 3）符合约束。商城/成就/闯关/周擂台明确移交计划 B。
2. **占位符扫描**：`log_growth` 占位函数已在 Task 3 实现注释中删除指令（实际不实现）；`CompleteSummary` 等结构体均完整定义；无 "TBD/TODO"。
3. **类型一致性**：`Reward` 字段 `strength_exp/agility_exp/focus_exp/endurance_exp/gold` 在 Task 2/4/5 一致；`apply_exp` 参数顺序 `(s, a, f, e, gold)` 在 Task 3/4/5 调用一致；`Pet.power` 在 Task 3 定义并返回；`log_pomodoro_inner(&db, "", 25)` 与命令签名一致。
4. **已知取舍**：`complete_item` 默认按"按时完成"结算（actual = planned），延长奖励待番茄钟数据上报机制落地（计划 B 前端绑定时间块时补充，符合 spec 5.2）。
