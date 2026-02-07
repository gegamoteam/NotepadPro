import { useEffect, useRef } from "react";
import "../styles/contextmenu.css";

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    items: { label: string; action: () => void; danger?: boolean; separator?: boolean }[];
}

export default function ContextMenu({ x, y, onClose, items }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    return (
        <div
            className="context-menu"
            style={{ top: y, left: x }}
            ref={menuRef}
        >
            {items.map((item, index) => (
                item.separator ? (
                    <div key={index} className="context-menu-separator"></div>
                ) : (
                    <div
                        key={index}
                        className={`context-menu-item ${item.danger ? "danger" : ""}`}
                        onClick={() => {
                            item.action();
                            onClose();
                        }}
                    >
                        {item.label}
                    </div>
                )
            ))}
        </div>
    );
}
