import { describe, it, expect } from "vitest";
import { isSubpath } from "../paths";

describe("isSubpath helper", () => {
    it("matches identical paths", () => {
        expect(isSubpath("C:\\Notes", "C:\\Notes")).toBe(true);
        expect(isSubpath("/home/user/notes", "/home/user/notes")).toBe(true);
    });

    it("matches subpaths with correct separators", () => {
        expect(isSubpath("C:\\Notes", "C:\\Notes\\file.txt")).toBe(true);
        expect(isSubpath("C:\\Notes", "C:/Notes/file.txt")).toBe(true);
        expect(isSubpath("/home/user/notes", "/home/user/notes/file.txt")).toBe(true);
        expect(isSubpath("/home/user/notes", "/home/user/notes/subdir/file.txt")).toBe(true);
    });

    it("does not match unrelated paths", () => {
        expect(isSubpath("C:\\Notes", "C:\\Other\\file.txt")).toBe(false);
        expect(isSubpath("/home/user/notes", "/home/user/notes_backup/file.txt")).toBe(false);
        expect(isSubpath("/home/user/notes", "/home/user/not/file.txt")).toBe(false);
    });
});
