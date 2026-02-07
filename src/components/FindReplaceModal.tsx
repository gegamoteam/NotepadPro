import { useState } from "react";
import "../styles/FindReplaceModal.css";

interface FindReplaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onFind: (query: string) => void;
    onReplace: (query: string, replacement: string) => void;
    onReplaceAll: (query: string, replacement: string) => void;
}

export default function FindReplaceModal({ isOpen, onClose, onFind, onReplace, onReplaceAll }: FindReplaceModalProps) {
    const [findText, setFindText] = useState("");
    const [replaceText, setReplaceText] = useState("");

    if (!isOpen) return null;

    return (
        <div className="find-modal">
            <div className="find-row">
                <label>Find:</label>
                <input
                    type="text"
                    value={findText}
                    onChange={(e) => setFindText(e.target.value)}
                    autoFocus
                />
            </div>
            <div className="find-row">
                <label>Replace:</label>
                <input
                    type="text"
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                />
            </div>
            <div className="find-actions">
                <button onClick={() => onFind(findText)}>Find Next</button>
                <button onClick={() => onReplace(findText, replaceText)}>Replace</button>
                <button onClick={() => onReplaceAll(findText, replaceText)}>Replace All</button>
                <button onClick={onClose}>Close</button>
            </div>
        </div>
    );
}
