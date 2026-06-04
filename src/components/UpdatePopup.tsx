import { useState } from "react";
import { UpdateInfo, updaterService } from "../services/updater";
import "../styles/update.css";

interface UpdatePopupProps {
    updateInfo: UpdateInfo;
    onClose: () => void;
}

type UpdateStatus = "idle" | "downloading" | "ready" | "error";

export default function UpdatePopup({ updateInfo, onClose }: UpdatePopupProps) {
    const [status, setStatus] = useState<UpdateStatus>("idle");
    const [progress, setProgress] = useState<number>(0);
    const [errorMsg, setErrorMsg] = useState<string>("");
    const [downloadedPath, setDownloadedPath] = useState<string>("");

    const formatBytes = (bytes: number, decimals = 1) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const handleUpdate = async () => {
        setStatus("downloading");
        setProgress(0);
        setErrorMsg("");

        try {
            const destPath = await updaterService.startDownload(
                updateInfo.downloadUrl,
                updateInfo.fileName,
                updateInfo.size,
                (pct) => setProgress(pct)
            );
            setDownloadedPath(destPath);
            setStatus("ready");
        } catch (e: any) {
            console.error("Update download failed:", e);
            setErrorMsg(e.message || "An error occurred during download.");
            setStatus("error");
        }
    };

    const handleInstall = async () => {
        try {
            await updaterService.installUpdate(downloadedPath);
        } catch (e: any) {
            console.error("Installer execution failed:", e);
            alert(`Failed to start installation: ${e.message || e}`);
        }
    };

    // Close when overlay is clicked, but ONLY if not downloading
    const handleOverlayClick = () => {
        if (status !== "downloading") {
            onClose();
        }
    };

    return (
        <div className="update-overlay" onClick={handleOverlayClick}>
            <div className="update-dialog" onClick={(e) => e.stopPropagation()}>
                
                {/* Header */}
                <div className="update-header">
                    <div className="update-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                        </svg>
                    </div>
                    <div className="update-title-group">
                        <h3>Update Available</h3>
                        <span className="update-version-tag">Version {updateInfo.version}</span>
                    </div>
                </div>

                {/* Idle / Initial State */}
                {status === "idle" && (
                    <>
                        <div className="update-notes-container">
                            <span className="update-notes-title">Release Notes</span>
                            <div className="update-notes-content">
                                {updateInfo.notes}
                            </div>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary, #666)' }}>
                            File size: {formatBytes(updateInfo.size)}
                        </div>
                        <div className="update-actions">
                            <button className="update-btn update-btn-cancel" onClick={onClose}>
                                Later
                            </button>
                            <button className="update-btn update-btn-primary" onClick={handleUpdate}>
                                Update Now
                            </button>
                        </div>
                    </>
                )}

                {/* Downloading State */}
                {status === "downloading" && (
                    <div className="update-progress-container">
                        <div className="update-progress-info">
                            <span>Downloading update…</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="update-progress-bg">
                            <div className="update-progress-fill" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary, #888)', textAlign: 'right' }}>
                            {formatBytes(Math.round((progress / 100) * updateInfo.size))} / {formatBytes(updateInfo.size)}
                        </div>
                    </div>
                )}

                {/* Ready / Install State */}
                {status === "ready" && (
                    <>
                        <p style={{ margin: 0, fontSize: '14.5px', lineHeight: 1.5 }}>
                            The update has been downloaded successfully. Click <strong>Install & Relaunch</strong> to apply the update now.
                        </p>
                        <div className="update-actions">
                            <button className="update-btn update-btn-cancel" onClick={onClose}>
                                Close
                            </button>
                            <button className="update-btn update-btn-primary" onClick={handleInstall}>
                                Install & Relaunch
                            </button>
                        </div>
                    </>
                )}

                {/* Error State */}
                {status === "error" && (
                    <>
                        <p style={{ margin: 0, fontSize: '14.5px', color: '#e74c3c', lineHeight: 1.5 }}>
                            Failed to download the update:<br />
                            <span style={{ fontSize: '13px', color: 'var(--text-color)' }}>{errorMsg}</span>
                        </p>
                        <div className="update-actions">
                            <button className="update-btn update-btn-cancel" onClick={onClose}>
                                Cancel
                            </button>
                            <button className="update-btn update-btn-primary" onClick={handleUpdate}>
                                Retry
                            </button>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
}
