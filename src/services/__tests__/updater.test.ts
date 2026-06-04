import { describe, it, expect } from "vitest";
import { isNewerVersion } from "../updater";

describe("isNewerVersion", () => {
    it("should return true for newer major version", () => {
        expect(isNewerVersion("1.6.0", "2.0.0")).toBe(true);
        expect(isNewerVersion("v1.6.0", "v2.0.0")).toBe(true);
    });

    it("should return true for newer minor version", () => {
        expect(isNewerVersion("1.6.0", "1.7.0")).toBe(true);
        expect(isNewerVersion("v1.6.0", "v1.7.0")).toBe(true);
    });

    it("should return true for newer patch version", () => {
        expect(isNewerVersion("1.6.0", "1.6.1")).toBe(true);
        expect(isNewerVersion("v1.6.0", "v1.6.1")).toBe(true);
    });

    it("should return false for equal versions", () => {
        expect(isNewerVersion("1.6.0", "1.6.0")).toBe(false);
        expect(isNewerVersion("v1.6.0", "v1.6.0")).toBe(false);
    });

    it("should return false for older versions", () => {
        expect(isNewerVersion("1.6.0", "1.5.0")).toBe(false);
        expect(isNewerVersion("1.6.1", "1.6.0")).toBe(false);
        expect(isNewerVersion("2.1.0", "1.9.9")).toBe(false);
    });

    it("should handle formatting issues gracefully", () => {
        expect(isNewerVersion("invalid", "1.0.0")).toBe(false);
        expect(isNewerVersion("1.0.0", "invalid")).toBe(false);
    });
});
