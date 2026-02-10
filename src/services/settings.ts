import { documentDir, join } from "@tauri-apps/api/path";
import { filesystem } from "./filesystem";

const SETTINGS_FILE = "settings.json";
const PINNED_FILE = "pinned.json";

export interface AutosaveSettings {
    enabled: boolean;
    interval: number; // in ms
}

export interface ShortcutSettings {
    enabled: boolean;
    shortcut: string; // e.g. "Ctrl+Shift+N"
}

const DEFAULT_AUTOSAVE: AutosaveSettings = {
    enabled: true,
    interval: 200
};

const DEFAULT_SHORTCUT: ShortcutSettings = {
    enabled: true,
    shortcut: "Ctrl+Shift+N"
};

export const settingsService = {
    async getSettingsPath(): Promise<string> {
        const docs = await documentDir();
        return await join(docs, "NoteX", SETTINGS_FILE);
    },

    async getPinnedPath(): Promise<string> {
        const docs = await documentDir();
        return await join(docs, "NoteX", PINNED_FILE);
    },

    async loadPinned(): Promise<string[]> {
        try {
            const path = await this.getPinnedPath();
            const content = await filesystem.readNote(path);
            const data = JSON.parse(content);
            return data.pinned || [];
        } catch {
            return [];
        }
    },

    async savePinned(pinned: string[]): Promise<boolean> {
        const path = await this.getPinnedPath();
        const content = JSON.stringify({ pinned }, null, 2);
        return await filesystem.writeNote(path, content);
    },

    // Autosave settings
    loadAutosaveSettings(): AutosaveSettings {
        try {
            const saved = localStorage.getItem("autosaveSettings");
            if (saved) {
                return { ...DEFAULT_AUTOSAVE, ...JSON.parse(saved) };
            }
        } catch {
            // Ignore parse errors
        }
        return DEFAULT_AUTOSAVE;
    },

    saveAutosaveSettings(settings: AutosaveSettings): void {
        localStorage.setItem("autosaveSettings", JSON.stringify(settings));
    },

    // Shortcut settings
    loadShortcutSettings(): ShortcutSettings {
        try {
            const saved = localStorage.getItem("shortcutSettings");
            if (saved) {
                return { ...DEFAULT_SHORTCUT, ...JSON.parse(saved) };
            }
        } catch {
            // Ignore parse errors
        }
        return DEFAULT_SHORTCUT;
    },

    saveShortcutSettings(settings: ShortcutSettings): void {
        localStorage.setItem("shortcutSettings", JSON.stringify(settings));
    },

    // Onboarding
    async hasSeenOnboarding(): Promise<boolean> {
        return !!(await localStorage.getItem("hasSeenOnboarding"));
    },

    async setSeenOnboarding() {
        await localStorage.setItem("hasSeenOnboarding", "true");
    }
};
