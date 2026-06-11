# Todo土豆 — AGENTS.md

## 语言
全程用中文（代码/注释/commit/文档）。

## Stack
- **Frontend**: React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4 + Radix UI
- **Desktop**: Tauri 2 (Rust + SQLite via rusqlite `bundled`)
- **Package manager**: pnpm
- **Drag & Drop**: `@atlaskit/pragmatic-drag-and-drop`
- react-router / TanStack React Query / Zustand 在 `package.json` 和 `main.tsx` 中有初始化，但 **App 只用 `useState` + `useRef` + `invoke`**。不要添加路由、query hooks 或 Zustand store。

## 架构
- **前端**: 单页面，`src/App.tsx` ~2000 行 + `src/components/DescriptionEditor.tsx`（Tiptap 富文本）。其他组件全部内联。无测试。
- **后端**: `src-tauri/src/` 三个文件：`main.rs`→`lib.rs`（注册 ~26 个 Tauri 命令）→`db.rs`（rusqlite 所有 SQL 操作）
- **数据库**: SQLite 自动建表 + `ALTER TABLE` 增量迁移。`todo.db` 存在 Tauri `app_data_dir` 下。`get_cards` 一次拉取所有 items 在内存中 join。
- **产品形态**: 每日时间块规划器。Card（便签）= 一天，Item（事项）= 时间块任务。

## 命令
| 命令 | 说明 |
|------|------|
| `pnpm dev` | Vite dev server 端口 **1420**，`strictPort: true` |
| `pnpm tauri dev` | 编译 Rust + 启动 Vite（`beforeDevCommand: "pnpm dev"`，Vite 自动启动） |
| `pnpm build` | `tsc -b && vite build`（先 typecheck 再构建） |
| `pnpm lint` | `eslint .`（flat config） |
| `pnpm preview` | `vite preview` |

## TypeScript 严格项（易踩坑）
- `verbatimModuleSyntax: true` → 类型导入必须用 `import type { ... }`，否则 build 报错
- `noUnusedLocals` / `noUnusedParameters` → 任何未使用变量/参数都会让 build 失败
- `erasableSyntaxOnly: true` → 不允许 `enum`、`namespace` 等运行时语法

## 主题系统
- 5 个预设：陶土/海洋/森林/暮色/石板（`App.tsx` `THEME_PRESETS`）
- 通过 CSS 变量切换，明暗模式用 `.dark` class + CSS 变量（非 Tailwind `dark:`）。
- 主题/强调色/明暗偏好保存在 `localStorage`。

## 快捷键（App 内实现）
| 按键 | 作用 |
|------|------|
| `N` | 新建便签（非输入框焦点时） |
| `Cmd+K` / `/` | 聚焦搜索 |
| `Esc` | 关闭弹窗 |

## Dev rules
- Vite HMR 自动热更新。`vite.config.ts` 里 `watch.ignored: ['**/src-tauri/**']`，改 Rust 不会触发 HMR。
- 所有 UI 改动前加载 `.agents/skills/design-taste-frontend/SKILL.md`（tasteskill）确保设计规范。注意该 skill 声明不适于 dashboard/产品类 UI，酌情采纳。
- 当用户说「打开/看看/运行」等，启动 dev server 并在浏览器打开 `http://localhost:1420`。

## 代码 quirks
- `create_repeat_item` 在 `lib.rs:35` 和 `lib.rs:41` 注册了两次（Tauri 容忍，后者覆盖前者）。
- `App.tsx` 中 `Card` interface 省略了 `collapsed`/`folded`（Rust 端有，作为多余 key 传入 JS）。
- `tauri.conf.json` 中 `csp: null` — 无 CSP 限制。
- Tauri 权限：`core:default` + `dialog:default` + `shell:default`（`capabilities/default.json`）。

## GitHub
- 仓库: `https://github.com/KangoLin/Todo.git`
- Commit 用中文，前缀 `feat:` / `fix:` / `chore:`
- 推送前检查 `git status` / `git diff`
