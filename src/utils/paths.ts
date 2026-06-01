export const getSeparator = (path: string): string => {
    return path.includes('/') ? '/' : '\\';
};

export const joinPath = (parent: string, child: string): string => {
    const sep = parent.includes('/') ? '/' : '\\';
    const p = parent.replace(/[/\\]/g, sep);
    const c = child.replace(/[/\\]/g, sep);
    const pTrim = p.endsWith(sep) ? p.slice(0, -1) : p;
    const cTrim = c.startsWith(sep) ? c.slice(1) : c;
    return `${pTrim}${sep}${cTrim}`;
};

export const getParentPath = (path: string): string => {
    const sep = getSeparator(path);
    const lastIndex = path.lastIndexOf(sep);
    return lastIndex !== -1 ? path.substring(0, lastIndex) : "";
};

export const getFilename = (path: string): string => {
    return path.split(/[/\\]/).pop() || path;
};
