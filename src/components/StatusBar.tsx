import "../styles/statusbar.css";

interface StatusBarProps {
    filePath?: string;
    line: number;
    col: number;
    encoding?: string;
    isSaving?: boolean;
}

export default function StatusBar({ filePath, line, col, encoding = "UTF-8", isSaving }: StatusBarProps) {
    return (
        <div className="status-bar">
            <div className="status-item path">{filePath || "Untitled"}</div>
            {isSaving && <div className="status-item" style={{ marginLeft: '15px', color: '#888', fontStyle: 'italic' }}>Saving...</div>}
            <div className="status-spacer" />
            <div className="status-item">Ln {line}, Col {col}</div>
            <div className="status-item">{encoding}</div>
        </div>
    );
}
