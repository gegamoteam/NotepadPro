export type ImageAlign = "left" | "center" | "right";

export interface ImageMeta {
    width?: number;
    align?: ImageAlign;
}

export interface MarkdownImage {
    alt: string;
    src: string;
    meta: ImageMeta;
}

export const parseImageTitle = (title?: string | null): ImageMeta => {
    if (!title) return {};
    const meta: ImageMeta = {};
    const parts = title.split(/\s+/).filter(Boolean);
    for (const part of parts) {
        const [key, value] = part.split("=");
        if (key === "width") {
            const parsed = parseInt(value || "", 10);
            if (!Number.isNaN(parsed) && parsed > 0) meta.width = parsed;
        }
        if (key === "align" && (value === "left" || value === "center" || value === "right")) {
            meta.align = value;
        }
    }
    return meta;
};

export const stringifyImageTitle = (meta: ImageMeta): string | null => {
    const parts: string[] = [];
    if (meta.width) parts.push(`width=${meta.width}`);
    if (meta.align) parts.push(`align=${meta.align}`);
    if (!parts.length) return null;
    return parts.join(" ");
};

export const buildImageMarkdown = (alt: string, src: string, meta: ImageMeta = {}): string => {
    const title = stringifyImageTitle(meta);
    if (title) {
        return `![${alt}](${src} "${title}")`;
    }
    return `![${alt}](${src})`;
};

export const updateImageInMarkdown = (
    content: string,
    src: string,
    update: (image: MarkdownImage) => MarkdownImage
): { content: string; updated: boolean } => {
    let updated = false;
    const regex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;
    const nextContent = content.replace(regex, (match, alt, foundSrc, title) => {
        if (updated) return match;
        if (foundSrc !== src) return match;
        const meta = parseImageTitle(title);
        const next = update({ alt, src: foundSrc, meta });
        updated = true;
        return buildImageMarkdown(next.alt, next.src, next.meta);
    });
    return { content: nextContent, updated };
};

export const sanitizeAltText = (text: string) => text.replace(/\s+/g, " ").trim();

export const generateAltText = (filename?: string) => {
    if (!filename) return "Pasted image";
    const withoutExt = filename.replace(/\.[^/.]+$/, "");
    const cleaned = withoutExt.replace(/[-_]+/g, " ").trim();
    return cleaned || "Image";
};
