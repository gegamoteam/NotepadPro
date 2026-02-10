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
        if (["Control", "Shift", "Alt", "Meta"].includes(key)) {
            setRecordedKeys(modifiers);
            return;
        }

        const keyName = key.length === 1 ? key.toUpperCase() : key;
        const combo = [...modifiers, keyName];
        setRecordedKeys(combo);

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

    const selectExtension = (ext: string) => {
        onShortcutChange({ ...shortcutSettings, defaultExtension: ext });
        if (['txt', 'md'].includes(ext)) setCustomExtInput('');
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="settings-modal" onClick={e => e.stopPropagation()}>

                {/* ── Header ──────────────────────── */}
                <div className="settings-header">
                    <h3>Settings</h3>
                    <button className="settings-close-btn" onClick={onClose}>&times;</button>
                </div>

                {/* ── Scrollable body ─────────────── */}
                <div className="settings-body">

                    {/* Appearance */}
                    <div className="settings-section">
                        <h4>Appearance</h4>
                        <div className="settings-row">
                            <label>Theme</label>
                            <div className="settings-pills">
                                <button
                                    className={`settings-pill ${theme === 'light' ? 'active' : ''}`}
                                    onClick={() => onThemeChange('light')}
                                >Light</button>
                                <button
                                    className={`settings-pill ${theme === 'dark' ? 'active' : ''}`}
                                    onClick={() => onThemeChange('dark')}
                                >Dark</button>
                            </div>
                        </div>
                    </div>

                    <hr className="settings-divider" />

                    {/* Global Shortcut */}
                    <div className="settings-section">
                        <h4>Global Shortcut</h4>

                        <div className="settings-row">
                            <label>Enable Shortcut</label>
                            <button
                                className={`settings-toggle ${shortcutSettings.enabled ? 'on' : 'off'}`}
                                onClick={toggleShortcut}
                            >
                                {shortcutSettings.enabled ? 'On' : 'Off'}
                            </button>
                        </div>

                        {shortcutSettings.enabled && (
                            <>
                                <div className="settings-row">
                                    <label>Current Shortcut</label>
                                    <span className="settings-shortcut-badge">
                                        {isRecording
                                            ? (recordedKeys.length > 0 ? recordedKeys.join(" + ") : "Press keys…")
                                            : shortcutSettings.shortcut
                                        }
                                    </span>
                                </div>

                                <button
                                    className={`settings-action-btn ${isRecording ? 'recording' : ''}`}
                                    onClick={() => {
                                        setIsRecording(!isRecording);
                                        setRecordedKeys([]);
                                    }}
                                >
                                    {isRecording ? '⏹ Cancel Recording' : '⌨️ Record New Shortcut'}
                                </button>

                                <div style={{ marginTop: '4px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                                        Default File Format
                                    </label>
                                    <div className="settings-pills" style={{ maxWidth: '240px' }}>
                                        <button
                                            className={`settings-pill ${shortcutSettings.defaultExtension === 'txt' ? 'active' : ''}`}
                                            onClick={() => selectExtension('txt')}
                                        >.txt</button>
                                        <button
                                            className={`settings-pill ${shortcutSettings.defaultExtension === 'md' ? 'active' : ''}`}
                                            onClick={() => selectExtension('md')}
                                        >.md</button>
                                        <button
                                            className={`settings-pill ${isCustomExt ? 'active' : ''}`}
                                            onClick={() => selectExtension(customExtInput || 'json')}
                                        >Custom</button>
                                    </div>

                                    {isCustomExt && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
                                            <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>.</span>
                                            <input
                                                type="text"
                                                className="settings-input"
                                                value={customExtInput}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                                                    setCustomExtInput(val);
                                                    if (val) onShortcutChange({ ...shortcutSettings, defaultExtension: val });
                                                }}
                                                placeholder="json"
                                                style={{ width: '90px', fontFamily: 'monospace' }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <hr className="settings-divider" />

                    {/* Autosave */}
                    <div className="settings-section">
                        <h4>Autosave</h4>
                        <div className="settings-row">
                            <label>Enable Autosave</label>
                            <button
                                className={`settings-toggle ${autosaveSettings.enabled ? 'on' : 'off'}`}
                                onClick={toggleAutosave}
                            >
                                {autosaveSettings.enabled ? 'On' : 'Off'}
                            </button>
                        </div>

                        {autosaveSettings.enabled && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div className="settings-row">
                                    <label>Interval</label>
                                    <span className="settings-value">{autosaveSettings.interval}ms</span>
                                </div>
                                <input
                                    type="range"
                                    className="settings-slider"
                                    min="100"
                                    max="5000"
                                    step="100"
                                    value={autosaveSettings.interval}
                                    onChange={(e) => updateInterval(parseInt(e.target.value))}
                                />
                                <div className="settings-slider-labels">
                                    <span>100ms (instant)</span>
                                    <span>5000ms (5s)</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <hr className="settings-divider" />

                    {/* Storage */}
                    <div className="settings-section">
                        <h4>Storage</h4>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary, #888)' }}>Current Location</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                className="settings-input"
                                value={rootPath}
                                readOnly
                                style={{ flex: 1 }}
                            />
                            <button className="settings-action-btn" onClick={onChangeRootPath}>
                                Change…
                            </button>
                        </div>
                        <p className="settings-hint">
                            Changing this will reload your notes from the new location.
                        </p>
                    </div>

                    <hr className="settings-divider" />

                    {/* Data Management */}
                    <div className="settings-section">
                        <h4>Data Management</h4>
                        <div className="settings-row">
                            <label>Hidden Files</label>
                            <button className="settings-danger-btn" onClick={handleClearHidden}>
                                Unhide All
                            </button>
                        </div>
                    </div>

                </div>

                {/* ── Footer ──────────────────────── */}
                <div className="settings-footer">
                    <button className="settings-done-btn" onClick={onClose}>
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
