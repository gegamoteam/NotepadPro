import { useState, useEffect, useCallback } from "react";
import "../styles/modal.css";
import { filesystem } from "../services/filesystem";
import { AutosaveSettings, ShortcutSettings } from "../services/settings";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    theme: 'light' | 'dark';
    onThemeChange: (t: 'light' | 'dark') => void;
    rootPath: string;
    onChangeRootPath: () => void;
    autosaveSettings: AutosaveSettings;
    onAutosaveChange: (settings: AutosaveSettings) => void;
    shortcutSettings: ShortcutSettings;
    onShortcutChange: (settings: ShortcutSettings) => void;
}

export default function SettingsModal({
    isOpen, onClose, theme, onThemeChange, rootPath, onChangeRootPath,
    autosaveSettings, onAutosaveChange,
    shortcutSettings, onShortcutChange
}: SettingsModalProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
    const [customExtInput, setCustomExtInput] = useState(
        !['txt', 'md'].includes(shortcutSettings.defaultExtension) ? shortcutSettings.defaultExtension : ''
    );
    const isCustomExt = !['txt', 'md'].includes(shortcutSettings.defaultExtension);

    // Reset recording state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setIsRecording(false);
            setRecordedKeys([]);
        }
    }, [isOpen]);

    const handleRecordKeyDown = useCallback((e: KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const modifiers: string[] = [];
        if (e.ctrlKey) modifiers.push("Ctrl");
        if (e.shiftKey) modifiers.push("Shift");
        if (e.altKey) modifiers.push("Alt");

        const key = e.key;
        // Ignore standalone modifier keys
        if (["Control", "Shift", "Alt", "Meta"].includes(key)) {
            setRecordedKeys(modifiers);
            return;
        }

        const keyName = key.length === 1 ? key.toUpperCase() : key;
        const combo = [...modifiers, keyName];
        setRecordedKeys(combo);

        // Require at least one modifier + a key
        if (modifiers.length > 0) {
            const shortcutStr = combo.join("+");
            onShortcutChange({ ...shortcutSettings, shortcut: shortcutStr, enabled: true });
            setIsRecording(false);
        }
    }, [shortcutSettings, onShortcutChange]);

    useEffect(() => {
        if (isRecording) {
            window.addEventListener("keydown", handleRecordKeyDown, true);
            return () => window.removeEventListener("keydown", handleRecordKeyDown, true);
        }
    }, [isRecording, handleRecordKeyDown]);

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

    const toggleAutosave = () => {
        onAutosaveChange({ ...autosaveSettings, enabled: !autosaveSettings.enabled });
    };

    const updateInterval = (value: number) => {
        const clamped = Math.max(100, Math.min(5000, value));
        onAutosaveChange({ ...autosaveSettings, interval: clamped });
    };

    const toggleShortcut = () => {
        onShortcutChange({ ...shortcutSettings, enabled: !shortcutSettings.enabled });
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

                    {/* Global Shortcut */}
                    <div className="setting-group">
                        <h4 style={{ margin: '0 0 10px 0' }}>Global Shortcut</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label>Enable Shortcut</label>
                                <button
                                    onClick={toggleShortcut}
                                    style={{
                                        padding: '5px 15px',
                                        cursor: 'pointer',
                                        background: shortcutSettings.enabled ? 'var(--accent-color)' : '#ddd',
                                        color: shortcutSettings.enabled ? '#fff' : '#000',
                                        border: 'none',
                                        borderRadius: '4px',
                                        minWidth: '60px'
                                    }}
                                >
                                    {shortcutSettings.enabled ? 'On' : 'Off'}
                                </button>
                            </div>

                            {shortcutSettings.enabled && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <label style={{ fontSize: '0.9em' }}>Current Shortcut</label>
                                        <span style={{
                                            fontFamily: 'monospace', fontSize: '0.9em',
                                            padding: '3px 10px', borderRadius: '4px',
                                            background: 'var(--sidebar-bg, #f5f5f5)',
                                            border: '1px solid var(--border-color, #ddd)'
                                        }}>
                                            {isRecording
                                                ? (recordedKeys.length > 0 ? recordedKeys.join(" + ") : "Press keys...")
                                                : shortcutSettings.shortcut
                                            }
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsRecording(!isRecording);
                                            setRecordedKeys([]);
                                        }}
                                        style={{
                                            padding: '6px 12px',
                                            cursor: 'pointer',
                                            background: isRecording ? '#e74c3c' : 'var(--sidebar-active)',
                                            color: isRecording ? '#fff' : 'var(--text-color)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '4px',
                                            fontSize: '0.85em'
                                        }}
                                    >
                                        {isRecording ? '⏹ Cancel' : '⌨️ Record New Shortcut'}
                                    </button>

                                    {/* Default File Format */}
                                    <div style={{ marginTop: '4px' }}>
                                        <label style={{ fontSize: '0.9em', display: 'block', marginBottom: '6px' }}>Default File Format</label>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {['txt', 'md'].map(ext => (
                                                <button
                                                    key={ext}
                                                    onClick={() => {
                                                        onShortcutChange({ ...shortcutSettings, defaultExtension: ext });
                                                        setCustomExtInput('');
                                                    }}
                                                    style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '4px',
                                                        border: shortcutSettings.defaultExtension === ext ? '2px solid var(--accent-color)' : '1px solid var(--border-color, #ddd)',
                                                        background: shortcutSettings.defaultExtension === ext ? 'var(--accent-color)' : 'var(--sidebar-bg, #f5f5f5)',
                                                        color: shortcutSettings.defaultExtension === ext ? '#fff' : 'var(--text-color)',
                                                        cursor: 'pointer',
                                                        fontFamily: 'monospace',
                                                        fontSize: '0.85em',
                                                        fontWeight: 600
                                                    }}
                                                >.{ext}</button>
                                            ))}
                                            <button
                                                onClick={() => {
                                                    const ext = customExtInput || 'json';
                                                    onShortcutChange({ ...shortcutSettings, defaultExtension: ext });
                                                }}
                                                style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '4px',
                                                    border: isCustomExt ? '2px solid var(--accent-color)' : '1px solid var(--border-color, #ddd)',
                                                    background: isCustomExt ? 'var(--accent-color)' : 'var(--sidebar-bg, #f5f5f5)',
                                                    color: isCustomExt ? '#fff' : 'var(--text-color)',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85em',
                                                    fontWeight: 600
                                                }}
                                            >Custom</button>
                                        </div>
                                        {isCustomExt && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                                                <span style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>.</span>
                                                <input
                                                    type="text"
                                                    value={customExtInput}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                                                        setCustomExtInput(val);
                                                        if (val) onShortcutChange({ ...shortcutSettings, defaultExtension: val });
                                                    }}
                                                    placeholder="json"
                                                    style={{
                                                        width: '80px', padding: '3px 6px',
                                                        border: '1px solid var(--border-color, #ddd)',
                                                        borderRadius: '4px', fontFamily: 'monospace',
                                                        fontSize: '0.85em', background: 'var(--bg-color)',
                                                        color: 'var(--text-color)', outline: 'none'
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Autosave */}
                    <div className="setting-group">
                        <h4 style={{ margin: '0 0 10px 0' }}>Autosave</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label>Enable Autosave</label>
                                <button
                                    onClick={toggleAutosave}
                                    style={{
                                        padding: '5px 15px',
                                        cursor: 'pointer',
                                        background: autosaveSettings.enabled ? 'var(--accent-color)' : '#ddd',
                                        color: autosaveSettings.enabled ? '#fff' : '#000',
                                        border: 'none',
                                        borderRadius: '4px',
                                        minWidth: '60px'
                                    }}
                                >
                                    {autosaveSettings.enabled ? 'On' : 'Off'}
                                </button>
                            </div>
                            {autosaveSettings.enabled && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <label style={{ fontSize: '0.9em' }}>Interval</label>
                                        <span style={{ fontSize: '0.85em', color: '#888' }}>{autosaveSettings.interval}ms</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="100"
                                        max="5000"
                                        step="100"
                                        value={autosaveSettings.interval}
                                        onChange={(e) => updateInterval(parseInt(e.target.value))}
                                        style={{ width: '100%', cursor: 'pointer' }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#888' }}>
                                        <span>100ms (instant)</span>
                                        <span>5000ms (5s)</span>
                                    </div>
                                </div>
                            )}
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

                </div>

                <div className="modal-footer" style={{ padding: '20px', borderTop: '1px solid var(--border-color)', textAlign: 'right' }}>
                    <button onClick={onClose} className="btn-ok" style={{ padding: '8px 16px', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
                </div>
            </div>
        </div>
    );
}
