# 🚀 ReleaseFlow — GitHub Release Manager

> A desktop app for managing GitHub releases with a clean UI, AI-powered release notes, and integrated build tools.

Built with **Electron + React + Vite**. Designed for developers who want a fast, no-friction way to build and publish GitHub releases without touching the terminal.

---

## ✨ Features

### 📦 Create Release
- Set a **version tag** with auto-suggestion based on `package.json`
- Write a **release title** manually or generate it automatically with AI
- Write **release notes** in Markdown with a live **Preview / Edit** toggle
- Full **GitHub Flavored Markdown** support (tables, alerts, checkboxes)

### 🤖 AI Release Notes (DeepSeek)
- Click **AI Format** and describe what changed in plain text
- The AI automatically generates:
  - A short, professional **release title**
  - Structured **release notes** with sections (✨ What's New, 🐛 Bug Fixes, 🔧 Improvements)
- Your **DeepSeek API key** is saved locally and never leaves your machine

### 📜 Release History
- View all GitHub **releases** and **git tags** for the selected project
- Separate tabs for full releases and tag-only entries
- Delete releases/tags directly from the UI
- Open releases on GitHub with one click

### 🔨 Build Console
- Run your project's build command directly from the app
- Real-time log output with ANSI stripping
- Auto-opens the output folder (`dist/` or `release/`) on success
- Keyboard shortcuts: `Ctrl+Enter` to build, `Esc` to clear, `Ctrl+C` to copy all logs

### 🎨 UI / UX
- Dark & Light theme with persistent preference
- Glassmorphism design system
- Animated preloader on startup
- Toast notification system for all actions
- Custom frameless window with native title bar controls

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Electron 39 |
| Frontend | React 19 + Vite 7 |
| Styling | CSS Variables + Glassmorphism |
| Markdown | react-markdown + remark-gfm + remark-github-alerts |
| AI | DeepSeek API (`deepseek-chat`) |
| GitHub | GitHub CLI (`gh`) |
| Packaging | electron-builder + NSIS |

---

## ⚙️ Requirements

- [Node.js](https://nodejs.org/) v18+
- [GitHub CLI](https://cli.github.com/) — must be installed and authenticated (`gh auth login`)
- A [DeepSeek API key](https://platform.deepseek.com/) (only needed for AI features)

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Build the installer
npm run build
```

The installer will be output to the `release/` folder as a `.exe` (NSIS, one-click install).

---

## 🗂️ Project Structure

```
├── electron/
│   ├── main.js         # Main process: IPC handlers, GitHub CLI, AI API, build runner
│   └── preload.js      # Context bridge: exposes safe APIs to renderer
├── src/
│   ├── components/
│   │   ├── CreateRelease.jsx   # Release form + AI modal
│   │   ├── ReleaseHistory.jsx  # Release & tag list
│   │   ├── BuildLogs.jsx       # Terminal/build console
│   │   ├── Sidebar.jsx         # Navigation + project info
│   │   ├── Header.jsx          # App header + theme toggle
│   │   ├── Modal.jsx           # Confirm modals (delete, publish)
│   │   ├── Toast.jsx           # Toast notification system
│   │   └── EmptyState.jsx      # No project selected screen
│   ├── styles/                 # Per-component CSS files
│   ├── App.jsx                 # Root component + state
│   └── main.jsx                # React entry point
├── build/                      # Electron builder resources (icons, installer script)
└── package.json
```

---

## 🔑 AI Setup

1. Get a free API key from [DeepSeek Platform](https://platform.deepseek.com/)
2. Open the app and go to **Create Release**
3. Click **AI Format** → enter your key → click **Save Key**
4. The key is stored locally in `AppData/Roaming/ThomasThanos/GithubReleaseManager/grm-config.json`

---

## 📋 How to Use

1. **Select a project folder** using the sidebar
2. The app reads `package.json` to suggest the next version and build command
3. Fill in the **Version Tag** and **Release Title** (or use AI to generate both)
4. Write your **Release Notes** in Markdown (or use AI Format)
5. Click **Publish Release** — the app uses `gh` CLI to create the release on GitHub
6. Optionally trigger a **build** from the Build Console tab before releasing

---

## 🪟 Windows Build

The app builds a one-click NSIS installer for Windows with:
- Desktop & Start Menu shortcuts
- Per-user install (no admin required)
- English and Greek installer language support
- Auto-cleanup of app data on uninstall

---

## 📄 License

MIT
