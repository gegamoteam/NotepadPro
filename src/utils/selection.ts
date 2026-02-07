export function handleSelection(
    e: React.MouseEvent,
    itemPath: string,
    currentSelection: string[],
    allVisiblePaths: string[], // Needed for Shift+Select range
    lastSelectedPath: string | null
): { newSelection: string[], newLastSelected: string } {
    let newSelection = [...currentSelection];

    if (e.ctrlKey || e.metaKey) {
        // Toggle
        if (newSelection.includes(itemPath)) {
            newSelection = newSelection.filter(p => p !== itemPath);
        } else {
            newSelection.push(itemPath);
        }
        return { newSelection, newLastSelected: itemPath };
    }

    if (e.shiftKey && lastSelectedPath && allVisiblePaths.includes(lastSelectedPath)) {
        // Range
        const startIdx = allVisiblePaths.indexOf(lastSelectedPath);
        const endIdx = allVisiblePaths.indexOf(itemPath);

        if (startIdx !== -1 && endIdx !== -1) {
            const min = Math.min(startIdx, endIdx);
            const max = Math.max(startIdx, endIdx);
            const range = allVisiblePaths.slice(min, max + 1);

            // Add range to current selection (or replace? Standard is replace usually, but Ctrl+Shift adds)
            // Let's go with standard Shift behavior: Extend selection from anchor.
            // Usually Shift+Click clears previous selection except anchor? 
            // Simple version: clear and select range.
            newSelection = range;
            return { newSelection, newLastSelected: lastSelectedPath }; // Anchor stays same?
        }
    }

    // Normal Click
    return { newSelection: [itemPath], newLastSelected: itemPath };
}
