import { documentDir, join } from "@tauri-apps/api/path";
import { filesystem } from "./filesystem";

const SETTINGS_FILE = "settings.json";
const PINNED_FILE = "pinned.json";

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
            return []; // Return empty if fails or doesn't exist
        }
    },

    async savePinned(pinned: string[]): Promise<boolean> {
        const path = await this.getPinnedPath();
        const content = JSON.stringify({ pinned }, null, 2);
        return await filesystem.writeNote(path, content);
    },

    // Placeholder for other settings if needed
    async hasSeenOnboarding(): Promise<boolean> {
        return !!(await localStorage.getItem("hasSeenOnboarding"));
    },

    async setSeenOnboarding() {
        await localStorage.setItem("hasSeenOnboarding", "true");
    }
};
