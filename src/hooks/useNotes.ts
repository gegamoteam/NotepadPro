import { useState, useCallback, useEffect, useRef } from "react";
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

    // Sort state
    const [sortBy, setSortBy] = useState<'date' | 'name' | 'modified'>('modified');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Initial load

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

    useEffect(() => {
        if (rootPath) {
            refreshNotes();
        }
    }, [rootPath, refreshNotes]);

    // Load a note
    const openNote = useCallback(async (note: Note) => {
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

        if (!activeNote) {
            // Auto-create logic (Draft)
            try {
                if (content.trim().length > 0) {
                    let name = `Untitled-${Date.now()}.txt`;
                    const firstLine = content.split('\n')[0].trim().replace(/[\\/:*?"<>|]/g, "");
                    if (firstLine.length > 0 && firstLine.length < 30) {
                        name = `${firstLine}.txt`;
                    }

                    const path = `${rootPath}\\${name}`;
                    await filesystem.writeNote(path, content);
                    await refreshNotes();
                    setActiveNote({
                        name,
                        path,
                        isFolder: false,
                        lastModified: Date.now()
                    });
                    setIsSaving(false);
                }
            } catch (e) {
                console.error("Failed to auto-create draft note:", e);
            }
        } else {
            // Continuous Title Update
            if (activeNote.name.endsWith(".txt")) {
                const firstLine = content.split('\n')[0].trim().replace(/[\\/:*?"<>|]/g, "");

                if (firstLine.length > 0 && firstLine.length < 50) {
                    const newName = `${firstLine}.txt`;

                    if (newName !== activeNote.name) {
                        if (debounceTimer.current) {
                            clearTimeout(debounceTimer.current);
                        }

                        debounceTimer.current = window.setTimeout(() => {
                            // We need to pass the LATEST activeNote path here. 
                            // Since this is a closure, activeNote might be stale if we aren't careful?
                            // flexible rename using current activeNote path from state? 
                            // Actually, activeNote in the dependency array is updated. 
                            // HOWEVER, inside setTimeout, we might have stale closure issues if activeNote changes quickly.
                            // But title update only happens when WRITING to activeNote.
                            // Safety check:
                            renameItem(activeNote.path, newName);
                        }, 1000); // 1 second debounce
                    }
                }
            }
        }
    }, [activeNote, rootPath, refreshNotes, renameItem]);

    // Create new note
    const createNote = useCallback(async (_parentPath: string | undefined, name: string) => {
        try {
            const path = `${rootPath}\\${name}`; // Windows separator
            await filesystem.writeNote(path, "");
            await refreshNotes();
            return path;
        } catch (e) {
            console.error(e);
            throw e;
        }
    }, [rootPath, refreshNotes]);

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
