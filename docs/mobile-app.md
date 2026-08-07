# Todo土豆 — 移动端方向记录

> 记录日期：2026-08-06
> 来源：产品讨论（手机 App 化方向 + 电脑端手机 UI 预览）

---

## 一、目标

把 Todo土豆 做成手机 App，**上线 Google Play**（Android 商店）。

- 不做 iOS（Windows 环境无法签名/上架 iOS，需要 Mac + Xcode）
- 因此不需要 Mac，Windows 上即可构建 Android 安装包

---

## 二、技术路线（待最终确认）

### 首选：Tauri Mobile（推荐）

继续现有 Tauri 2 架构，官方支持 Windows 构建 Android APK/AAB。

- ✅ Rust 后端（~26 个命令 + SQLite）全部复用，零重写
- ✅ 前端 React 代码不变，只需移动端适配（触控、小屏布局）
- ⚠️ 需要安装：Android Studio + NDK + JDK 17
- ✅ 满足 Google Play Target API Level 要求

### 备选：Capacitor（Ionic 团队）

- ❌ 需要把整个 `db.rs` SQL 层重写为 TypeScript（@capacitor-community/sqlite）
- 只有未来还要上 iOS 时才更值得考虑

### 结论

**优先 Tauri Mobile**，核心价值在 Rust 数据层，重写纯属浪费。

---

## 三、电脑端查看手机 UI 的方案（已实施部分）

### 已安装：Responsively App ✅

- 项目：`responsively-org/responsively-app`（GitHub ~25.1k stars）
- 安装方式：`winget install --id Responsively.ResponsivelyApp`（v1.18.0）
- 位置：`C:\Users\xgame\AppData\Local\Programs\ResponsivelyApp\ResponsivelyApp.exe`
- 用法：打开后地址栏输入 `http://localhost:1420`，多设备（iPhone/iPad 等）并排实时预览、交互同步、HMR 支持
- 注意：桌面浏览器内核，Tauri `invoke`（Rust 命令）在浏览器里不可用，页面如报错需留意

### 备选（未实施，需要时再做）

| 项目 | Stars | 用途 |
|---|---|---|
| `marvelapp/devices.css` | ~3.9k | 纯 CSS 手机壳库 |
| `picturepan2/devices.css` | ~2.4k | 更新的纯 CSS 设备模型 |
| `react-device-frameset` | ~106 | React 手机壳组件（2022 停更） |
| `c0bra/deviceframe` | ~596 | CLI 截图套壳（出效果图用） |

可选：在 dev 模式用 URL 参数 `?device=phone` 显示手机壳层（上架版自动隐藏）。

---

## 四、开放问题

1. **数据同步**：手机端是全新空库（本地 SQLite），与桌面端数据不互通（无账号体系）
   - 可选：SQLite 文件导入/导出、备份恢复、或后续加同步服务
2. **移动端 UI 适配**：触控交互、安全区、小屏布局（待 Tauri Mobile 路线确认后展开）
3. Android 环境搭建：Android Studio + NDK + JDK（待用户决定是否开始）
