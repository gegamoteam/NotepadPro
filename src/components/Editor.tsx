import React, { useRef, useEffect } from "react";
import "../styles/editor.css";

interface EditorProps {
    content: string;
    onChange: (value: string) => void;
    wordWrap: boolean;
    onCursorChange?: (line: number, col: number) => void;
    fontSize?: number;
}

export default function Editor({ content, onChange, wordWrap, onCursorChange, fontSize = 14 }: EditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSelect = () => {
        if (textareaRef.current && onCursorChange) {
            const val = textareaRef.current.value;
            const selectionStart = textareaRef.current.selectionStart;
            const lines = val.substring(0, selectionStart).split("\n");
            const line = lines.length;
            const col = lines[lines.length - 1].length + 1;
            onCursorChange(line, col);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
        handleSelect();
    };

    useEffect(() => {
        // Auto-focus on mount
        textareaRef.current?.focus();
    }, []);

    return (
        <div className="editor-container">
            <textarea
                ref={textareaRef}
                className={`editor-textarea ${wordWrap ? "wrap" : "no-wrap"}`}
                value={content}
                onChange={handleChange}
                onSelect={handleSelect}
                onKeyUp={handleSelect}
                onClick={handleSelect}
                spellCheck={false}
                style={{ fontSize: `${fontSize}px` }}
            />
        </div>
    );
}
