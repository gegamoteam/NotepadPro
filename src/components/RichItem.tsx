import React from 'react';
import { Note } from '../types/note';
import { FileText, Pin } from 'lucide-react'; // Added Pin

interface RichItemProps {
    item: Note;
    isSelected: boolean;
    isPinned?: boolean; // New prop
    onClick: (e: React.MouseEvent) => void;
    onContextMenu: (e: React.MouseEvent) => void;
    // Drag props removed
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    isCollapsed?: boolean;
}

export const RichItem: React.FC<RichItemProps> = ({
    item, isSelected, isPinned, onClick, onContextMenu,
    // Consume unused props to satisfy interface but ignoring them
    onDragStart: _start, onDragOver: _over, onDragLeave: _leave, onDrop: _drop,
    isCollapsed
}) => {
    // Format date
    const dateStr = new Date(item.lastModified || 0).toLocaleDateString();

    if (isCollapsed) {
        return (
            <div
                className={`rich-sidebar-item ${isSelected ? 'selected' : ''}`}
                onClick={onClick}
                onContextMenu={onContextMenu}
                title={item.name} // Tooltip
                style={{ justifyContent: 'center', padding: '12px 0' }}
            >
                <div className="rich-item-icon" style={{ position: 'relative', margin: 0 }}>
                    {isPinned && <Pin size={10} style={{ position: 'absolute', top: -4, right: -4, fill: 'currentColor' }} />}
                    <FileText size={20} color="currentColor" />
                </div>
            </div>
        );
    }

    return (
        <div
            className={`rich-sidebar-item ${isSelected ? 'selected' : ''}`}
            onClick={onClick}
            onContextMenu={onContextMenu}
            style={{ paddingLeft: '16px', paddingRight: '8px' }} // Keep the padding fix
        >
            <div className="rich-item-icon">
                <FileText size={18} color="currentColor" />
            </div>
            <div className="rich-item-content">
                <div className="rich-item-title" style={{ maxWidth: '180px', display: 'flex', alignItems: 'center' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                    {isPinned && <Pin size={12} style={{ marginLeft: '6px', opacity: 0.7, flexShrink: 0 }} />}
                </div>
                <div className="rich-item-date">{dateStr}</div>
            </div>
        </div>
    );
};
