import { useState } from 'react';
import "../styles/modal.css";

interface OnboardingProps {
    isOpen: boolean;
    onClose: () => void;
    onEnableShortcut: (extension: string) => void;
}

export default function Onboarding({ isOpen, onClose, onEnableShortcut }: OnboardingProps) {
    const [step, setStep] = useState(0);
    const [shortcutEnabled, setShortcutEnabled] = useState(false);
    const [selectedExt, setSelectedExt] = useState("txt");
    const [customExt, setCustomExt] = useState("");
    const [showCustomInput, setShowCustomInput] = useState(false);

    if (!isOpen) return null;

    const handleEnableShortcut = () => {
        const ext = showCustomInput ? (customExt.replace(/^\./, '') || 'txt') : selectedExt;
        onEnableShortcut(ext);
        setShortcutEnabled(true);
    };

    const handleExtClick = (ext: string) => {
        setSelectedExt(ext);
        setShowCustomInput(false);
    };

    const slides = [
        {
            title: "Welcome to NoteX",
            content: "The modern, powerful note-taking app designed for speed and simplicity.",
            image: "👋"
        },
        {
            title: "Code Ready",
            content: "Edit text, code, and markdown with syntax highlighting and smart features.",
            image: "💻"
        },
        {
            title: "Organized",
            content: "Pin your favorite notes, search instantly, and manage your file system directly.",
            image: "🗂️"
        },
        {
            title: "Quick Launch",
            content: null,
            image: "⌨️"
        }
    ];

    const handleNext = () => {
        if (step < slides.length - 1) {
            setStep(step + 1);
        } else {
            onClose();
        }
    };

    const extBtnStyle = (active: boolean): React.CSSProperties => ({
        padding: '6px 14px',
        borderRadius: '6px',
        border: active ? '2px solid var(--accent-color)' : '1px solid var(--border-color, #ddd)',
        background: active ? 'var(--accent-color)' : 'var(--sidebar-bg, #f5f5f5)',
        color: active ? '#fff' : 'var(--text-color, #333)',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 600,
        fontFamily: 'monospace',
        transition: 'all 0.2s'
    });

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ width: '400px', textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>
                    {slides[step].image}
                </div>
                <h2>{slides[step].title}</h2>

                {step === 3 ? (
                    <div style={{ minHeight: '100px' }}>
                        <p style={{ color: '#666', lineHeight: '1.6', margin: '0 0 12px 0' }}>
                            Press <strong>Ctrl + Shift + N</strong> from anywhere to open NoteX with a fresh note.
                        </p>

                        {/* Extension picker */}
                        <p style={{ color: '#888', fontSize: '12px', margin: '0 0 8px 0' }}>
                            Default file format:
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
                            <button style={extBtnStyle(selectedExt === 'txt' && !showCustomInput)} onClick={() => handleExtClick('txt')}>.txt</button>
                            <button style={extBtnStyle(selectedExt === 'md' && !showCustomInput)} onClick={() => handleExtClick('md')}>.md</button>
                            <button style={extBtnStyle(showCustomInput)} onClick={() => { setShowCustomInput(true); setSelectedExt(''); }}>Custom</button>
                        </div>

                        {showCustomInput && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '12px' }}>
                                <span style={{ fontSize: '14px', fontFamily: 'monospace', lineHeight: '30px' }}>.</span>
                                <input
                                    type="text"
                                    value={customExt}
                                    onChange={(e) => setCustomExt(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                                    placeholder="json"
                                    style={{
                                        width: '80px', padding: '4px 8px',
                                        border: '1px solid var(--border-color, #ddd)',
                                        borderRadius: '4px', fontFamily: 'monospace',
                                        fontSize: '14px', textAlign: 'center',
                                        outline: 'none'
                                    }}
                                    autoFocus
                                />
                            </div>
                        )}

                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            padding: '8px 16px', borderRadius: '8px',
                            background: 'var(--sidebar-bg, #f5f5f5)',
                            border: '1px solid var(--border-color, #ddd)',
                            fontFamily: 'monospace', fontSize: '15px', fontWeight: 600,
                            marginBottom: '12px'
                        }}>
                            Ctrl + Shift + N
                        </div>

                        <div style={{ marginTop: '12px' }}>
                            <button
                                onClick={handleEnableShortcut}
                                disabled={shortcutEnabled}
                                style={{
                                    padding: '8px 20px',
                                    background: shortcutEnabled ? '#27ae60' : 'var(--accent-color)',
                                    color: 'white', border: 'none', borderRadius: '6px',
                                    cursor: shortcutEnabled ? 'default' : 'pointer',
                                    fontSize: '14px', transition: 'all 0.2s'
                                }}
                            >
                                {shortcutEnabled ? '✓ Shortcut Enabled' : 'Enable Shortcut'}
                            </button>
                        </div>
                        <p style={{ color: '#999', fontSize: '11px', marginTop: '8px' }}>
                            You can change this anytime in Settings.
                        </p>
                    </div>
                ) : (
                    <p style={{ color: '#666', lineHeight: '1.6', minHeight: '60px' }}>
                        {slides[step].content}
                    </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', margin: '20px 0' }}>
                    {slides.map((_, i) => (
                        <div key={i} style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: i === step ? 'var(--accent-color)' : '#ddd',
                            transition: 'background 0.3s'
                        }} />
                    ))}
                </div>

                <button
                    onClick={handleNext}
                    style={{
                        background: 'var(--accent-color)', color: 'white', border: 'none',
                        padding: '10px 24px', borderRadius: '20px', fontSize: '16px', cursor: 'pointer',
                        width: '100%'
                    }}
                >
                    {step === slides.length - 1 ? "Get Started" : "Next"}
                </button>
            </div>
        </div>
    );
}
