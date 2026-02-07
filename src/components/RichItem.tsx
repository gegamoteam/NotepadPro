import React from 'react';
import { Note } from '../types/note';
import { FileText, FileCode, Pin } from 'lucide-react';

interface RichItemProps {
    item: Note;
    isSelected: boolean;
    isPinned?: boolean;
    onClick: (e: React.MouseEvent) => void;
    onContextMenu: (e: React.MouseEvent) => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    isCollapsed?: boolean;
}

// Helper to get icon based on file extension
const getFileIcon = (filename: string, size: number) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'md' || ext === 'markdown') {
        return <FileCode size={size} color="currentColor" />;
    }
    return <FileText size={size} color="currentColor" />;
};

export const RichItem: React.FC<RichItemProps> = ({
    item, isSelected, isPinned, onClick, onContextMenu,
    onDragStart: _start, onDragOver: _over, onDragLeave: _leave, onDrop: _drop,
    isCollapsed
}) => {
    const dateStr = new Date(item.lastModified || 0).toLocaleDateString();

    if (isCollapsed) {
        return (
            <div
                className={`rich-sidebar-item ${isSelected ? 'selected' : ''}`}
                onClick={onClick}
                onContextMenu={onContextMenu}
                title={item.name}
                style={{ justifyContent: 'center', padding: '12px 0' }}
            >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isPinned && <Pin size={10} style={{ position: 'absolute', top: -4, right: -4, fill: 'currentColor' }} />}
                    {getFileIcon(item.name, 20)}
                </div>
            </div>
        );
    }

    return (
        <div
            className={`rich-sidebar-item ${isSelected ? 'selected' : ''}`}
            onClick={onClick}
            onContextMenu={onContextMenu}
            style={{ paddingLeft: '16px', paddingRight: '8px' }}
        >
            <div className="rich-item-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, fontSize: '13px', flex: 1 }}>
                    {item.name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    {isPinned && <Pin size={12} style={{ opacity: 0.7 }} />}
                    {getFileIcon(item.name, 14)}
                </div>
            </div>
            <div className="rich-item-date">{dateStr}</div>
        </div>
    );
};
