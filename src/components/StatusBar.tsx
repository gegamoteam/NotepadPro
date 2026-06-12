import { ReactNode } from "react";
import "../styles/statusbar.css";

interface StatusBarProps {
    filePath?: string;
    line: number;
    col: number;
    encoding?: string;
    isSaving?: boolean;
    version?: string;
    children?: ReactNode;
}

export default function StatusBar({ filePath, line, col, encoding = "UTF-8", isSaving, version, children }: StatusBarProps) {
    return (
        <div className="status-bar">
            <div className="status-item path">{filePath || "Untitled"}</div>
            {isSaving && <div className="status-item" style={{ marginLeft: '15px', color: '#888', fontStyle: 'italic' }}>Saving...</div>}
            <div className="status-spacer" />
            {children}
            <div className="status-item">Ln {line}, Col {col}</div>
            <div className="status-item">{encoding}</div>
            {version && <div className="status-item">v{version}</div>}
        </div>
    );
}
