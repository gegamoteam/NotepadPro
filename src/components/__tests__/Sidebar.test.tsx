import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import Sidebar from "../Sidebar";
import { Note } from "../../types/note";

const baseNotes: Note[] = [];

describe("Sidebar plus menu", () => {
    it("opens plus menu and triggers TXT and MD creation", async () => {
        const user = userEvent.setup();
        const onCreateNote = vi.fn();
        const onCreateNoteWithName = vi.fn();
        const onCreateNoteWithExtension = vi.fn();

        render(
            <Sidebar
                notes={baseNotes}
                onOpenNote={() => {}}
                onCreateNote={onCreateNote}
                onCreateNoteWithName={onCreateNoteWithName}
                onCreateNoteWithExtension={onCreateNoteWithExtension}
                onDelete={() => {}}
                onRename={() => {}}
                onAdvancedSearch={() => {}}
                pinnedPaths={[]}
                onTogglePin={() => {}}
                sortBy="modified"
                onSortChange={() => {}}
                isCollapsed={false}
            />
        );

        await user.click(screen.getByTitle("New Note"));
        await user.click(screen.getByText("New TXT"));
        expect(onCreateNoteWithExtension).toHaveBeenCalledWith("txt");

        await user.click(screen.getByTitle("New Note"));
        await user.click(screen.getByText("New MD"));
        expect(onCreateNoteWithExtension).toHaveBeenCalledWith("md");
    });

    it("opens custom modal from plus menu", async () => {
        const user = userEvent.setup();
        render(
            <Sidebar
                notes={baseNotes}
                onOpenNote={() => {}}
                onCreateNote={() => {}}
                onCreateNoteWithName={() => {}}
                onCreateNoteWithExtension={() => {}}
                onDelete={() => {}}
                onRename={() => {}}
                onAdvancedSearch={() => {}}
                pinnedPaths={[]}
                onTogglePin={() => {}}
                sortBy="modified"
                onSortChange={() => {}}
                isCollapsed={false}
            />
        );

        await user.click(screen.getByTitle("New Note"));
        await user.click(screen.getByText("Custom..."));
        expect(screen.getByText("Create New File")).toBeTruthy();
    });
});
