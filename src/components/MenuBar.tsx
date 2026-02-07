import { useState, useEffect, useRef } from "react";
import "../styles/menubar.css";

interface MenuBarProps {
    onNew: () => void;
    onNewWindow: () => void;
    onOpen: () => void;
    onSave: () => void;
    onSaveAs: () => void;
    onPrint: () => void;
    onExit: () => void;

    onUndo: () => void;
    onCut: () => void;
    onCopy: () => void;
    onPaste: () => void;
    onDelete: () => void;
    onFind: () => void;
    onFindInFiles: () => void; // New
    onReplace: () => void;
    onSelectAll: () => void;

    onTimeDate: () => void;

    wordWrap: boolean;
    onToggleWordWrap: () => void;
    onFont: () => void;

    showStatusBar: boolean;
    onToggleStatusBar: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onRestoreZoom: () => void;
    onSettings: () => void; // New
}

export default function MenuBar(props: MenuBarProps) {
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMenuClick = (menu: string) => {
        setActiveMenu(activeMenu === menu ? null : menu);
    };

    const handleAction = (action: () => void) => {
        action();
        setActiveMenu(null);
    };

    return (
        <div className="menubar" ref={menuRef}>
            <div className={`menu-item ${activeMenu === "file" ? "active" : ""}`}>
                <div className="menu-label" onClick={() => handleMenuClick("file")}>File</div>
                {activeMenu === "file" && (
                    <div className="dropdown">
                        <div className="dropdown-item" onClick={() => handleAction(props.onNew)}>
                            <span>New</span><span className="shortcut">Ctrl+N</span>
                        </div>
                        <div className="dropdown-item" onClick={() => handleAction(props.onNewWindow)}>
                            <span>New Window</span><span className="shortcut">Ctrl+Shift+N</span>
                        </div>
                        <div className="dropdown-item" onClick={() => handleAction(props.onOpen)}>
                            <span>Open...</span><span className="shortcut">Ctrl+O</span>
                        </div>
                        <div className="dropdown-item" onClick={() => handleAction(props.onSave)}>
                            <span>Save</span><span className="shortcut">Ctrl+S</span>
                        </div>
                        <div className="dropdown-item" onClick={() => handleAction(props.onSaveAs)}>
                            <span>Save As...</span><span className="shortcut">Ctrl+Shift+S</span>
                        </div>
                        <div className="separator"></div>
                        <div className="dropdown-item disabled">
                            <span>Page Setup...</span>
                        </div>
                        <div className="dropdown-item" onClick={() => handleAction(props.onPrint)}>
                            <span>Print...</span><span className="shortcut">Ctrl+P</span>
                        </div>
                        <div className="separator"></div>
                        <div className="dropdown-item" onClick={() => handleAction(props.onExit)}>
                            <span>Exit</span>
                        </div>
                    </div>
                )}
            </div>

            <div className={`menu-item ${activeMenu === "edit" ? "active" : ""}`}>
                <div className="menu-label" onClick={() => handleMenuClick("edit")}>Edit</div>
                {activeMenu === "edit" && (
                    <div className="dropdown">
                        <div className="dropdown-item" onClick={() => handleAction(props.onUndo)}>
                            <span>Undo</span><span className="shortcut">Ctrl+Z</span>
                        </div>
                        <div className="separator"></div>
                        <div className="dropdown-item" onClick={() => handleAction(props.onCut)}>
                            <span>Cut</span><span className="shortcut">Ctrl+X</span>
                        </div>
                        <div className="dropdown-item" onClick={() => handleAction(props.onCopy)}>
                            <span>Copy</span><span className="shortcut">Ctrl+C</span>
                        </div>
                        <div className="dropdown-item" onClick={() => handleAction(props.onPaste)}>
                            <span>Paste</span><span className="shortcut">Ctrl+V</span>
                        </div>
                        <div className="dropdown-item" onClick={() => handleAction(props.onDelete)}>
                            <span>Delete</span><span className="shortcut">Del</span>
                        </div>
                        <div className="separator"></div>
                        <div className="dropdown-item disabled">
                            <span>Search with Bing...</span><span className="shortcut">Ctrl+E</span>
                        </div>
                        <div className="dropdown-item" onClick={() => handleAction(props.onFind)}>
                            <span>Find...</span><span className="shortcut">Ctrl+F</span>
                        </div>
                        <div className="dropdown-item" onClick={() => handleAction(props.onFindInFiles)}>
                            <span>Find in Files...</span><span className="shortcut">Ctrl+Shift+F</span>
                        </div>
                        <div className="dropdown-item disabled">
                            <span>Find Next</span><span className="shortcut">F3</span>
                        </div>
                        <div className="dropdown-item disabled">
                            <span>Find Previous</span><span className="shortcut">Shift+F3</span>
                        </div>
                        <div className="dropdown-item" onClick={() => handleAction(props.onReplace)}>
                            <span>Replace...</span><span className="shortcut">Ctrl+H</span>
                        </div>
                        <div className="dropdown-item disabled">
                            <span>Go To...</span><span className="shortcut">Ctrl+G</span>
                        </div>
                        <div className="separator"></div>
                        <div className="dropdown-item" onClick={() => handleAction(props.onSelectAll)}>
                            <span>Select All</span><span className="shortcut">Ctrl+A</span>
                        </div>
                        <div className="dropdown-item" onClick={() => handleAction(props.onTimeDate)}>
                            <span>Time/Date</span><span className="shortcut">F5</span>
                        </div>
                    </div>
                )}
            </div>

            <div className={`menu-item ${activeMenu === "format" ? "active" : ""}`}>
                <div className="menu-label" onClick={() => handleMenuClick("format")}>Format</div>
                {activeMenu === "format" && (
                    <div className="dropdown">
                        <div className="dropdown-item" onClick={() => handleAction(props.onToggleWordWrap)}>
                            <span className="check-placeholder">{props.wordWrap ? "✓" : ""}</span>
                            <span>Word Wrap</span>
                        </div>
                        <div className="dropdown-item" onClick={() => handleAction(props.onFont)}>
                            <span className="check-placeholder"></span>
                            <span>Font...</span>
                        </div>
                    </div>
                )}
            </div>

            <div className={`menu-item ${activeMenu === "view" ? "active" : ""}`}>
                <div className="menu-label" onClick={() => handleMenuClick("view")}>View</div>
                {activeMenu === "view" && (
                    <div className="dropdown">
                        <div className="dropdown-item has-submenu">
                            <span>Zoom</span>
                            <div className="submenu">
                                <div className="dropdown-item" onClick={() => handleAction(props.onZoomIn)}>
                                    <span>Zoom In</span><span className="shortcut">Ctrl+Plus</span>
                                </div>
                                <div className="dropdown-item" onClick={() => handleAction(props.onZoomOut)}>
                                    <span>Zoom Out</span><span className="shortcut">Ctrl+Minus</span>
                                </div>
                                <div className="dropdown-item" onClick={() => handleAction(props.onRestoreZoom)}>
                                    <span>Restore Default Zoom</span><span className="shortcut">Ctrl+0</span>
                                </div>
                            </div>
                        </div>
                        <div className="dropdown-item" onClick={() => handleAction(props.onToggleStatusBar)}>
                            <span className="check-placeholder">{props.showStatusBar ? "✓" : ""}</span>
                            <span>Status Bar</span>
                        </div>
                    </div>
                )}
            </div>

            <div className={`menu-item ${activeMenu === "help" ? "active" : ""}`}>
                <div className="menu-label" onClick={() => handleMenuClick("help")}>Help</div>
                {activeMenu === "help" && (
                    <div className="dropdown">
                        <div className="dropdown-item">
                            <span>View Help</span>
                        </div>
                        <div className="dropdown-item">
                            <span>Send Feedback</span>
                        </div>
                        <div className="separator"></div>
                        <div className="dropdown-item">
                            <span>About NoteX</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="menu-item" onClick={props.onSettings}>
                <div className="menu-label">Settings</div>
            </div>
        </div>
    );
}
