import "../styles/modal.css";
import { filesystem } from "../services/filesystem";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    theme: 'light' | 'dark';
    onThemeChange: (t: 'light' | 'dark') => void;
    rootPath: string;
    onChangeRootPath: () => void;
}

export default function SettingsModal({
    isOpen, onClose, theme, onThemeChange, rootPath, onChangeRootPath
}: SettingsModalProps) {
    if (!isOpen) return null;

    const handleClearHidden = async () => {
        if (confirm("Are you sure you want to unhide all hidden files?")) {
            const hiddenPath = `${rootPath}\\.hidden.json`;
            try {
                await filesystem.deleteItem(hiddenPath);
                alert("Hidden files cleared. Please refresh (Ctrl+R) or restart.");
            } catch (e) {
                console.error(e);
                alert("Failed to clear hidden files.");
            }
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" style={{ width: '90%', maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Settings</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Appearance */}
                    <div className="setting-group">
                        <h4 style={{ margin: '0 0 10px 0' }}>Appearance</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label>Theme</label>
                            <div className="toggle-group">
                                <button
                                    className={`btn-toggle ${theme === 'light' ? 'active' : ''}`}
                                    onClick={() => onThemeChange('light')}
                                    style={{ padding: '5px 10px', cursor: 'pointer', background: theme === 'light' ? 'var(--accent-color)' : '#ddd', color: theme === 'light' ? '#fff' : '#000', border: 'none', borderRadius: '4px 0 0 4px' }}
                                >
                                    Light
                                </button>
                                <button
                                    className={`btn-toggle ${theme === 'dark' ? 'active' : ''}`}
                                    onClick={() => onThemeChange('dark')}
                                    style={{ padding: '5px 10px', cursor: 'pointer', background: theme === 'dark' ? 'var(--accent-color)' : '#ddd', color: theme === 'dark' ? '#fff' : '#000', border: 'none', borderRadius: '0 4px 4px 0' }}
                                >
                                    Dark
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Storage */}
                    <div className="setting-group">
                        <h4 style={{ margin: '0 0 10px 0' }}>Storage</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.9em', color: '#666' }}>Current Location</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    type="text"
                                    value={rootPath}
                                    readOnly
                                    style={{ flex: 1, padding: '8px', background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                                />
                                <button
                                    onClick={onChangeRootPath}
                                    style={{ padding: '8px 12px', background: 'var(--sidebar-active)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-color)' }}
                                >
                                    Change...
                                </button>
                            </div>
                            <p style={{ fontSize: '10px', color: '#888', margin: 0 }}>
                                * Changing this will reload your notes from the new location.
                            </p>
                        </div>
                    </div>

                    {/* Data Management */}
                    <div className="setting-group">
                        <h4 style={{ margin: '0 0 10px 0' }}>Data Management</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label>Hidden Files</label>
                            <button onClick={handleClearHidden} style={{ padding: '5px 10px', cursor: 'pointer', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px' }}>
                                Unhide All
                            </button>
                        </div>
                    </div>

                    {/* System */}
                    <div className="setting-group">
                        <h4 style={{ margin: '0 0 10px 0' }}>System Integration</h4>
                        <p style={{ fontSize: '12px' }}>
                            To access NoteX from anywhere, add the installation folder to your system PATH.
                        </p>
                        <div style={{
                            background: 'var(--sidebar-bg)',
                            padding: '10px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            marginTop: '5px',
                            color: 'var(--text-color)',
                            border: '1px solid var(--border-color)'
                        }}>
                            <strong>Manual Setup:</strong><br />
                            1. Search "Edit environment variables for your account"<br />
                            2. Edit "Path" variable<br />
                            3. Add the folder containing <code>notex.exe</code>
                        </div>
                    </div>

                </div>

                <div className="modal-footer" style={{ padding: '20px', borderTop: '1px solid var(--border-color)', textAlign: 'right' }}>
                    <button onClick={onClose} className="btn-ok" style={{ padding: '8px 16px', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
                </div>
            </div>
        </div>
    );
}
