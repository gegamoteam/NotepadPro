import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { convertFileSrc } from "@tauri-apps/api/core";
import Editor from "../Editor";

vi.mock("@tauri-apps/api/core", () => ({
    convertFileSrc: vi.fn((path: string) => `tauri://${path}`)
}));

const convertFileSrcMock = vi.mocked(convertFileSrc);

describe("Editor markdown preview", () => {
    beforeEach(() => {
        convertFileSrcMock.mockClear();
    });

    it("toggles preview mode and renders markdown", async () => {
        const user = userEvent.setup();
        render(
            <Editor
                content={"# Title"}
                onChange={() => {}}
                wordWrap={true}
                filePath={"C:\\Notes\\note.md"}
            />
        );

        expect(screen.getByRole("textbox")).toBeTruthy();
        await user.click(screen.getByText("Preview"));
        expect(screen.getByText("Title")).toBeTruthy();
    });

    it("resolves embedded images using file source conversion", async () => {
        const user = userEvent.setup();
        render(
            <Editor
                content={"![Alt](images/pic.png)"}
                onChange={() => {}}
                wordWrap={true}
                filePath={"C:\\Notes\\note.md"}
            />
        );

        await user.click(screen.getByText("Preview"));
        expect(convertFileSrcMock).toHaveBeenCalledWith("C:\\Notes\\images\\pic.png");
        const img = screen.getByAltText("Alt");
        expect(img.getAttribute("src")).toBe("tauri://C:\\Notes\\images\\pic.png");
    });

    it("adds syntax highlighting classes to code blocks", async () => {
        const user = userEvent.setup();
        const { container } = render(
            <Editor
                content={"```js\nconst value = 1;\n```"}
                onChange={() => {}}
                wordWrap={true}
                filePath={"C:\\Notes\\note.md"}
            />
        );

        await user.click(screen.getByText("Preview"));
        const codeBlock = container.querySelector("pre.hljs");
        expect(codeBlock).toBeTruthy();
    });

});
