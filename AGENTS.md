# Todo土豆 — AGENTS.md

## Language rule
**Always respond in Chinese.** All communication, code comments, commit messages, and documentation must be written in Chinese unless the user explicitly requests otherwise.

## Plan tracking
Each time a task is completed, **update `制作计划.md`** — move the item from ❌ to ✅ and update its status. Then **confirm the next step** from the plan before proceeding.

## Stack
- **Desktop**: Tauri 2 (Rust + SQLite)
- **Frontend**: React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4
- **State**: TanStack React Query 5 (server), Zustand 5 (UI)
- **DnD**: @atlaskit/pragmatic-drag-and-drop
- **Editor**: TipTap (rich text card descriptions as JSON)
- **Package manager**: pnpm

## Commands
| Command | What it does |
|---------|-------------|
| `pnpm dev` | Vite dev server on port **1420** (frontend-only) |
| `pnpm tauri dev` | Tauri dev（编译 Rust + 启动 Vite，弹出原生窗口） |
| `pnpm build` | `tsc -b && vite build` |
| `pnpm lint` | ESLint with flat config (`eslint.config.js`) |
| `pnpm tauri` | Tauri CLI passthrough |

## Open tool rule
当用户说「打开工具」「看看」「打开看看」「运行」等类似表达时，**自动执行 `pnpm tauri dev`** 启动完整应用（编译 Rust + 启动 Vite，弹出原生窗口），然后**在浏览器中打开** `http://localhost:1420/`。不要询问，直接运行。

注意：`pnpm dev` 仅启动前端 Vite 服务器，没有 Rust 后端，所有数据操作（创建项目/看板/卡片等）会因 Tauri `invoke` 调用无后端响应而失败。

## Architecture
- **Frontend** (`src/`): routes at `App.tsx` — `/projects`, `/project/:projectId`, `/board/:boardId`, `/search`
- **Backend** (`src-tauri/src/`): Tauri commands in `commands/`, SQLite queries in `db/`, models in `models/`
- **IPC**: All data flows through `invoke()` calls defined in `src/lib/tauri-api.ts` shelling out to Rust commands registered in `lib.rs`
- **DB**: SQLite with WAL mode, migrations via `include_str!()` + `PRAGMA user_version` (see `db/migrations.rs`)
- **FTS5**: Full-text search on cards via `cards_fts` virtual table with sync triggers

## Project state
- **Early stage**: only 1 commit, many component directories empty (`components/board/`, `components/project/`, etc.)
- Planning documents exist as `调研总结报告.md` and `项目功能与架构规划.md` (Chinese) — reference only, may be stale

## TypeScript quirks
- `verbatimModuleSyntax: true` — use `import type` for type-only imports
- Project references: `tsc -b` compiles both `tsconfig.app.json` and `tsconfig.node.json`

## Rust backend notes
- Library crate named `app_lib`, entrypoint `main.rs` calls `app_lib::run()`
- `rusqlite` with `bundled` feature (no system SQLite needed)
- Logging via `tauri-plugin-log` (debug builds only)
- Tauri v2 capability system (`capabilities/default.json`)

## Stale files to ignore
- `build-rust.bat` references a non-existent directory `E:\Todo土豆` — do not use
