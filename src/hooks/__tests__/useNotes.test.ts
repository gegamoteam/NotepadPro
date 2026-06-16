import { renderHook, waitFor, act } from "@testing-library/react";
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
        loadLastOpenedNote: vi.fn().mockReturnValue(null),
        saveLastOpenedNote: vi.fn(),
        clearLastOpenedNote: vi.fn(),
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

    it("handles external files correctly: keeps them in openedExternalNotes, and closes them", async () => {
        const { result } = renderHook(() => useNotes("C:\\Notes"));

        const externalNote = {
            path: "D:\\External\\note.txt",
            name: "note.txt",
            isFolder: false,
            lastModified: 100
        };

        const readNoteMock = vi.mocked(filesystem.readNote);
        readNoteMock.mockResolvedValue("External content");

        // Open external note
        await act(async () => {
            await result.current.openNote(externalNote);
        });

        expect(result.current.activeNote).toEqual(externalNote);
        expect(result.current.activeNoteContent).toBe("External content");
        expect(result.current.openedExternalNotes).toContainEqual(externalNote);

        // Close external note
        act(() => {
            result.current.closeExternalNote(externalNote.path);
        });

        expect(result.current.activeNote).toBeNull();
        expect(result.current.activeNoteContent).toBe("");
        expect(result.current.openedExternalNotes).not.toContainEqual(externalNote);
    });

    it("auto-creates a new note when updateContent is called with no active note", async () => {
        const listNotesMock = vi.mocked(filesystem.listNotes);
        listNotesMock.mockResolvedValue([]);

        const writeNoteMock = vi.mocked(filesystem.writeNote);
        // Make listNotes reflect the new file once it's been "written" so
        // the post-write refreshNotes call doesn't wipe the optimistic
        // sidebar entry.
        writeNoteMock.mockImplementation(async (path) => {
            listNotesMock.mockResolvedValue([
                { path, name: path.split(/[/\\]/).pop() || "New Note.txt", isFolder: false, lastModified: Date.now() }
            ]);
            return true;
        });

        const { result } = renderHook(() => useNotes("C:\\Notes"));

        // Wait for the initial refresh to settle so the empty fileSystemRoot
        // is what the hook uses for ensureUniqueName.
        await waitFor(() => {
            expect(result.current.fileSystemRoot).toEqual([]);
        });

        // No active note yet.
        expect(result.current.activeNote).toBeNull();
        expect(result.current.activeNoteContent).toBe("");

        await act(async () => {
            await result.current.updateContent("hello world");
        });

        // A new note is materialised with the typed content.
        expect(result.current.activeNote).not.toBeNull();
        expect(result.current.activeNote?.name).toBe("New Note.txt");
        expect(result.current.activeNote?.path).toBe("C:\\Notes\\New Note.txt");
        expect(result.current.activeNoteContent).toBe("hello world");
        expect(result.current.isDirty).toBe(true);

        // The file is written to disk (possibly still in-flight; wait a tick).
        await waitFor(() => {
            expect(writeNoteMock).toHaveBeenCalledWith(
                "C:\\Notes\\New Note.txt",
                "hello world"
            );
        });

        // The new note is remembered as the last-opened note.
        expect(settingsService.saveLastOpenedNote).toHaveBeenCalledWith(
            "C:\\Notes\\New Note.txt"
        );

        // The new note appears in the sidebar (optimistically added, then
        // confirmed by the post-write refresh once the mock returns it).
        await waitFor(() => {
            expect(result.current.fileSystemRoot.some(
                n => n.path === "C:\\Notes\\New Note.txt"
            )).toBe(true);
        });
    });

    it("does not auto-create a note when updateContent is called with an empty string", async () => {
        const listNotesMock = vi.mocked(filesystem.listNotes);
        listNotesMock.mockResolvedValue([]);

        const writeNoteMock = vi.mocked(filesystem.writeNote);
        writeNoteMock.mockResolvedValue(true);

        const { result } = renderHook(() => useNotes("C:\\Notes"));

        await waitFor(() => {
            expect(result.current.fileSystemRoot).toEqual([]);
        });

        await act(async () => {
            await result.current.updateContent("");
        });

        // No note should be created from an empty update.
        expect(result.current.activeNote).toBeNull();
        expect(writeNoteMock).not.toHaveBeenCalled();
    });

    it("continues updating the auto-created note on subsequent edits", async () => {
        const listNotesMock = vi.mocked(filesystem.listNotes);
        listNotesMock.mockResolvedValue([]);

        const writeNoteMock = vi.mocked(filesystem.writeNote);
        writeNoteMock.mockResolvedValue(true);

        const { result } = renderHook(() => useNotes("C:\\Notes"));

        await waitFor(() => {
            expect(result.current.fileSystemRoot).toEqual([]);
        });

        await act(async () => {
            await result.current.updateContent("h");
        });

        const firstPath = result.current.activeNote?.path;
        expect(firstPath).toBe("C:\\Notes\\New Note.txt");

        // Subsequent edits should flow through the normal update path
        // (activeNote is now set) — no new notes should be created.
        await act(async () => {
            await result.current.updateContent("hello");
        });

        expect(result.current.activeNote?.path).toBe(firstPath);
        expect(result.current.activeNoteContent).toBe("hello");
    });

    it("remembers the last-opened note and clears it when the active note is deleted", async () => {
        const listNotesMock = vi.mocked(filesystem.listNotes);
        listNotesMock.mockResolvedValue([
            { path: "C:\\Notes\\a.txt", name: "a.txt", isFolder: false, lastModified: 200 }
        ]);
        const readNoteMock = vi.mocked(filesystem.readNote);
        readNoteMock.mockResolvedValue("a content");

        const { result } = renderHook(() => useNotes("C:\\Notes"));

        await waitFor(() => {
            expect(result.current.fileSystemRoot).toHaveLength(1);
        });

        const note = result.current.fileSystemRoot[0];

        await act(async () => {
            await result.current.openNote(note);
        });

        // Opening a note should save it as the last-opened note.
        expect(settingsService.saveLastOpenedNote).toHaveBeenCalledWith(note.path);

        // Clear the mock so we can assert the delete path.
        vi.mocked(settingsService.saveLastOpenedNote).mockClear();
        vi.mocked(settingsService.clearLastOpenedNote).mockClear();

        // Hiding the active note should clear the last-opened bookmark.
        await act(async () => {
            await result.current.deleteItem(note.path, false);
        });

        expect(settingsService.clearLastOpenedNote).toHaveBeenCalled();
    });
});
