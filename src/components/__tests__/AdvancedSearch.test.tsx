import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { vi } from "vitest";
import AdvancedSearch from "../AdvancedSearch";
import { filesystem } from "../../services/filesystem";

vi.mock("../../services/filesystem", () => ({
    filesystem: {
        searchNotes: vi.fn()
    }
}));

const baseProps = {
    isOpen: true,
    onClose: () => {},
    rootPath: "C:\\Notes",
    onOpenNote: () => {}
};

describe("AdvancedSearch", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("triggers instant search after debounce and renders results", async () => {
        const searchNotesMock = vi.mocked(filesystem.searchNotes);
        searchNotesMock.mockResolvedValue([
            {
                file: { path: "C:\\Notes\\note.txt", name: "note.txt", isFolder: false },
                snippet: "hello world",
                match_type: "content",
                score: 5
            }
        ]);

        const user = userEvent.setup();
        render(<AdvancedSearch {...baseProps} />);

        const input = screen.getByPlaceholderText("Search for text in files...");
        await user.type(input, "hello");

        expect(searchNotesMock).toHaveBeenCalledTimes(0);

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 250));
        });

        expect(searchNotesMock).toHaveBeenCalledTimes(1);
        expect(searchNotesMock).toHaveBeenCalledWith("C:\\Notes", "hello");
        expect(screen.getByText("note.txt")).toBeTruthy();
    });

    it("shows empty state when no matches", async () => {
        const searchNotesMock = vi.mocked(filesystem.searchNotes);
        searchNotesMock.mockResolvedValue([]);

        const user = userEvent.setup();
        render(<AdvancedSearch {...baseProps} />);

        const input = screen.getByPlaceholderText("Search for text in files...");
        await user.type(input, "missing");
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 250));
        });

        expect(screen.getByText("No results found")).toBeTruthy();
    });

    it("shows an error message when search fails", async () => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const searchNotesMock = vi.mocked(filesystem.searchNotes);
        searchNotesMock.mockRejectedValueOnce(new Error("fail"));

        const user = userEvent.setup();
        render(<AdvancedSearch {...baseProps} />);

        const input = screen.getByPlaceholderText("Search for text in files...");
        await user.type(input, "error");
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 250));
        });

        expect(screen.getByText("Search failed. Please try again.")).toBeTruthy();
        consoleSpy.mockRestore();
    });
});
