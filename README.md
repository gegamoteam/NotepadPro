<p align="center">
  <img src="https://deeqwntbjl.ufs.sh/f/QTnWo1gvRKxTtnZ45SFFJDW2CqHlc70ZVKQ9iwMXdvrIEbPx" alt="NoteX Logo" width="80">
</p>

<h1 align="center">NoteX</h1>

<p align="center">
  <strong>Notepad, but smarter.</strong>
</p>

<p align="center">
  A lightweight, performance-first desktop note-taking application built with Tauri V2, React, and TypeScript.
</p>
WARNING!!, Currently i didnt implement adding to PATH on the installer, you will have to add it manually via enviroment variables. i will add it soon
<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#keyboard-shortcuts">Shortcuts</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.8.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/tauri-v2-orange.svg" alt="Tauri V2">
  <img src="https://img.shields.io/badge/react-19-61dafb.svg" alt="React 19">
</p>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎨 **Native Feel** | Minimalist UI that feels right at home on Windows |
| 💾 **Auto-Save** | Never lose work — saves every 2 seconds and on exit |
| 📁 **File Organization** | Real file-system based folders (`~/Documents/NoteX`) |
| 🔍 **Full-Text Search** | Instantly search across all your notes |
| 📝 **Markdown Support** | Preview mode with syntax-highlighted code blocks |
| 🖼️ **Embedded Media** | Render local images directly in Markdown notes |
| ⚡ **Fast Startup** | Opens in under 500ms with minimal memory usage |
| 🔧 **Settings** | Configurable autosave interval and preferences |
| 🌙 **Modern UI** | Clean, distraction-free writing experience |

---

## 📸 Screenshots

<!-- Add screenshots of your app here -->
<!-- ![NoteX Screenshot](screenshots/main.png) -->
<img width="999" height="581" alt="image" src="https://github.com/user-attachments/assets/740d7870-33ce-428b-8ea2-36ba7da86e6f" />

---

## 🚀 Installation

### Prerequisites

Make sure you have the following installed:

- **[Rust](https://www.rust-lang.org/tools/install)** — Required for the Tauri backend
- **[Node.js](https://nodejs.org/)** (LTS recommended) — For the frontend build system

### Clone & Install

```bash
# Clone the repository
git clone https://github.com/gegamoteam/NotepadPro.git
cd NotepadPro

# Install dependencies
npm install
```

### Run in Development Mode

```bash
npm run tauri dev
```

This starts the Vite dev server and launches the Tauri window with hot-reload enabled.

### Build for Production

```bash
npm run tauri build
```

The compiled executable (`.exe` / `.msi`) will be in `src-tauri/target/release/bundle/`.

---

## 💻 Usage

1. **Launch NoteX** — Double-click the executable or run from the command line
2. **Create Notes** — Use the sidebar or press `Ctrl + N`
3. **Organize** — Create folders to group related notes
4. **Search** — Use the search bar to find notes instantly
5. **Markdown** — Write in Markdown and toggle preview mode

All notes are stored as plain `.txt` or `.md` files in your `Documents/NoteX` folder — no proprietary formats, full data ownership.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + N` | New Note |
| `Ctrl + S` | Save Note (Manual) |
| `Ctrl + W` | Close Note |
| `Ctrl + F` | Find & Replace |
| `Ctrl + ,` | Open Settings |

---

## 🏗️ Architecture

```
notex/
├── src/                 # React frontend
│   ├── components/      # UI components (Editor, Sidebar, etc.)
│   ├── hooks/           # Custom React hooks
│   ├── services/        # File service layer
│   └── styles/          # CSS stylesheets
├── src-tauri/           # Rust backend
│   ├── src/             # Tauri commands & file operations
│   └── tauri.conf.json  # App configuration
└── public/              # Static assets
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Rust + Tauri V2 |
| **Frontend** | React 19 + TypeScript |
| **Bundler** | Vite |
| **Styling** | Vanilla CSS |
| **Icons** | Lucide React |
| **Markdown** | markdown-it + highlight.js |

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow the existing code style
- Write meaningful commit messages
- Test your changes before submitting
- Update documentation as needed

---

## 📝 Roadmap

- [ ] Multi-tab support
- [ ] Theme customization (dark/light modes)
- [ ] Export to PDF
- [ ] Cloud sync (optional)
- [ ] Plugin system

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) — For the amazing Rust-based framework
- [React](https://react.dev/) — For the frontend library
- [Lucide](https://lucide.dev/) — For beautiful icons

---

<p align="center">
  Made with ❤️ by the <a href="https://gegamo.xyz">Gegamo Team</a>
</p>

<p align="center">
  <a href="https://gegamo.xyz">gegamo.xyz</a> • <a href="https://github.com/gegamoteam/NotepadPro">GitHub</a>
</p>
