import { useState, useEffect, useCallback } from "react";
import { documentDir, join } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { filesystem } from "./services/filesystem";
import Sidebar from "./components/Sidebar";
// import NoteList from "./components/NoteList"; // Removed
import Editor from "./components/Editor";
import StatusBar from "./components/StatusBar";
import FindReplaceModal from "./components/FindReplaceModal";
import AdvancedSearch from "./components/AdvancedSearch";
import SettingsModal from "./components/SettingsModal";
import Onboarding from "./components/Onboarding";
import MenuBar from "./components/MenuBar";
import { useNotes } from "./hooks/useNotes";
import { useAutosave } from "./hooks/useAutosave";
import { settingsService, AutosaveSettings, ShortcutSettings } from "./services/settings";
import "./styles/global.css";

import "./styles/resizer.css";

function App() {
  const [rootPath, setRootPath] = useState<string>("");
  const [wordWrap, setWordWrap] = useState(true);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [isAdvSearchOpen, setIsAdvSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // New state
  const [showOnboarding, setShowOnboarding] = useState(false); // New state
  const [showStatusBar, setShowStatusBar] = useState(true);
  const [zoom, setZoom] = useState(14); // Font size in px

  // Settings / Dark Mode State (Placeholder for now)
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Autosave settings
  const [autosaveSettings, setAutosaveSettings] = useState<AutosaveSettings>(() =>
    settingsService.loadAutosaveSettings()
  );

  // Shortcut settings
  const [shortcutSettings, setShortcutSettings] = useState<ShortcutSettings>(() =>
    settingsService.loadShortcutSettings()
  );

  // Check Onboarding
  useEffect(() => {
    settingsService.hasSeenOnboarding().then(seen => {
      if (!seen) setShowOnboarding(true);
    });
  }, []);

  // Sidebar Resize State
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [isResizing, setIsResizing] = useState(false);
  const isCollapsed = sidebarWidth < 80;

  useEffect(() => {
    // Apply theme
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Resize Handlers
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing) {
      let newWidth = mouseMoveEvent.clientX;
      if (newWidth < 50) newWidth = 50; // Minimum icon mode width
      if (newWidth > 600) newWidth = 600; // Max width
      setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  // Responsive check
  // Removed isLargeScreen logic, always 2-pane

  // Editor interaction refs/handlers
  // ...

  // Initialize path
  useEffect(() => {
    async function init() {
      try {
        const docs = await documentDir();
        const appDir = await join(docs, "NoteX");
        await filesystem.ensureDir(appDir);
        setRootPath(appDir);
        // setSelectedFolderPath(appDir); // Removed
      } catch (e) {
        console.error("Failed to get/create document dir", e);
      }
    }
    init();
  }, []);

  const {
    activeNote,
    activeNoteContent,
    fileSystemRoot,
    openNote,
    saveActiveNote,
    updateContent,
    refreshNotes: _refreshNotes,
    createNote: _createNote, // Internal
    // createFolder, // Removed
    deleteItem,
    renameItem,
    pinnedPaths,
    togglePin,
    isDirty,
    isSaving,
    sortBy,
    setSortBy
  } = useNotes(rootPath);

  const normalizeFilename = (filename: string, fallbackExtension: string) => {
    const trimmed = filename.trim();
    if (!trimmed) return "";
    const lastDot = trimmed.lastIndexOf(".");
    if (lastDot <= 0 || lastDot === trimmed.length - 1) {
      return `${trimmed}.${fallbackExtension}`;
    }
    return trimmed;
  };

  const ensureUniqueFilename = (filename: string) => {
    const existing = new Set(fileSystemRoot.map(note => note.name.toLowerCase()));
    if (!existing.has(filename.toLowerCase())) return filename;
    const dotIndex = filename.lastIndexOf(".");
    const base = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
    const ext = dotIndex > 0 ? filename.slice(dotIndex) : "";
    let counter = 2;
    let candidate = `${base} (${counter})${ext}`;
    while (existing.has(candidate.toLowerCase())) {
      counter += 1;
      candidate = `${base} (${counter})${ext}`;
    }
    return candidate;
  };

  const createNewNote = async () => {
    try {
      setSortBy("modified");
      const filename = ensureUniqueFilename("New Note.txt");
      const path = await _createNote(undefined, filename);
      const name = path.split('\\').pop() || "New Note.txt";
      await openNote({ path, name, isFolder: false, lastModified: Date.now() });
    } catch (e) { console.error(e); }
  };

  const createNoteWithName = async (filename: string) => {
    try {
      const normalized = normalizeFilename(filename, "txt");
      if (!normalized) return;
      setSortBy("modified");
      const uniqueName = ensureUniqueFilename(normalized);
      const path = await _createNote(undefined, uniqueName);
      const name = path.split('\\').pop() || uniqueName;
      await openNote({ path, name, isFolder: false, lastModified: Date.now() });
    } catch (e) { console.error(e); }
  };

  const createNoteWithExtension = useCallback(async (extension: string) => {
    try {
      setSortBy("modified");
      const baseName = `New Note.${extension}`;
      const filename = ensureUniqueFilename(baseName);
      const path = await _createNote(undefined, filename);
      const name = path.split('\\').pop() || filename;
      await openNote({ path, name, isFolder: false, lastModified: Date.now() });
    } catch (e) { console.error(e); }
  }, [setSortBy, ensureUniqueFilename, _createNote, openNote]);

  // Auto-save: Controlled by settings - only runs when enabled AND dirty
  useAutosave(saveActiveNote, autosaveSettings.interval, autosaveSettings.enabled && isDirty);

  // Handler for autosave settings change
  const handleAutosaveChange = (settings: AutosaveSettings) => {
    setAutosaveSettings(settings);
    settingsService.saveAutosaveSettings(settings);
  };

  // Handler for shortcut settings change
  const handleShortcutChange = async (settings: ShortcutSettings) => {
    setShortcutSettings(settings);
    settingsService.saveShortcutSettings(settings);
    try {
      if (settings.enabled) {
        await invoke('register_shortcut', { shortcut: settings.shortcut });
      } else {
        await invoke('unregister_shortcut');
      }
    } catch (e) {
      console.error('Failed to update global shortcut:', e);
    }
  };

  // Sync shortcut settings on mount (in case user changed shortcut and reloaded)
  useEffect(() => {
    const syncShortcut = async () => {
      try {
        if (shortcutSettings.enabled) {
          await invoke('register_shortcut', { shortcut: shortcutSettings.shortcut });
        } else {
          await invoke('unregister_shortcut');
        }
      } catch (e) {
        console.error('Failed to sync global shortcut on mount:', e);
      }
    };
    syncShortcut();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for global shortcut "new note" event from Rust backend
  useEffect(() => {
    const unlisten = listen('shortcut-new-note', () => {
      // Re-read the latest settings from localStorage to get current extension
      const latestSettings = settingsService.loadShortcutSettings();
      createNoteWithExtension(latestSettings.defaultExtension || 'txt');
    });
    return () => { unlisten.then(fn => fn()); };
  }, [createNoteWithExtension]);

  // Shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            saveActiveNote();
            break;
          case 'n':
            e.preventDefault();
            createNewNote();
            break;
          case 'f':
            e.preventDefault();
            setIsFindOpen(true);
            break;
          case ',': // Command + , usually
            e.preventDefault();
            setIsSettingsOpen(true);
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveActiveNote, rootPath]);

  // Handler for directory change
  const handleChangeRoot = async () => {
    // Allow user to pick (not implemented yet without dialog plugin, just prompt text for now)
    const input = prompt("Enter full path to new notes folder:", rootPath);
    if (input && input !== rootPath) {
      setRootPath(input);
    }
  };

  if (!rootPath) return <div>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", overflow: "hidden" }}>
      <MenuBar
        onNew={createNewNote}
        onNewWindow={() => alert("New Window not implemented yet")}
        onOpen={() => alert("Open file dialog not implemented")}
        onSave={saveActiveNote}
        onSaveAs={() => alert("Save As not implemented")}
        onPrint={() => window.print()}
        onExit={() => window.close()}

        onUndo={() => document.execCommand('undo')}
        onCut={() => document.execCommand('cut')}
        onCopy={() => document.execCommand('copy')}
        onPaste={() => document.execCommand('paste')}
        onDelete={() => document.execCommand('delete')}
        onFind={() => setIsFindOpen(true)}
        onFindInFiles={() => setIsAdvSearchOpen(true)}
        onReplace={() => setIsFindOpen(true)}
        onSelectAll={() => document.execCommand('selectAll')}
        onTimeDate={() => {
          updateContent(activeNoteContent + new Date().toLocaleString());
        }}

        wordWrap={wordWrap}
        onToggleWordWrap={() => setWordWrap(!wordWrap)}
        onFont={() => setIsSettingsOpen(true)} // Hijacked Font button for Settings for now

        showStatusBar={showStatusBar}
        onToggleStatusBar={() => setShowStatusBar(!showStatusBar)}
        onZoomIn={() => setZoom(z => z + 2)}
        onZoomOut={() => setZoom(z => Math.max(8, z - 2))}
        onRestoreZoom={() => setZoom(14)}
        onSettings={() => setIsSettingsOpen(true)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
        rootPath={rootPath}
        onChangeRootPath={handleChangeRoot}
        autosaveSettings={autosaveSettings}
        onAutosaveChange={handleAutosaveChange}
        shortcutSettings={shortcutSettings}
        onShortcutChange={handleShortcutChange}
      />

      <Onboarding
        isOpen={showOnboarding}
        onClose={() => {
          setShowOnboarding(false);
          settingsService.setSeenOnboarding();
        }}
        onEnableShortcut={(ext: string) => handleShortcutChange({ enabled: true, shortcut: 'Ctrl+Shift+N', defaultExtension: ext })}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar: Resizable */}
        <div style={{
          width: isCollapsed ? 50 : sidebarWidth,
          minWidth: isCollapsed ? 50 : 150,
          maxWidth: isCollapsed ? 50 : 600,
          display: "flex", flexDirection: "column",
          borderRight: "1px solid var(--border-color)",
          transition: isResizing ? 'none' : 'width 0.2s ease',
          backgroundColor: "var(--sidebar-bg)"
        }}>
          <Sidebar
            notes={fileSystemRoot}
            activeNotePath={activeNote?.path}
            onOpenNote={openNote}
            onCreateNote={createNewNote}
            onCreateNoteWithName={createNoteWithName}
            onCreateNoteWithExtension={createNoteWithExtension}
            onDelete={deleteItem}
            onRename={renameItem}
            pinnedPaths={pinnedPaths}
            onTogglePin={togglePin}
            sortBy={sortBy}
            onSortChange={setSortBy}
            isCollapsed={isCollapsed}
            onAdvancedSearch={() => setIsAdvSearchOpen(true)}
          />
        </div>

        {/* Resizer Handle */}
        <div
          className={`resizer ${isResizing ? 'resizing' : ''}`}
          onMouseDown={startResizing}
        />

        {/* Editor Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", position: 'relative', minWidth: "300px" }}>
          <FindReplaceModal
            isOpen={isFindOpen}
            onClose={() => setIsFindOpen(false)}
            onFind={(query: string) => alert(`Find: ${query}`)}
            onReplace={(q: string, r: string) => {
              // Basic replace in content (only replaces first occurrence usually unless regex)
              // For a real app, this should highlight/select in editor.
              // For now, simple content update:
              updateContent(activeNoteContent.replace(q, r));
            }}
            onReplaceAll={(q: string, r: string) => {
              try {
                const regex = new RegExp(q, 'g');
                updateContent(activeNoteContent.replace(regex, r));
              } catch (e) {
                alert("Invalid Regex");
              }
            }}
          />

          <AdvancedSearch
            isOpen={isAdvSearchOpen}
            onClose={() => setIsAdvSearchOpen(false)}
            rootPath={rootPath}
            onOpenNote={openNote}
          />
          <Editor
            content={activeNoteContent}
            onChange={updateContent}
            wordWrap={wordWrap}
            onCursorChange={(line, col) => setCursor({ line, col })}
            fontSize={zoom}
            filePath={activeNote?.path}
            rootPath={rootPath}
          />
          {showStatusBar && (
            <StatusBar
              filePath={activeNote?.name}
              line={cursor.line}
              col={cursor.col}
              isSaving={isSaving}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
