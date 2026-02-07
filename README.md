# NoteX — Notepad, but smarter

NoteX is a lightweight, performance-first desktop note-taking application built with Tauri V2, React, and TypeScript. It mimics the native Windows Notepad experience while adding essential modern features like auto-save, folder organization, and instant search.

> “Notepad, but with memory, structure, and search — without losing simplicity.”

## Features

- **Native Feel**: Minimalist UI, identical to Notepad behavior.
- **Auto-Save**: Never lose work again. Autosaves every 2 seconds and on exit.
- **Organization**: Real file-system based folder structure (`~/Documents/NoteX`).
- **Search**: Full-text search across all notes.
- **Performance**: Instant startup (<500ms), low memory footprint.

## Prerequisites

Before running the project, ensure you have:

- **Rust**: [Install Rust](https://www.rust-lang.org/tools/install)
- **Node.js**: [Install Node.js (LTS)](https://nodejs.org/)
- **Tauri CLI**: (Optional, installed via npm)

## Installation & Running

1.  **Clone the repository** (if applicable) or navigate to the project folder.
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Run in Development Mode**:
    ```bash
    npm run tauri dev
    ```
    This will start the Vite server and launch the Tauri window.

## Building for Production

To create an optimized executable (`.exe` or `.msi`):

```bash
npm run tauri build
```

The output will be located in `src-tauri/target/release/bundle/`.

## Architecture

- **Backend**: Rust (Tauri V2) - Handles all file system operations safely.
- **Frontend**: React + TypeScript - Optimized for speed, no heavy UI frameworks.
- **Storage**: Plain `.txt` files in `Documents/NoteX`. No proprietary formats.

## Key Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl + N | New Note |
| Ctrl + S | Save Note (Manual) |
| Ctrl + W | Close Note |

## License

MIT
