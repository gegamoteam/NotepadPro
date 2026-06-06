import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getVersion } from "@tauri-apps/api/app";
import { tempDir, join } from "@tauri-apps/api/path";

const REPO_OWNER = "gegamoteam";
const REPO_NAME = "NotepadPro";
const GITHUB_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;

interface GitHubAsset {
    name: string;
    size: number;
    browser_download_url: string;
}

interface GitHubRelease {
    tag_name: string;
    name: string;
    body: string;
    assets: GitHubAsset[];
}

export interface UpdateInfo {
    version: string;
    name: string;
    notes: string;
    downloadUrl: string;
    size: number;
    fileName: string;
}

interface OsInfo {
    os: string;
    arch: string;
}

// Simple semver comparison helper
export function isNewerVersion(current: string, latest: string): boolean {
    const parse = (v: string) => {
        const clean = v.replace(/^v/, '').split('-')[0];
        return clean.split('.').map(Number);
    };
    const [cMajor = 0, cMinor = 0, cPatch = 0] = parse(current);
    const [lMajor = 0, lMinor = 0, lPatch = 0] = parse(latest);

    if (isNaN(cMajor) || isNaN(lMajor)) return false;

    if (lMajor !== cMajor) return lMajor > cMajor;
    if (lMinor !== cMinor) return lMinor > cMinor;
    return lPatch > cPatch;
}

function matchAsset(assets: GitHubAsset[], os: string, arch: string): GitHubAsset | null {
    const osLower = os.toLowerCase();
    const archLower = arch.toLowerCase();

    // Filter assets by OS extensions
    const osAssets = assets.filter(asset => {
        const name = asset.name.toLowerCase();
        if (osLower === 'windows') {
            return (name.endsWith('.msi') || name.endsWith('.exe')) && !name.includes('signature');
        } else if (osLower === 'macos' || osLower === 'darwin') {
            return name.endsWith('.dmg') || name.endsWith('.zip');
        } else if (osLower === 'linux') {
            return name.endsWith('.appimage') || name.endsWith('.deb');
        }
        return false;
    });

    if (osAssets.length === 0) return null;

    // Map architecture to keywords
    let archKeywords: string[] = [];
    if (archLower === 'x86_64' || archLower === 'amd64' || archLower === 'x64') {
        archKeywords = ['x64', 'amd64', 'x86_64'];
    } else if (archLower === 'aarch64' || archLower === 'arm64') {
        archKeywords = ['arm64', 'aarch64', 'arm'];
    }

    if (archKeywords.length > 0) {
        const archMatched = osAssets.filter(asset => {
            const name = asset.name.toLowerCase();
            return archKeywords.some(keyword => name.includes(keyword));
        });

        if (archMatched.length > 0) {
            // OS Preference
            if (osLower === 'windows') {
                const msi = archMatched.find(a => a.name.toLowerCase().endsWith('.msi'));
                if (msi) return msi;
            } else if (osLower === 'linux') {
                const appimage = archMatched.find(a => a.name.toLowerCase().endsWith('.appimage'));
                if (appimage) return appimage;
            } else if (osLower === 'macos' || osLower === 'darwin') {
                const dmg = archMatched.find(a => a.name.toLowerCase().endsWith('.dmg'));
                if (dmg) return dmg;
            }
            return archMatched[0];
        }
    }

    // OS Fallback if architecture matching fails
    if (osLower === 'windows') {
        const msi = osAssets.find(a => a.name.toLowerCase().endsWith('.msi'));
        if (msi) return msi;
    } else if (osLower === 'linux') {
        const appimage = osAssets.find(a => a.name.toLowerCase().endsWith('.appimage'));
        if (appimage) return appimage;
    }
    return osAssets[0];
}

export const updaterService = {
    async checkUpdate(): Promise<UpdateInfo | null> {
        try {
            const response = await fetch(`${GITHUB_API_URL}?t=${Date.now()}`, {
                cache: "no-store"
            });
            if (!response.ok) {
                throw new Error(`GitHub API returned status ${response.status}`);
            }

            const release: GitHubRelease = await response.json();
            const currentVersion = await getVersion();
            const latestVersion = release.tag_name;

            if (isNewerVersion(currentVersion, latestVersion)) {
                // Get OS information from Rust backend
                const osInfo: OsInfo = await invoke("get_os_info");
                const matchedAsset = matchAsset(release.assets, osInfo.os, osInfo.arch);

                if (matchedAsset) {
                    return {
                        version: latestVersion,
                        name: release.name,
                        notes: release.body || "No release notes provided.",
                        downloadUrl: matchedAsset.browser_download_url,
                        size: matchedAsset.size,
                        fileName: matchedAsset.name
                    };
                }
            }
            return null;
        } catch (e) {
            console.error("Failed to check for updates:", e);
            throw e;
        }
    },

    async startDownload(url: string, fileName: string, totalSize: number, onProgress: (pct: number) => void): Promise<string> {
        const temp = await tempDir();
        const destPath = await join(temp, fileName);

        // Listen for progress updates from Rust background thread
        const unlistenProgress = await listen<number>("download-progress", (event) => {
            onProgress(event.payload);
        });

        return new Promise<string>(async (resolve, reject) => {
            let unlistenComplete: (() => void) | null = null;
            let unlistenError: (() => void) | null = null;

            const cleanup = () => {
                unlistenProgress();
                if (unlistenComplete) unlistenComplete();
                if (unlistenError) unlistenError();
            };

            unlistenComplete = await listen("download-complete", () => {
                cleanup();
                resolve(destPath);
            });

            unlistenError = await listen<string>("download-error", (event) => {
                cleanup();
                reject(new Error(event.payload));
            });

            try {
                // Start background download
                await invoke("start_download", { url, destPath, totalSize });
            } catch (e) {
                cleanup();
                reject(e);
            }
        });
    },

    async installUpdate(path: string): Promise<void> {
        await invoke("install_update", { path });
    }
};
