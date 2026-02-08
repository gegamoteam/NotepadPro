import { useState, useCallback, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { Note } from "../types/note";
import { filesystem } from "../services/filesystem";
import { settingsService } from "../services/settings";

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
            const hiddenFile = `${rootPath}\\.hidden.json`;
            try {
                const content = await filesystem.readNote(hiddenFile);
                setHiddenPaths(JSON.parse(content));
            } catch {
                // Ignore if missing
                setHiddenPaths([]);
            }
        };
        if (rootPath) loadHidden();
    }, [rootPath]); // Reload if rootPath changes

    // Save hidden paths helper
    const saveHiddenPaths = async (paths: string[]) => {
        const hiddenFile = `${rootPath}\\.hidden.json`;
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

            const unlisten = listen('file-changed', (event) => {
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

    // Load a note
    const openNote = useCallback(async (note: Note) => {
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
        } catch (error) {
            console.error("Failed to read note:", error);
        }
    }, []);

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

            if (!newNameOrPath.includes('\\')) {
                // It's just a name, keep parent
                const parent = oldPath.substring(0, oldPath.lastIndexOf('\\'));
                newPath = `${parent}\\${newNameOrPath}`;
            } else {
                // It's a full path (Move)
                newName = newPath.split('\\').pop() || newPath;
            }

            await filesystem.renameItem(oldPath, newPath);
            if (activeNote?.path === oldPath) {
                setActiveNote(prev => prev ? ({ ...prev, path: newPath, name: newName }) : null);
            }
            await refreshNotes();
        } catch (e) {
            console.error(e);
        }
    }, [activeNote, refreshNotes]);

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
            const path = `${rootPath}\\${name}`; // Windows separator
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
            const path = `${parentPath}\\${name}`;
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
        try {
            let updatedHiddenPaths: string[] | undefined;

            if (permanent) {
                await filesystem.deleteItem(path);
                // For permanent delete, hiddenPaths doesn't change, pass undefined
            } else {
                updatedHiddenPaths = [...hiddenPaths, path];
                setHiddenPaths(updatedHiddenPaths);
                await saveHiddenPaths(updatedHiddenPaths);
            }

            if (activeNote?.path === path) {
                setActiveNote(null);
                setActiveNoteContent("");
            }
            await refreshNotes(updatedHiddenPaths);
        } catch (e) {
            console.error(e);
        }
    }, [activeNote, refreshNotes, hiddenPaths, rootPath]);




    const togglePin = useCallback(async (path: string) => {
        const newPinned = pinnedPaths.includes(path)
            ? pinnedPaths.filter(p => p !== path)
            : [...pinnedPaths, path];

        setPinnedPaths(newPinned);
        await settingsService.savePinned(newPinned);
    }, [pinnedPaths]);

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
        rootPath
    };
}
