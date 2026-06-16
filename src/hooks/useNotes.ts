import { useState, useCallback, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { Note } from "../types/note";
import { filesystem } from "../services/filesystem";
import { settingsService } from "../services/settings";
import { joinPath, getParentPath, getFilename, isSubpath } from "../utils/paths";

export function useNotes(rootPath: string) {
    const [activeNote, setActiveNote] = useState<Note | null>(null);
    const [activeNoteContent, setActiveNoteContent] = useState<string>("");
    const [fileSystemRoot, setFileSystemRoot] = useState<Note[]>([]);
    const [pinnedPaths, setPinnedPaths] = useState<string[]>([]);
    const [hiddenPaths, setHiddenPaths] = useState<string[]>([]); // New: Hidden items
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const debounceTimer = useRef<number | null>(null);
    const refreshTimer = useRef<number | null>(null);
    const knownPathsRef = useRef<Set<string>>(new Set());
    const hasLoadedRef = useRef(false);

    const [openedExternalNotes, setOpenedExternalNotes] = useState<Note[]>(() => {
        try {
            const saved = localStorage.getItem("openedExternalNotes");
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem("openedExternalNotes", JSON.stringify(openedExternalNotes));
    }, [openedExternalNotes]);

    // Paths the user has explicitly chosen to keep in the sidebar even though
    // the underlying file is missing. Used to suppress the "Note Not Found"
    // modal when the user clicks the same entry repeatedly.
    const [keptMissingPaths, setKeptMissingPaths] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem("keptMissingPaths");
            return saved ? new Set(JSON.parse(saved)) : new Set();
        } catch {
            return new Set();
        }
    });

    useEffect(() => {
        localStorage.setItem("keptMissingPaths", JSON.stringify(Array.from(keptMissingPaths)));
    }, [keptMissingPaths]);

    // Sort state
    const [sortBy, setSortBy] = useState<'date' | 'name' | 'modified'>('modified');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Load folder structure
    const refreshNotes = useCallback(async (overrideHiddenPaths?: string[]) => {
        const effectiveHiddenPaths = overrideHiddenPaths ?? hiddenPaths;
        try {
            const entries = await filesystem.listNotes(rootPath);

            // Flatten or just Filter? 
            // "Remove folders function" -> We'll just show files from the scan. 
            // If listNotes is recursive, we might get a tree. We should probably just get a flat list of files for a "simple" app.
            // But filesystem.listNotes implementation (hidden) likely returns a tree.
            // Let's Flatten it to ensure we see ALL notes, but ignore folder structure.

            const flatten = (nodes: Note[]): Note[] => {
                if (!nodes || !Array.isArray(nodes)) return [];
                let flat: Note[] = [];
                for (const node of nodes) {
                    // Filter system files (like pinned.json) and folders
                    // Filter system files, folders, AND hidden paths
                    const isSystem = node.name === 'pinned.json' || node.name === '.hidden.json' || node.name.startsWith('.');
                    const isHidden = effectiveHiddenPaths.includes(node.path);

                    if (!node.isFolder && !isSystem && !isHidden) {
                        flat.push(node);
                    }
                    if (node.children) {
                        flat = flat.concat(flatten(node.children));
                    }
                }
                return flat;
            };

            const flatFiles = flatten(entries);

            // Mark new files
            const currentKnown = knownPathsRef.current;
            const newKnown = new Set<string>();
            const hasLoaded = hasLoadedRef.current;

            flatFiles.forEach(f => {
                newKnown.add(f.path);
                if (hasLoaded && !currentKnown.has(f.path)) {
                    f.isNew = true;
                }
            });
            knownPathsRef.current = newKnown;
            hasLoadedRef.current = true;

            // Sort
            flatFiles.sort((a, b) => {
                const aPinned = pinnedPaths.includes(a.path);
                const bPinned = pinnedPaths.includes(b.path);

                if (aPinned && !bPinned) return -1;
                if (!aPinned && bPinned) return 1;

                let comparison = 0;
                if (sortBy === 'name') {
                    comparison = a.name.localeCompare(b.name);
                } else if (sortBy === 'date' || sortBy === 'modified') {
                    comparison = (a.lastModified || 0) - (b.lastModified || 0);
                }
                return sortDirection === 'asc' ? comparison : -comparison;
            });

            setFileSystemRoot(flatFiles);
        } catch (error) {
            console.error("Failed to load notes:", error);
        }
    }, [rootPath, sortBy, sortDirection, hiddenPaths]);

    // Initial load and refresh when rootPath changes
    useEffect(() => {
        settingsService.loadPinned().then(setPinnedPaths);
        // Load hidden paths
        const loadHidden = async () => {
            const hiddenFile = joinPath(rootPath, ".hidden.json");
            try {
                const content = await filesystem.readNote(hiddenFile);
                setHiddenPaths(JSON.parse(content));
            } catch {
                // Ignore if missing
                setHiddenPaths([]);
            }
        };
        if (rootPath) {
            loadHidden();
            // Filter out files that are now inside the workspace
            setOpenedExternalNotes(prev => prev.filter(note => !isSubpath(rootPath, note.path)));
        }
    }, [rootPath]); // Reload if rootPath changes

    // Save hidden paths helper
    const saveHiddenPaths = async (paths: string[]) => {
        const hiddenFile = joinPath(rootPath, ".hidden.json");
        try {
            await filesystem.writeNote(hiddenFile, JSON.stringify(paths, null, 2));
        } catch (e) {
            console.error("Failed to save hidden paths", e);
        }
    };

    // Watcher effect
    useEffect(() => {
        if (rootPath) {
            // Start watcher
            filesystem.watchDir(rootPath).catch(e => console.error("Watcher failed:", e));

            const unlisten = listen('file-changed', (_event) => {
                // Debounce refresh
                if (refreshTimer.current) {
                    clearTimeout(refreshTimer.current);
                }
                refreshTimer.current = window.setTimeout(() => {
                    refreshNotes();
                }, 500);
            });

            return () => {
                unlisten.then(f => f());
            };
        }
    }, [rootPath, refreshNotes]);

    useEffect(() => {
        if (rootPath) {
            refreshNotes();
        }
    }, [rootPath, refreshNotes]);

    // Load a note. Returns true on success, false if the file could not be read
    // (e.g. it was deleted/moved on disk) so the caller can surface the error
    // to the user instead of silently leaving a stale selection.
    const openNote = useCallback(async (note: Note): Promise<boolean> => {
        // Cancel any pending rename timer from previous note
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
            debounceTimer.current = null;
        }
        try {
            const content = await filesystem.readNote(note.path);
            setActiveNote(note);
            setActiveNoteContent(content);
            setIsDirty(false);

            // Successfully opened, so the file is no longer "known missing"
            setKeptMissingPaths(prev => {
                if (!prev.has(note.path)) return prev;
                const next = new Set(prev);
                next.delete(note.path);
                return next;
            });

            if (rootPath) {
                const isExternal = !isSubpath(rootPath, note.path);
                if (isExternal) {
                    setOpenedExternalNotes(prev => {
                        if (prev.some(n => n.path === note.path)) {
                            return prev;
                        }
                        return [note, ...prev];
                    });
                }
            }
            return true;
        } catch (error) {
            console.error("Failed to read note:", error);
            // If the user previously chose to keep this missing note in the
            // list, don't keep surfacing the modal — silently drop the entry
            // from the sidebar instead, since they have no way to recover it.
            if (keptMissingPaths.has(note.path)) {
                setFileSystemRoot(prev => prev.filter(n => n.path !== note.path));
                setOpenedExternalNotes(prev => prev.filter(n => n.path !== note.path));
                if (activeNote?.path === note.path) {
                    setActiveNote(null);
                    setActiveNoteContent("");
                    setIsDirty(false);
                }
            }
            return false;
        }
    }, [rootPath, keptMissingPaths, activeNote]);

    // Save active note
    const saveActiveNote = useCallback(async () => {
        if (activeNote && isDirty) {
            try {
                setIsSaving(true);
                await filesystem.writeNote(activeNote.path, activeNoteContent);
                setIsDirty(false);
                console.log("Saved note:", activeNote.name);
            } catch (error) {
                console.error("Failed to save note:", error);
            } finally {
                setTimeout(() => setIsSaving(false), 500); // Small delay to show indicator
            }
        }
    }, [activeNote, activeNoteContent, isDirty]);

    // Create draft note (clears editor, ready for typing)
    const createDraftNote = useCallback(() => {
        setActiveNote(null);
        setActiveNoteContent("");
        setIsDirty(false);
    }, []);

    // Rename or Move Item
    const renameItem = useCallback(async (oldPath: string, newNameOrPath: string) => {
        try {
            // Check if newNameOrPath is a full path or just a name
            let newPath = newNameOrPath;
            let newName = newNameOrPath;

            const isFullPath = newNameOrPath.includes('/') || newNameOrPath.includes('\\');
            if (!isFullPath) {
                // It's just a name, keep parent
                const parent = getParentPath(oldPath);
                newPath = joinPath(parent, newNameOrPath);
            } else {
                // It's a full path (Move)
                newName = getFilename(newPath);
            }

            await filesystem.renameItem(oldPath, newPath);
            if (activeNote?.path === oldPath) {
                setActiveNote(prev => prev ? ({ ...prev, path: newPath, name: newName }) : null);
            }
            setOpenedExternalNotes(prev => prev.map(n => {
                if (n.path === oldPath) {
                    const isInside = isSubpath(rootPath, newPath);
                    return isInside ? null : { ...n, path: newPath, name: newName };
                }
                return n;
            }).filter((n): n is Note => n !== null));
            await refreshNotes();
        } catch (e) {
            console.error(e);
        }
    }, [activeNote, refreshNotes, rootPath]);

    // Update content (from editor)
    const updateContent = useCallback(async (content: string) => {
        setActiveNoteContent(content);
        setIsDirty(true);

        // Only update title for existing .txt files
        // No auto-create - files must be created explicitly via + button
        if (activeNote && activeNote.name.endsWith(".txt")) {
            const firstLine = content.split('\n')[0].trim().replace(/[\\/:*?"<>|]/g, "");

            // Only rename if first line has meaningful content (at least 3 chars)
            if (firstLine.length >= 3 && firstLine.length < 50) {
                const newName = `${firstLine}.txt`;

                if (newName !== activeNote.name) {
                    // Cancel any pending rename
                    if (debounceTimer.current) {
                        clearTimeout(debounceTimer.current);
                    }

                    // Capture path at this moment to avoid stale closure
                    const currentPath = activeNote.path;

                    debounceTimer.current = window.setTimeout(() => {
                        // Only rename if we're still viewing the same note
                        // This prevents renaming wrong files when switching notes
                        renameItem(currentPath, newName).catch(console.error);
                    }, 500); // Longer debounce to let user finish typing
                }
            }
        }
    }, [activeNote, renameItem]);

    // Create new note
    const createNote = useCallback(async (_parentPath: string | undefined, name: string) => {
        try {
            const path = joinPath(rootPath, name);
            if (hiddenPaths.includes(path)) {
                const updatedHidden = hiddenPaths.filter(p => p !== path);
                setHiddenPaths(updatedHidden);
                await saveHiddenPaths(updatedHidden);
            }
            await filesystem.writeNote(path, "");
            await refreshNotes();
            return path;
        } catch (e) {
            console.error(e);
            throw e;
        }
    }, [rootPath, refreshNotes, hiddenPaths]);

    const createFolder = useCallback(async (parentPath: string, name: string) => {
        try {
            const path = joinPath(parentPath, name);
            await filesystem.createFolder(path);
            await refreshNotes();
            return path;
        } catch (e) {
            console.error(e);
            throw e;
        }
    }, [refreshNotes]);

    // Advanced Delete Item
    const deleteItem = useCallback(async (path: string, permanent: boolean = false) => {
        let updatedHiddenPaths: string[] | undefined;

        if (permanent) {
            try {
                await filesystem.deleteItem(path);
                // For permanent delete, hiddenPaths doesn't change, pass undefined
            } catch (e) {
                // The file may already be gone from disk (this is the normal
                // case for the "Note Not Found" modal's Remove button). We
                // still want the sidebar entry to disappear, so swallow the
                // error and let the rest of the cleanup run.
                console.warn("Disk delete failed (file may already be missing):", e);
            }
        } else {
            updatedHiddenPaths = [...hiddenPaths, path];
            setHiddenPaths(updatedHiddenPaths);
            await saveHiddenPaths(updatedHiddenPaths);
        }

        // Clear any "keep in list" flag for this path so a future file with
        // the same path doesn't inherit the stale acknowledgement.
        setKeptMissingPaths(prev => {
            if (!prev.has(path)) return prev;
            const next = new Set(prev);
            next.delete(path);
            return next;
        });

        if (activeNote?.path === path) {
            setActiveNote(null);
            setActiveNoteContent("");
            setIsDirty(false);
        }
        setOpenedExternalNotes(prev => prev.filter(n => n.path !== path));
        await refreshNotes(updatedHiddenPaths);
    }, [activeNote, refreshNotes, hiddenPaths, rootPath]);

    const closeExternalNote = useCallback((path: string) => {
        setOpenedExternalNotes(prev => prev.filter(n => n.path !== path));
        if (activeNote?.path === path) {
            setActiveNote(null);
            setActiveNoteContent("");
            setIsDirty(false);
        }
    }, [activeNote]);




    const togglePin = useCallback(async (path: string) => {
        const newPinned = pinnedPaths.includes(path)
            ? pinnedPaths.filter(p => p !== path)
            : [...pinnedPaths, path];

        setPinnedPaths(newPinned);
        await settingsService.savePinned(newPinned);
    }, [pinnedPaths]);

    // Mark a path as "kept" by the user when the missing-note modal is
    // dismissed with "Keep in List". This suppresses future "Note Not Found"
    // modals for the same path.
    const keepMissingNote = useCallback((path: string) => {
        setKeptMissingPaths(prev => {
            if (prev.has(path)) return prev;
            const next = new Set(prev);
            next.add(path);
            return next;
        });
    }, []);

    return {
        activeNote,
        activeNoteContent,
        fileSystemRoot,
        pinnedPaths,
        openNote,
        saveActiveNote,
        updateContent,
        refreshNotes,
        createNote,
        createFolder,
        deleteItem,
        renameItem,
        togglePin,
        createDraftNote,
        isDirty,
        isSaving,
        sortBy,
        setSortBy,
        sortDirection,
        setSortDirection,
        hiddenPaths, // Export
        rootPath,
        openedExternalNotes,
        closeExternalNote,
        keepMissingNote
    };
}
