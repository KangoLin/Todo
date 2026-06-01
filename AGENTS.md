# Todo土豆 — AGENTS.md

## Language rule
**Always respond in Chinese.** All communication, code comments, commit messages, and documentation must be written in Chinese unless the user explicitly requests otherwise.

## Stack
- **Frontend**: React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4
- **Desktop** (planned): Tauri 2 (Rust + SQLite)
- **State**: TanStack React Query 5 + Zustand 5
- **Package manager**: pnpm

## Commands
| Command | What it does |
|---------|-------------|
| `pnpm dev` | Vite dev server on port **1420**（仅前端） |
| `pnpm tauri dev` | Tauri dev（编译 Rust + 启动 Vite + 原生窗口） |
| `pnpm build` | `tsc -b && vite build` |
| `pnpm lint` | ESLint with flat config |

## Dev rule
每次改动后 **不要重新打开工具**。Vite HMR 会自动热更新已打开的页面。如果需要刷新，直接刷新浏览器已打开的页面即可。

## Open tool rule
当用户说「打开工具」「看看」「打开看看」「运行」等类似表达时，启动 Vite dev server 并在浏览器中打开 `http://localhost:1420/`。
