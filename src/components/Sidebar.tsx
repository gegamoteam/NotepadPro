import { useState } from "react";
import { Note } from "../types/note";
import "../styles/sidebar.css";
import InputModal from "./InputModal";
import ContextMenu from "./ContextMenu";
import { ArrowUpDown, Search, Plus } from "lucide-react";
import { RichItem } from "./RichItem";
import { handleSelection } from "../utils/selection";
import { filesystem } from "../services/filesystem";

interface SidebarProps {
    notes: Note[];
    onOpenNote: (note: Note) => void;
    activeNotePath?: string;

    // Actions
    onCreateNote: () => void;
    onCreateNoteWithName?: (filename: string) => void;
    onCreateNoteWithExtension?: (extension: string) => void;
    onDelete: (path: string, permanent: boolean) => void; // Updated signature
    onRename: (path: string, newName: string) => void;
    onAdvancedSearch?: () => void; // New prop

    // Pinning
    pinnedPaths: string[];
    onTogglePin: (path: string) => void;

    // Sorting
    sortBy: 'date' | 'name' | 'modified';
    onSortChange: (sort: 'date' | 'name' | 'modified') => void;

    isCollapsed?: boolean;
}

export default function Sidebar({
    notes,
    onOpenNote,
    activeNotePath,
    onCreateNote,
    onCreateNoteWithName,
    onCreateNoteWithExtension,
    onDelete,
    onRename,
    onAdvancedSearch,
    pinnedPaths,
    onTogglePin,
    sortBy,
    onSortChange,
    isCollapsed
}: SidebarProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item?: Note, items?: string[] } | null>(null);
    const [newFileModal, setNewFileModal] = useState(false);
    const [plusMenu, setPlusMenu] = useState<{ x: number; y: number } | null>(null);
    const [modal, setModal] = useState<{
        isOpen: boolean;
        title: string;
        initialValue: string;
        onSubmit: (val: string) => void;
        maxLength?: number;
    }>({ isOpen: false, title: "", initialValue: "", onSubmit: () => { } });

    // Delete Confirmation Modal State
    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        itemPath?: string; // Single item
        itemPaths?: string[]; // Multiple items
    }>({ isOpen: false });

    const [deletePermanently, setDeletePermanently] = useState(false); // Checkbox state

    // Multi-selection State
    const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
    const [lastSelectedPath, setLastSelectedPath] = useState<string | null>(null);

    const getVisiblePaths = (): string[] => {
        return notes
            .filter(n => (!searchQuery || n.name.toLowerCase().includes(searchQuery.toLowerCase())))
            .map(n => n.path);
    };

    const handleItemClick = (e: React.MouseEvent, item: Note) => {
        e.stopPropagation();
        onOpenNote(item);

        const { newSelection, newLastSelected } = handleSelection(
            e,
            item.path,
            selectedPaths,
            getVisiblePaths(),
            lastSelectedPath
        );
        setSelectedPaths(newSelection);
        setLastSelectedPath(newLastSelected);
    };

    const handleContextMenu = (e: React.MouseEvent, item?: Note) => {
        e.preventDefault();
        e.stopPropagation();

        let currentSelection = selectedPaths;
        if (item && !selectedPaths.includes(item.path)) {
            currentSelection = [item.path];
            setSelectedPaths(currentSelection);
            setLastSelectedPath(item.path);
        }

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            item,
            items: currentSelection.length > 0 ? currentSelection : (item ? [item.path] : [])
        });
    };

    const openPlusMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setPlusMenu({ x: rect.left, y: rect.bottom + 4 });
    };

    const openRenameModal = (item: Note) => {
        setModal({
            isOpen: true,
            title: `Rename ${item.name}`,
            initialValue: item.name,
            maxLength: 50, // Character limit!
            onSubmit: (newName) => onRename(item.path, newName)
        });
    };

    const confirmDelete = (paths: string[]) => {
        setDeletePermanently(false); // Reset default
        setDeleteModal({ isOpen: true, itemPaths: paths });
    };

    const executeDelete = () => {
        if (deleteModal.itemPaths) {
            deleteModal.itemPaths.forEach(p => onDelete(p, deletePermanently));
        } else if (deleteModal.itemPath) {
            onDelete(deleteModal.itemPath, deletePermanently);
        }
        setDeleteModal({ isOpen: false });
        setSelectedPaths([]);
    };

    const openInExplorer = (path: string) => {
        filesystem.openInExplorer(path);
    };

    // Sort Toggle Helper
    const toggleSort = () => {
        if (sortBy === 'modified') {
            onSortChange('name');
        } else {
            onSortChange('modified');
        }
    };

    // Render List
    const renderList = () => {
        // Filter & Sort
        const filtered = notes.filter(n => !searchQuery || n.name.toLowerCase().includes(searchQuery.toLowerCase()));

        // Sorting is already done in useNotes via props, but we need to respect the list passed in.
        // The list passed in `notes` is already sorted by App -> useNotes.

        return filtered.map(item => (
            <RichItem
                key={item.path}
                item={item}
                isSelected={selectedPaths.includes(item.path) || item.path === activeNotePath}
                isPinned={pinnedPaths.includes(item.path)}
                onClick={(e) => handleItemClick(e, item)}
                onContextMenu={(e) => handleContextMenu(e, item)}
                isCollapsed={isCollapsed}
                // Drag props removed as per request to simplify
                onDragStart={() => { }}
                onDragOver={() => { }}
                onDragLeave={() => { }}
                onDrop={() => { }}
            />
        ));
    };

    return (
        <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} onContextMenu={(e) => handleContextMenu(e)}>
            <InputModal
                isOpen={modal.isOpen}
                title={modal.title}
                initialValue={modal.initialValue}
                maxLength={modal.maxLength}
                onClose={() => setModal({ ...modal, isOpen: false })}
                onSubmit={modal.onSubmit}
            />

            {/* Custom File Creation Modal */}
            <InputModal
                isOpen={newFileModal}
                title="Create New File"
                initialValue="New File.txt"
                maxLength={100}
                onClose={() => setNewFileModal(false)}
                onSubmit={(filename) => {
                    if (filename.trim() && onCreateNoteWithName) {
                        onCreateNoteWithName(filename.trim());
                    }
                    setNewFileModal(false);
                }}
            />

            {/* Custom Delete Modal */}
            {deleteModal.isOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div style={{
                        background: 'var(--bg-color)', color: 'var(--text-color)', padding: '20px', borderRadius: '8px',
                        width: '300px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', border: '1px solid var(--border-color)'
                    }}>
                        <h3 style={{ marginTop: 0 }}>Confirm Delete</h3>
                        <p>Are you sure you want to delete {deleteModal.itemPaths?.length || 1} item(s)?</p>

                        <div style={{ margin: '15px 0' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={deletePermanently}
                                    onChange={e => setDeletePermanently(e.target.checked)}
                                />
                                Delete Permanently from Disk
                            </label>
                            <div style={{ fontSize: '12px', color: '#888', marginLeft: '24px' }}>
                                {deletePermanently ? "File will be destroyed." : "File will be hidden from list."}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                            <button onClick={() => setDeleteModal({ isOpen: false })} style={{ padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={executeDelete} style={{ padding: '8px 16px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                {deletePermanently ? "Delete Forever" : "Remove"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={() => setContextMenu(null)}
                    items={[
                        { label: "New Note", action: onCreateNote },

                        // Single Item
                        ...((!contextMenu.items || contextMenu.items.length <= 1) && contextMenu.item ? [
                            { label: "separator", action: () => { }, separator: true },
                            { label: "Open in Folder", action: () => openInExplorer(contextMenu.item!.path) },
                            { label: "Rename", action: () => openRenameModal(contextMenu.item!) },
                            {
                                label: pinnedPaths.includes(contextMenu.item!.path) ? "Unpin" : "Pin",
                                action: () => onTogglePin(contextMenu.item!.path)
                            }
                        ] : []),

                        // Multi-select actions & Delete
                        ...(contextMenu.items && contextMenu.items.length >= 1 ? [
                            { label: "separator", action: () => { }, separator: true },
                            { label: `Delete (${contextMenu.items.length})`, danger: true, action: () => confirmDelete(contextMenu.items!) },
                            {
                                label: "Pin/Unpin", action: () => {
                                    contextMenu.items?.forEach(p => onTogglePin(p));
                                }
                            }
                        ] : [])
                    ]}
                />
            )}

            {plusMenu && (
                <ContextMenu
                    x={plusMenu.x}
                    y={plusMenu.y}
                    onClose={() => setPlusMenu(null)}
                    items={[
                        { label: "New TXT", action: () => onCreateNoteWithExtension?.("txt") ?? onCreateNote() },
                        { label: "New MD", action: () => onCreateNoteWithExtension?.("md") ?? onCreateNoteWithName?.("New Note.md") },
                        { label: "separator", action: () => { }, separator: true },
                        { label: "Custom...", action: () => setNewFileModal(true) }
                    ]}
                />
            )}

            {!isCollapsed && (
                <div className="sidebar-search" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                        type="text"
                        placeholder="Filter..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <button
                        onClick={openPlusMenu}
                        title="New Note"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Plus size={16} color="var(--text-color)" />
                    </button>
                    <button onClick={onAdvancedSearch} title="Advanced Search (In Files)" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Search size={16} color="var(--text-color)" />
                    </button>
                    <button onClick={toggleSort} title="Toggle Sort" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ArrowUpDown size={16} color="var(--text-color)" />
                    </button>
                </div>
            )}

            {!isCollapsed && (
                <div className="sidebar-header" style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 'bold', color: '#888', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{sortBy === 'modified' ? 'Recent' : 'All Notes'}</span>
                    <span>{notes.length}</span>
                </div>
            )}

            <div className="folder-tree" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: isCollapsed ? 'center' : 'stretch' }}>
                {renderList()}
            </div>
        </div>
    );
}
