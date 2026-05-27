# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Voke is an Electron-based desktop application (Windows/macOS/Linux) that combines ASR with LLMs for AI-powered voice transcription and text processing. Three core modes:
- **Polish Mode** — long-press Right Alt to speak, release to polish text via LLM
- **Command Mode** — select text, long-press Right Alt to issue editing commands
- **Ask Mode** — long-press Right Ctrl to ask questions and get AI answers

## Commands

```bash
pnpm install          # Install dependencies

pnpm run dev          # Run in development (Electron + Vite hot reload concurrently)
pnpm run dev:main     # Electron main process only
pnpm run dev:renderer # Vite renderer only

pnpm run lint         # ESLint check on src/
pnpm run build:win    # Build installer for Windows
pnpm run build:mac    # Build for macOS
pnpm run build:linux  # Build for Linux
pnpm run clean        # Cleanup build artifacts
```

No test runner is configured in this project.

## Architecture

### Multi-Process Electron Model

**Main process** (`main.js`) boots a set of manager classes and wires them together via dependency injection. Each manager handles one concern:

| Manager | File | Responsibility |
|---|---|---|
| EnvironmentManager | `src/helpers/environment.js` | App paths, data dirs |
| WindowManager | `src/helpers/windowManager.js` | All Electron windows lifecycle |
| DatabaseManager | `src/helpers/database.js` | SQLite via better-sqlite3 |
| HotkeyManager | `src/helpers/hotkeyManager.js` | Global hotkeys via uiohook-napi |
| AliyunASRManager | `src/helpers/aliyunASRManager.js` | DashScope ASR API + audio pipeline |
| ClipboardManager | `src/helpers/clipboard.js` | Cross-platform clipboard |
| TrayManager | `src/helpers/tray.js` | System tray |
| IPCHandlers | `src/helpers/ipcHandlers.js` | Central IPC dispatcher |
| LogManager | `src/helpers/logManager.js` | Centralized logging |

**Preload script** (`preload.js`) is the security bridge — it exposes a typed `window.electronAPI` object to the renderer via `contextBridge`. All renderer↔main communication must go through this interface.

**Renderer process** (`src/`) is a React 19 + Vite app. It communicates with main exclusively through `window.electronAPI` (IPC channels).

### Renderer Structure

- `src/App.jsx` — root layout with sidebar navigation and page routing (no router library; state-based)
- `src/components/pages/` — one file per "page" (HomePage, SettingsPage, HistoryPage, etc.)
- `src/components/ui/` — shadcn/ui components (Radix primitives + Tailwind)
- `src/hooks/` — custom hooks: `useHotkey`, `useRecording`, `useTextProcessing`, `usePermissions`, `useWindowDrag`
- `src/lib/utils.ts` — exports `cn()` (clsx + tailwind-merge)

### IPC Pattern

IPC channel names use kebab-case (e.g., `start-recording`, `process-text`). Handlers registered in `ipcHandlers.js` receive calls from the renderer via `window.electronAPI.*`. Main-to-renderer pushes use `webContents.send()`.

### Windows

The app manages multiple Electron windows: main window, floating overlay (shown during recording/processing), settings window, history window, and a tray control panel.

### Database

SQLite database (better-sqlite3, synchronous API). Three tables: `transcriptions`, `settings` (key-value; API keys are encrypted), `hotwords`. Schema initialized in `src/helpers/database.js`.

### Build Pipeline

- Renderer builds to `src/dist/` via Vite
- Electron-builder packages everything; native modules (`better-sqlite3`, `ffmpeg-static`, `uiohook-napi`) are asar-unpacked
- Vendor/UI/utils chunks split for renderer bundle optimization

## Key Conventions

- Managers are instantiated once in `main.js` and passed as constructor arguments (dependency injection)
- React components are functional with hooks; the only class component is `ErrorBoundary` in `src/main.jsx`
- Heavy pages (e.g., SettingsPage) use `React.lazy` for code splitting
- In dev mode, main process adds a 2-second startup delay to wait for Vite to initialize
- Debug info is attached to `window.debug` in development mode
