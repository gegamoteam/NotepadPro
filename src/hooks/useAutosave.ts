import { useEffect, useRef } from "react";

export function useAutosave(callback: () => void, delay: number, dependency: any) {
    const savedCallback = useRef(callback);

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        if (!dependency) return; // Don't autosave if no change (dependency is usually isDirty)

        const tick = () => {
            savedCallback.current();
        };

        const id = setInterval(tick, delay);
        return () => clearInterval(id);
    }, [delay, dependency]);
}
