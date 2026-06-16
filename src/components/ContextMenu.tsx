import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "../styles/contextmenu.css";

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    items: { label: string; action: () => void; danger?: boolean; separator?: boolean }[];
}

const EDGE_PADDING = 4;

export default function ContextMenu({ x, y, onClose, items }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: y, left: x });

    useLayoutEffect(() => {
        const el = menuRef.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        let newTop = y;
        let newLeft = x;

        if (rect.height > 0 && y + rect.height > viewportHeight - EDGE_PADDING) {
            newTop = y - rect.height;
            if (newTop < EDGE_PADDING) {
                newTop = Math.max(EDGE_PADDING, viewportHeight - rect.height - EDGE_PADDING);
            }
        }

        if (rect.width > 0 && x + rect.width > viewportWidth - EDGE_PADDING) {
            newLeft = viewportWidth - rect.width - EDGE_PADDING;
            if (newLeft < EDGE_PADDING) {
                newLeft = EDGE_PADDING;
            }
        }

        if (newTop !== y || newLeft !== x) {
            setPosition({ top: newTop, left: newLeft });
        }
    }, [x, y]);

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
            style={{ top: position.top, left: position.left }}
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
