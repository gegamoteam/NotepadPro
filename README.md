<p align="center">
<img src="[https://deeqwntbjl.ufs.sh/f/QTnWo1gvRKxTtnZ45SFFJDW2CqHlc70ZVKQ9iwMXdvrIEbPx](https://deeqwntbjl.ufs.sh/f/QTnWo1gvRKxTtnZ45SFFJDW2CqHlc70ZVKQ9iwMXdvrIEbPx)" alt="NoteX Logo" width="80">
</p>

<h1 align="center">NoteX</h1>

<p align="center">
<strong>Notepad, but smarter.</strong>




A lightweight, performance-first desktop note-taking experience.
</p>

<p align="center">
<a href="[https://notepadpro.lol](https://notepadpro.lol)"><strong>Download at notepadpro.lol</strong></a>
</p>

<p align="center">
<img src="[https://img.shields.io/badge/version-0.1.0-blue.svg](https://img.shields.io/badge/version-0.1.0-blue.svg)" alt="Version">
<img src="[https://img.shields.io/badge/license-MIT-green.svg](https://img.shields.io/badge/license-MIT-green.svg)" alt="License">
<img src="[https://img.shields.io/badge/tauri-v2-orange.svg](https://img.shields.io/badge/tauri-v2-orange.svg)" alt="Tauri V2">
<img src="[https://img.shields.io/badge/react-19-61dafb.svg](https://img.shields.io/badge/react-19-61dafb.svg)" alt="React 19">
</p>

---

## 💡 The Philosophy

**NoteX** is built for those who love the speed of classic Notepad but need the power of modern Markdown. Built with **Tauri V2** and **React 19**, it stays out of your way with a sub-500ms cold start and local-first data ownership.

---

## ✨ Features

| Feature | Description |
| --- | --- |
| 🎨 **Native Feel** | Minimalist UI designed to feel like a native Windows utility. |
| 💾 **Auto-Save** | High-frequency saves (every 2s) so you never lose a thought. |
| 📁 **Local First** | Transparent file-system storage at `~/Documents/NoteX`. |
| 🔍 **Deep Search** | Full-text indexing to find notes across your entire library instantly. |
| 📝 **Markdown** | Live preview mode with syntax highlighting and local image rendering. |
| ⚡ **Performance** | Minimal memory footprint and near-instantaneous startup. |

---

## 📸 Preview

<p align="center">
<img width="100%" alt="NoteX Interface" src="[https://github.com/user-attachments/assets/740d7870-33ce-428b-8ea2-36ba7da86e6f](https://github.com/user-attachments/assets/740d7870-33ce-428b-8ea2-36ba7da86e6f)" />
</p>

---

## 🚀 Installation

### Prerequisites

* **[Rust](https://www.rust-lang.org/)** (Backend)
* **[Node.js](https://nodejs.org/)** (Frontend build)

### Build from Source

```bash
# Clone the repository
git clone https://github.com/gegamoteam/NotepadPro.git
cd NotepadPro

# Install dependencies
npm install

# Run in Development
npm run tauri dev

# Build Production Executable
npm run tauri build

```

The compiled `.exe` or `.msi` will be located in `src-tauri/target/release/bundle/`.

---

## 🛠️ Adding to PATH (Manual)

Since the current installer is in early alpha, you’ll need to add NoteX to your system PATH manually to launch it from the terminal using `notex`.

### **Windows Instructions**

1. Copy the path to the folder containing your `notex.exe`.
2. Press `Win + S` and search for **"Edit the system environment variables"**.
3. Click **Environment Variables** in the bottom right.
4. Under **User variables**, select **Path** and click **Edit**.
5. Click **New** and paste the folder path you copied in step 1.
6. Click **OK** on all windows and restart your terminal.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl + N` | Create New Note |
| `Ctrl + S` | Force Manual Save |
| `Ctrl + W` | Close Current Note |
| `Ctrl + F` | Global Find & Replace |
| `Ctrl + ,` | Open Settings |

---

## 🏗️ Architecture & Tech Stack

NoteX uses a decoupled architecture to ensure the UI remains fluid even when handling large directories.

* **Core:** [Tauri V2](https://tauri.app/) (Rust)
* **UI:** React 19 + TypeScript
* **Styling:** Vanilla CSS (for maximum performance)
* **Markdown:** `markdown-it` + `highlight.js`
* **Icons:** Lucide React

---

## ⚠️ Known Quirks

* **Dark Mode:** Currently experimental and a bit "crunchy" in certain UI elements. Works best in Light Mode for now.
* **Early Access:** We are prioritizing stability over fancy UI animations in these early builds.

---

## 🛠️ Roadmap

* [ ] **Multi-tab support** (Work on several notes at once)
* [ ] **Global Shortcuts** (Open NoteX from anywhere)
* [ ] **Cloud Sync** (Optional encrypted backup)
* [ ] **PDF Export** (Clean document generation)
* [ ] **Plugin System** (Community-driven extensions)

---

## 🤝 Contributing

We love PRs! Whether it's fixing a typo in the README or optimizing the Rust file-watcher:

1. Fork it.
2. Create your feature branch.
3. Commit your changes.
4. Push to the branch.
5. Open a Pull Request.

---

<p align="center">
Built with ❤️ by the <a href="[https://gegamo.xyz](https://gegamo.xyz)">Gegamo Team</a>




Official Website: <a href="[https://notepadpro.lol](https://notepadpro.lol)">notepadpro.lol</a>
</p>
