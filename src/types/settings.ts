export interface WindowState {
    width: number;
    height: number;
    x: number;
    y: number;
}

export interface Settings {
    lastOpenedNote?: string;
    window: WindowState;
    wordWrap: boolean;
    // Pinned items are stored separately in pinned.json based on spec, 
    // but convenient to have in runtime state. 
    // However, spec says "pinned.json" structure: { "pinned": [] }.
}
