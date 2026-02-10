import { useState } from 'react';
import "../styles/modal.css";

interface OnboardingProps {
    isOpen: boolean;
    onClose: () => void;
    onEnableShortcut: () => void;
}

export default function Onboarding({ isOpen, onClose, onEnableShortcut }: OnboardingProps) {
    const [step, setStep] = useState(0);
    const [shortcutEnabled, setShortcutEnabled] = useState(false);

    if (!isOpen) return null;

    const handleEnableShortcut = () => {
        onEnableShortcut();
        setShortcutEnabled(true);
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
            content: null, // Custom content rendered below
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

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ width: '400px', textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>
                    {slides[step].image}
                </div>
                <h2>{slides[step].title}</h2>

                {step === 3 ? (
                    <div style={{ minHeight: '100px' }}>
                        <p style={{ color: '#666', lineHeight: '1.6', margin: '0 0 16px 0' }}>
                            Open NoteX from anywhere with a global shortcut.
                        </p>
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
