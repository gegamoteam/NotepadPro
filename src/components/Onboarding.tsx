import { useState } from 'react';
import "../styles/modal.css";

interface OnboardingProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Onboarding({ isOpen, onClose }: OnboardingProps) {
    const [step, setStep] = useState(0);

    if (!isOpen) return null;

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
            title: "Global Access",
            content: "Add NoteX to your PATH to open it from anywhere with 'note' or 'notex' (Check Settings to configure).",
            image: "🌍"
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
                <p style={{ color: '#666', lineHeight: '1.6', minHeight: '60px' }}>
                    {slides[step].content}
                </p>

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
