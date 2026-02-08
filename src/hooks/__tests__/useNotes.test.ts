import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useNotes } from "../useNotes";
import { filesystem } from "../../services/filesystem";
import { settingsService } from "../../services/settings";

// Mock dependencies
vi.mock("../../services/filesystem", () => ({
    filesystem: {
        listNotes: vi.fn(),
        readNote: vi.fn(),
        writeNote: vi.fn(),
        watchDir: vi.fn().mockResolvedValue(undefined),
        renameItem: vi.fn(),
        createFolder: vi.fn(),
        deleteItem: vi.fn(),
    }
}));

vi.mock("../../services/settings", () => ({
    settingsService: {
        loadPinned: vi.fn().mockResolvedValue([]),
        savePinned: vi.fn(),
    }
}));

// Mock Tauri listen
const mockUnlisten = vi.fn();
const mockListen = vi.fn((event, callback) => {
    return Promise.resolve(mockUnlisten);
});

vi.mock("@tauri-apps/api/event", () => ({
    listen: (event: string, cb: any) => mockListen(event, cb)
}));

describe("useNotes hook", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("starts watcher on mount", async () => {
        renderHook(() => useNotes("C:\\Notes"));
        expect(filesystem.watchDir).toHaveBeenCalledWith("C:\\Notes");
        expect(mockListen).toHaveBeenCalledWith("file-changed", expect.any(Function));
    });

    it("refreshes notes when file-changed event occurs", async () => {
        const listNotesMock = vi.mocked(filesystem.listNotes);
        listNotesMock.mockResolvedValue([
            { path: "C:\\Notes\\old.txt", name: "old.txt", isFolder: false, lastModified: 100 }
        ]);

        const { result } = renderHook(() => useNotes("C:\\Notes"));

        await waitFor(() => {
            expect(result.current.fileSystemRoot).toHaveLength(1);
        });

        // Simulate file change event
        const eventCallback = mockListen.mock.calls.find(call => call[0] === 'file-changed')?.[1];
        expect(eventCallback).toBeDefined();

        // Update mock to return new file
        listNotesMock.mockResolvedValue([
            { path: "C:\\Notes\\old.txt", name: "old.txt", isFolder: false, lastModified: 100 },
            { path: "C:\\Notes\\new.txt", name: "new.txt", isFolder: false, lastModified: 200 }
        ]);

        // Trigger event
        eventCallback({ payload: { kind: 'create' } });

        // Wait for debounce (500ms in code, we can use fake timers or just wait)
        await new Promise(r => setTimeout(r, 600));

        await waitFor(() => {
            expect(result.current.fileSystemRoot).toHaveLength(2);
        });
        
        const newFile = result.current.fileSystemRoot.find(n => n.name === "new.txt");
        expect(newFile?.isNew).toBe(true);
    });
});
