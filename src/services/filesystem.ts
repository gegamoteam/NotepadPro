import { invoke } from "@tauri-apps/api/core";
import { revealItemInDir } from "@tauri-apps/plugin-opener"; // Using V2 Reveal Logic if available
import { Note } from "../types/note";

// Match Rust FileEntry struct
interface FileEntry {
    name: string;
    path: string;
    is_dir: boolean;
    last_modified: number;
}

export const filesystem = {
    readNote: async (path: string): Promise<string> => {
        return await invoke("read_note", { path });
    },

    writeNote: async (path: string, content: string): Promise<boolean> => {
        return await invoke("write_note", { path, content });
    },

    listNotes: async (dir: string): Promise<Note[]> => {
        const entries = await invoke<FileEntry[]>("list_notes", { dir });
        return entries.map((entry) => ({
            path: entry.path,
            name: entry.name,
            isFolder: entry.is_dir,
            lastModified: entry.last_modified,
            children: [], // Will be populated recursively if needed or on demand
        }));
    },

    createFolder: async (path: string): Promise<boolean> => {
        return await invoke("create_folder", { path });
    },

    renameItem: async (oldPath: string, newPath: string): Promise<boolean> => {
        return await invoke("rename_item", { oldPath, newPath });
    },

    deleteItem: async (path: string): Promise<boolean> => {
        return await invoke("delete_item", { path });
    },

    // Helper to ensure base directory exists (Tauri usually handles this via permissions but good to have logic)
    ensureDir: async (path: string): Promise<boolean> => {
        // Re-use createFolder as it uses create_dir_all
        return await invoke("create_folder", { path });
    },

    openInExplorer: async (path: string): Promise<void> => {
        try {
            await revealItemInDir(path);
        } catch (e) {
            console.error("Failed to open file in explorer, trying fallback", e);
            // Fallback to invoke if needed, or log error
        }
    },

    searchNotes: async (dir: string, query: string): Promise<SearchResult[]> => {
        // Define internal interface for Rust response
        interface RustSearchResult {
            file: FileEntry;
            snippet: string;
            match_type: string;
            score: number;
        }

        const results = await invoke<RustSearchResult[]>("search_notes", { dir, query });
        return results.map(r => ({
            file: {
                path: r.file.path,
                name: r.file.name,
                isFolder: r.file.is_dir,
                lastModified: r.file.last_modified,
                children: []
            },
            snippet: r.snippet,
            match_type: r.match_type,
            score: r.score,
            matchType: r.match_type === 'filename' ? 'filename' : 'content' // Map string to union type
        }));
    }
};

export interface SearchResult {
    file: Note;
    snippet: string;
    match_type: string;
    score: number;
}
