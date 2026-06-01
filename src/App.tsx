import { useState, useEffect, useCallback, useMemo } from "react";
import { documentDir, join } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { openUrl } from "@tauri-apps/plugin-opener";
import { filesystem } from "./services/filesystem";
import Sidebar from "./components/Sidebar";
// import NoteList from "./components/NoteList"; // Removed
import Editor from "./components/Editor";
import StatusBar from "./components/StatusBar";
import FindReplaceModal from "./components/FindReplaceModal";
import AdvancedSearch from "./components/AdvancedSearch";
import SettingsModal from "./components/SettingsModal";
import Onboarding from "./components/Onboarding";
import InputModal from "./components/InputModal";
import MenuBar from "./components/MenuBar";
import { useNotes } from "./hooks/useNotes";
import { useAutosave } from "./hooks/useAutosave";
import { settingsService, AutosaveSettings, ShortcutSettings } from "./services/settings";
import "./styles/global.css";

import "./styles/resizer.css";

function App() {
  const [rootPath, setRootPath] = useState<string>(() => settingsService.loadRootPath() || "");
  const [wordWrap, setWordWrap] = useState(() => settingsService.loadWordWrap());
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [isGoToOpen, setIsGoToOpen] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState("");
  const [isAdvSearchOpen, setIsAdvSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // New state
  const [showOnboarding, setShowOnboarding] = useState(false); // New state
  const [showStatusBar, setShowStatusBar] = useState(() => settingsService.loadShowStatusBar());
  const [zoom, setZoom] = useState(() => settingsService.loadZoom()); // Font size in px

  // Settings / Dark Mode State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => settingsService.loadTheme());

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
        const savedRoot = settingsService.loadRootPath();
        if (savedRoot) {
          await filesystem.ensureDir(savedRoot);
          setRootPath(savedRoot);
        } else {
          const docs = await documentDir();
          const appDir = await join(docs, "NoteX");
          await filesystem.ensureDir(appDir);
          setRootPath(appDir);
          settingsService.saveRootPath(appDir);
        }
      } catch (e) {
        console.error("Failed to get/create document dir", e);
      }
    }
    init();
  }, []);

  // Auto-save settings effects
  useEffect(() => {
    settingsService.saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    settingsService.saveWordWrap(wordWrap);
  }, [wordWrap]);

  useEffect(() => {
    settingsService.saveZoom(zoom);
  }, [zoom]);

  useEffect(() => {
    settingsService.saveShowStatusBar(showStatusBar);
  }, [showStatusBar]);

  useEffect(() => {
    if (rootPath) {
      settingsService.saveRootPath(rootPath);
    }
  }, [rootPath]);

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

  const sidebarNotes = useMemo(() => {
    if (activeNote && !fileSystemRoot.some(note => note.path === activeNote.path)) {
      return [activeNote, ...fileSystemRoot];
    }
    return fileSystemRoot;
  }, [fileSystemRoot, activeNote]);

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

  const handleOpenExternalFile = useCallback(async (filePath: string) => {
    try {
      const name = filePath.split(/[/\\]/).pop() || filePath;
      await openNote({
        path: filePath,
        name,
        isFolder: false,
        lastModified: Date.now()
      });
    } catch (e) {
      console.error("Failed to open external file:", e);
      alert(`Failed to open file: ${e}`);
    }
  }, [openNote]);

  const handleOpenFileMenu = useCallback(async () => {
    try {
      const selected = await filesystem.openFileDialog();
      if (selected) {
        await handleOpenExternalFile(selected);
      }
    } catch (e) {
      console.error("Open file error:", e);
    }
  }, [handleOpenExternalFile]);

  const handleSaveAsMenu = useCallback(async () => {
    if (!activeNote) {
      alert("No active note to save!");
      return;
    }
    try {
      const selected = await filesystem.saveFileDialog(activeNote.name);
      if (selected) {
        await filesystem.writeNote(selected, activeNoteContent);
        const isInsideWorkspace = selected.toLowerCase().startsWith(rootPath.toLowerCase());
        if (isInsideWorkspace) {
          await _refreshNotes();
          const name = selected.split(/[/\\]/).pop() || selected;
          await openNote({
            path: selected,
            name,
            isFolder: false,
            lastModified: Date.now()
          });
        } else {
          alert(`Successfully saved copy as external file:\n${selected}`);
        }
      }
    } catch (e) {
      console.error("Save As error:", e);
      alert(`Save As failed: ${e}`);
    }
  }, [activeNote, activeNoteContent, rootPath, _refreshNotes, openNote]);

  const handleNewWindow = useCallback(() => {
    try {
      const label = `window-${Date.now()}`;
      new WebviewWindow(label, {
        title: "NoteX",
        width: 1000,
        height: 550,
      });
    } catch (e) {
      console.error("Failed to create new window:", e);
    }
  }, []);

  const handleSearchBing = useCallback(async () => {
    try {
      const textarea = document.querySelector(".editor-textarea") as HTMLTextAreaElement;
      let query = "";
      if (textarea) {
        query = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd).trim();
      }
      if (!query && activeNote) {
        query = activeNote.name;
      }
      if (query) {
        await openUrl(`https://www.bing.com/search?q=${encodeURIComponent(query)}`);
      } else {
        alert("Nothing to search!");
      }
    } catch (e) {
      console.error("Search with Bing error:", e);
    }
  }, [activeNote]);

  const handleFindText = useCallback((query: string, forward = true) => {
    if (!query) return;
    setLastSearchQuery(query);
    const textarea = document.querySelector(".editor-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const text = textarea.value;
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    
    let index = -1;
    if (forward) {
      const startPos = textarea.selectionEnd;
      index = textLower.indexOf(queryLower, startPos);
      if (index === -1) {
        // Wrap around
        index = textLower.indexOf(queryLower, 0);
      }
    } else {
      const startPos = textarea.selectionStart - 1;
      index = textLower.lastIndexOf(queryLower, startPos);
      if (index === -1) {
        // Wrap around
        index = textLower.lastIndexOf(queryLower);
      }
    }

    if (index !== -1) {
      textarea.focus();
      textarea.setSelectionRange(index, index + query.length);
      const row = text.substring(0, index).split('\n').length;
      const lineHeight = 20;
      textarea.scrollTop = Math.max(0, (row - 5) * lineHeight);
    } else {
      alert(`No matches found for "${query}"`);
    }
  }, []);

  const handleGoToLine = useCallback((lineStr: string) => {
    const lineNum = parseInt(lineStr, 10);
    if (isNaN(lineNum) || lineNum < 1) {
      alert("Invalid line number!");
      return;
    }
    const textarea = document.querySelector(".editor-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const lines = textarea.value.split('\n');
    if (lineNum > lines.length) {
      alert(`Line number exceeds total lines (${lines.length})!`);
      return;
    }

    let charIndex = 0;
    for (let i = 0; i < lineNum - 1; i++) {
      charIndex += lines[i].length + 1; // +1 for the newline
    }

    textarea.focus();
    textarea.setSelectionRange(charIndex, charIndex);
    const lineHeight = 20;
    textarea.scrollTop = Math.max(0, (lineNum - 5) * lineHeight);
  }, []);

  const createNewNote = async () => {
    try {
      setSortBy("modified");
      const filename = ensureUniqueFilename("New Note.txt");
      const path = await _createNote(undefined, filename);
      const name = path.split(/[/\\]/).pop() || "New Note.txt";
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
      const name = path.split(/[/\\]/).pop() || uniqueName;
      await openNote({ path, name, isFolder: false, lastModified: Date.now() });
    } catch (e) { console.error(e); }
  };

  const createNoteWithExtension = useCallback(async (extension: string) => {
    try {
      setSortBy("modified");
      const baseName = `New Note.${extension}`;
      const filename = ensureUniqueFilename(baseName);
      const path = await _createNote(undefined, filename);
      const name = path.split(/[/\\]/).pop() || filename;
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

  // Startup file loader
  useEffect(() => {
    async function checkStartupFile() {
      if (rootPath) {
        try {
          const startupFile = await filesystem.getStartupFile();
          if (startupFile) {
            await handleOpenExternalFile(startupFile);
          }
        } catch (e) {
          console.error("Error reading startup file:", e);
        }
      }
    }
    checkStartupFile();
  }, [rootPath, handleOpenExternalFile]);

  // Single-instance event listener
  useEffect(() => {
    if (!rootPath) return;
    const unlisten = listen<string>('open-external-file', (event) => {
      const filePath = event.payload;
      if (filePath) {
        handleOpenExternalFile(filePath);
      }
    });
    return () => {
      unlisten.then(fn => fn());
    };
  }, [rootPath, handleOpenExternalFile]);

  // Drag and Drop files onto window
  useEffect(() => {
    if (!rootPath) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) {
        const file = files[0];
        const absolutePath = (file as any).path;
        if (absolutePath) {
          await handleOpenExternalFile(absolutePath);
        }
      }
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, [rootPath, handleOpenExternalFile]);

  // Shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        handleFindText(lastSearchQuery, !e.shiftKey);
      }
      if (e.key === 'F5') {
        e.preventDefault();
        const textarea = document.querySelector(".editor-textarea") as HTMLTextAreaElement;
        if (textarea) {
          textarea.focus();
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const timeStr = new Date().toLocaleString();
          const nextValue = activeNoteContent.slice(0, start) + timeStr + activeNoteContent.slice(end);
          updateContent(nextValue);
          setTimeout(() => {
            textarea.setSelectionRange(start + timeStr.length, start + timeStr.length);
          }, 0);
        } else {
          updateContent(activeNoteContent + new Date().toLocaleString());
        }
      }
      if (e.ctrlKey) {
        if (e.shiftKey) {
          switch (e.key.toLowerCase()) {
            case 'n':
              e.preventDefault();
              handleNewWindow();
              break;
            case 's':
              e.preventDefault();
              handleSaveAsMenu();
              break;
            case 'f':
              e.preventDefault();
              setIsAdvSearchOpen(true);
              break;
          }
        } else {
          switch (e.key.toLowerCase()) {
            case 's':
              e.preventDefault();
              saveActiveNote();
              break;
            case 'n':
              e.preventDefault();
              createNewNote();
              break;
            case 'o':
              e.preventDefault();
              handleOpenFileMenu();
              break;
            case 'g':
              e.preventDefault();
              setIsGoToOpen(true);
              break;
            case 'e':
              e.preventDefault();
              handleSearchBing();
              break;
            case 'f':
              e.preventDefault();
              setIsFindOpen(true);
              break;
            case 'h':
              e.preventDefault();
              setIsFindOpen(true);
              break;
            case 'p':
              e.preventDefault();
              window.print();
              break;
            case '=':
            case '+':
              e.preventDefault();
              setZoom(z => z + 2);
              break;
            case '-':
              e.preventDefault();
              setZoom(z => Math.max(8, z - 2));
              break;
            case '0':
              e.preventDefault();
              setZoom(14);
              break;
            case ',':
              e.preventDefault();
              setIsSettingsOpen(true);
              break;
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    saveActiveNote,
    rootPath,
    handleOpenFileMenu,
    lastSearchQuery,
    handleFindText,
    handleSearchBing,
    handleNewWindow,
    handleSaveAsMenu,
    setIsAdvSearchOpen,
    setIsFindOpen,
    setIsGoToOpen,
    setIsSettingsOpen,
    setZoom,
    updateContent,
    activeNoteContent
  ]);

  // Handler for directory change
  const handleChangeRoot = async () => {
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
        onNewWindow={handleNewWindow}
        onOpen={handleOpenFileMenu}
        onSave={saveActiveNote}
        onSaveAs={handleSaveAsMenu}
        onPageSetup={() => setIsSettingsOpen(true)}
        onPrint={() => window.print()}
        onExit={() => window.close()}

        onUndo={() => {
          const textarea = document.querySelector(".editor-textarea") as HTMLTextAreaElement;
          textarea?.focus();
          document.execCommand('undo');
        }}
        onCut={() => {
          const textarea = document.querySelector(".editor-textarea") as HTMLTextAreaElement;
          textarea?.focus();
          document.execCommand('cut');
        }}
        onCopy={() => {
          const textarea = document.querySelector(".editor-textarea") as HTMLTextAreaElement;
          textarea?.focus();
          document.execCommand('copy');
        }}
        onPaste={() => {
          const textarea = document.querySelector(".editor-textarea") as HTMLTextAreaElement;
          textarea?.focus();
          document.execCommand('paste');
        }}
        onDelete={() => {
          const textarea = document.querySelector(".editor-textarea") as HTMLTextAreaElement;
          textarea?.focus();
          document.execCommand('delete');
        }}
        onSearchBing={handleSearchBing}
        onFind={() => setIsFindOpen(true)}
        onFindInFiles={() => setIsAdvSearchOpen(true)}
        onFindNext={() => handleFindText(lastSearchQuery, true)}
        onFindPrevious={() => handleFindText(lastSearchQuery, false)}
        onReplace={() => setIsFindOpen(true)}
        onGoTo={() => setIsGoToOpen(true)}
        onSelectAll={() => {
          const textarea = document.querySelector(".editor-textarea") as HTMLTextAreaElement;
          textarea?.focus();
          textarea?.select();
        }}
        onTimeDate={() => {
          const textarea = document.querySelector(".editor-textarea") as HTMLTextAreaElement;
          textarea?.focus();
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

      <InputModal
        isOpen={isGoToOpen}
        title="Go To Line"
        initialValue={cursor.line.toString()}
        onClose={() => setIsGoToOpen(false)}
        onSubmit={handleGoToLine}
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
            notes={sidebarNotes}
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
            onFind={(query: string) => handleFindText(query, true)}
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
