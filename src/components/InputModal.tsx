import { useState, useEffect, useRef } from "react";
import "../styles/modal.css"; // Reuse modal styles or generic ones

interface InputModalProps {
    isOpen: boolean;
    title: string;
    initialValue?: string;
    onClose: () => void;
    onSubmit: (value: string) => void;
    maxLength?: number;
}

export default function InputModal({ isOpen, title, initialValue = "", onClose, onSubmit, maxLength }: InputModalProps) {
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen, initialValue]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(value);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content input-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <input
                        ref={inputRef}
                        type="text"
                        className="modal-input"
                        value={value}
                        maxLength={maxLength}
                        onChange={e => setValue(e.target.value)}
                    />
                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn-cancel">Cancel</button>
                        <button type="submit" className="btn-ok">OK</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
