import React, { useRef, useEffect, useMemo, useState } from "react";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import { convertFileSrc } from "@tauri-apps/api/core";
import { filesystem } from "../services/filesystem";
import {
    buildImageMarkdown,
    generateAltText,
    parseImageTitle,
    sanitizeAltText,
    updateImageInMarkdown,
    ImageAlign
} from "../utils/markdownImages";
import "../styles/editor.css";

interface EditorProps {
    content: string;
    onChange: (value: string) => void;
    wordWrap: boolean;
    onCursorChange?: (line: number, col: number) => void;
    fontSize?: number;
    filePath?: string;
    rootPath?: string;
}

interface ImageEditorState {
    isOpen: boolean;
    src: string;
    alt: string;
    align: ImageAlign | "";
    width: number | "";
}

interface ResizeState {
    src: string;
    img: HTMLImageElement;
    previewWidth: number;
}

interface OptimizedImage {
    blob: Blob;
    extension: string;
    suggestedWidth: number;
}

const SUPPORTED_IMAGE_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/gif",
    "image/webp",
    "image/svg+xml"
]);

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export default function Editor({ content, onChange, wordWrap, onCursorChange, fontSize = 14, filePath, rootPath }: EditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const [previewMode, setPreviewMode] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [imageEditor, setImageEditor] = useState<ImageEditorState>({
        isOpen: false,
        src: "",
        alt: "",
        align: "",
        width: ""
    });
    const [resizeState, setResizeState] = useState<ResizeState | null>(null);
    const isMarkdown = !!filePath && (filePath.toLowerCase().endsWith(".md") || filePath.toLowerCase().endsWith(".markdown"));

    const handleSelect = () => {
        if (textareaRef.current && onCursorChange) {
            const val = textareaRef.current.value;
            const selectionStart = textareaRef.current.selectionStart;
            const lines = val.substring(0, selectionStart).split("\n");
            const line = lines.length;
            const col = lines[lines.length - 1].length + 1;
            onCursorChange(line, col);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
        handleSelect();
    };

    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    useEffect(() => {
        if (!isMarkdown) {
            setPreviewMode(false);
        }
    }, [isMarkdown]);

    useEffect(() => {
        if (!resizeState) return;
        const handleMove = (e: MouseEvent) => {
            if (!resizeState.img || !resizeState.previewWidth) return;
            const delta = e.movementX;
            const currentWidth = resizeState.img.clientWidth;
            const nextWidthPx = Math.max(60, currentWidth + delta);
            const widthPercent = Math.min(100, Math.max(20, Math.round((nextWidthPx / resizeState.previewWidth) * 100)));
            resizeState.img.style.width = `${widthPercent}%`;
            resizeState.img.dataset.width = `${widthPercent}`;
        };
        const handleUp = () => {
            const widthValue = resizeState.img.dataset.width ? parseInt(resizeState.img.dataset.width, 10) : undefined;
            if (resizeState.src && widthValue) {
                const updated = updateImageInMarkdown(content, resizeState.src, (image) => ({
                    ...image,
                    meta: { ...image.meta, width: widthValue }
                }));
                if (updated.updated) {
                    onChange(updated.content);
                }
            }
            setResizeState(null);
        };
        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleUp);
        return () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleUp);
        };
    }, [resizeState, content, onChange]);

    const baseDir = useMemo(() => {
        if (!filePath) return "";
        const index = filePath.lastIndexOf("\\");
        if (index === -1) return "";
        return filePath.slice(0, index);
    }, [filePath]);

    const markdownParser = useMemo(() => {
        if (!isMarkdown) return null;
        let parser: MarkdownIt;
        const highlight = (str: string, lang: string) => {
            if (lang && hljs.getLanguage(lang)) {
                return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
            }
            return `<pre class="hljs"><code>${parser.utils.escapeHtml(str)}</code></pre>`;
        };
        parser = new MarkdownIt({
            html: false,
            linkify: true,
            breaks: true,
            highlight
        });

        const resolveImageSrc = (src: string) => {
            if (!src) return src;
            const match = src.match(/^([^?#]+)(.*)$/);
            const pathPart = match?.[1] ?? src;
            const suffix = match?.[2] ?? "";
            if (/^(https?:|data:|blob:|tauri:)/i.test(pathPart)) {
                return src;
            }
            const normalized = pathPart.replace(/\//g, "\\");
            const isAbsolute = /^[a-zA-Z]:\\/.test(normalized) || normalized.startsWith("\\\\");
            if (isAbsolute) {
                return `${convertFileSrc(normalized)}${suffix}`;
            }
            if (baseDir) {
                return `${convertFileSrc(`${baseDir}\\${normalized}`)}${suffix}`;
            }
            return src;
        };

        parser.renderer.rules.image = (tokens, idx) => {
            const token = tokens[idx];
            const src = token.attrGet("src") || "";
            const alt = token.content || "";
            const title = token.attrGet("title");
            const resolvedSrc = resolveImageSrc(src);
            const meta = parseImageTitle(title);
            const widthAttr = meta.width ? ` width: ${meta.width}%;` : "";
            const align = meta.align || "center";
            const alignStyle = align === "left" ? "left" : align === "right" ? "right" : "center";
            const wrapperStyle = `text-align: ${alignStyle};`;
            const imgStyle = `max-height: 18em; max-width: 100%; height: auto;${widthAttr}`;
            const titleAttr = title ? ` title="${parser.utils.escapeHtml(title)}"` : "";
            const widthData = meta.width ? ` data-width="${meta.width}"` : "";
            const alignData = meta.align ? ` data-align="${meta.align}"` : "";
            return `<span class="md-image-wrapper" style="${wrapperStyle}" data-src="${parser.utils.escapeHtml(src)}"><img src="${resolvedSrc}" alt="${parser.utils.escapeHtml(alt)}"${titleAttr} data-src="${parser.utils.escapeHtml(src)}"${widthData}${alignData} style="${imgStyle}" /><span class="md-resize-handle" data-src="${parser.utils.escapeHtml(src)}"></span></span>`;
        };

        return parser;
    }, [isMarkdown, baseDir]);

    const renderedMarkdown = useMemo(() => {
        if (!markdownParser) return "";
        return markdownParser.render(content);
    }, [markdownParser, content]);

    const insertAtCursor = (text: string) => {
        if (!textareaRef.current) return;
        const el = textareaRef.current;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const nextValue = content.slice(0, start) + text + content.slice(end);
        onChange(nextValue);
        setTimeout(() => {
            el.focus();
            const pos = start + text.length;
            el.setSelectionRange(pos, pos);
            handleSelect();
        }, 0);
    };

    const suggestImageWidth = (img: HTMLImageElement | null) => {
        if (!img || !img.width || !img.height) return 70;
        const ratio = img.width / img.height;
        if (ratio < 0.75) return 50;
        if (ratio < 1) return 60;
        if (ratio < 1.4) return 70;
        return 80;
    };

    const readFileAsImage = (file: File) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error("Failed to load image"));
            };
            img.src = url;
        });

    const optimizeImageFile = async (file: File): Promise<OptimizedImage> => {
        let img: HTMLImageElement | null = null;
        try {
            img = await readFileAsImage(file);
        } catch {
            img = null;
        }
        const suggestedWidth = suggestImageWidth(img);
        if (file.type === "image/gif" || file.type === "image/svg+xml" || !img) {
            const extension = file.type === "image/svg+xml" ? "svg" : file.type === "image/gif" ? "gif" : file.name.split(".").pop() || "png";
            return { blob: file, extension, suggestedWidth };
        }
        const maxDimension = 1600;
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return { blob: file, extension: file.name.split(".").pop() || "png", suggestedWidth };
        }
        ctx.drawImage(img, 0, 0, width, height);
        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/webp", 0.82)
        );
        if (!blob) {
            return { blob: file, extension: file.name.split(".").pop() || "png", suggestedWidth };
        }
        return { blob, extension: "webp", suggestedWidth };
    };

    const saveImageAsset = async (blob: Blob, extension: string) => {
        if (!rootPath) throw new Error("Missing root path");
        const assetsDir = `${rootPath}\\assets`;
        await filesystem.createFolder(assetsDir);
        const fileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
        const fullPath = `${assetsDir}\\${fileName}`;
        const buffer = new Uint8Array(await blob.arrayBuffer());
        await filesystem.writeBinary(fullPath, buffer);
        return `assets/${fileName}`;
    };

    const insertImages = async (files: File[]) => {
        if (!files.length) return;
        const markdownEntries: string[] = [];
        for (const file of files) {
            if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
                setErrorMessage("Unsupported image format.");
                continue;
            }
            if (file.size > MAX_IMAGE_BYTES) {
                setErrorMessage("Image is too large to embed.");
                continue;
            }
            try {
                const optimized = await optimizeImageFile(file);
                const src = await saveImageAsset(optimized.blob, optimized.extension);
                const alt = generateAltText(file.name);
                markdownEntries.push(buildImageMarkdown(alt, src, { width: optimized.suggestedWidth }));
            } catch {
                setErrorMessage("Failed to embed image.");
            }
        }
        if (markdownEntries.length) {
            const insertText = markdownEntries.join("\n");
            insertAtCursor(insertText);
        }
    };

    const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        if (!isMarkdown || previewMode) return;
        const items = Array.from(e.clipboardData.items).filter(item => item.kind === "file");
        const files = items.map(item => item.getAsFile()).filter(Boolean) as File[];
        if (!files.length) return;
        e.preventDefault();
        await insertImages(files);
    };

    const handleDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
        if (!isMarkdown || previewMode) return;
        const files = Array.from(e.dataTransfer.files || []);
        if (!files.length) return;
        e.preventDefault();
        await insertImages(files);
    };

    const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
        if (!isMarkdown || previewMode) return;
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
            e.preventDefault();
        }
    };

    const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains("md-resize-handle")) return;
        const img = target.tagName === "IMG" ? (target as HTMLImageElement) : target.querySelector("img");
        if (!img) return;
        const src = img.dataset.src || "";
        if (!src) return;
        const alt = img.getAttribute("alt") || "";
        const width = img.dataset.width ? parseInt(img.dataset.width, 10) : "";
        const align = (img.dataset.align as ImageAlign) || "";
        setImageEditor({ isOpen: true, src, alt, width, align });
    };

    const handlePreviewMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (!target.classList.contains("md-resize-handle")) return;
        e.preventDefault();
        const src = target.dataset.src || "";
        const wrapper = target.closest(".md-image-wrapper");
        const img = wrapper?.querySelector("img") as HTMLImageElement | null;
        const previewWidth = previewRef.current?.clientWidth || 0;
        if (!img || !src || !previewWidth) return;
        setResizeState({ src, img, previewWidth });
    };

    const applyImageEdits = () => {
        if (!imageEditor.src) {
            setImageEditor({ isOpen: false, src: "", alt: "", align: "", width: "" });
            return;
        }
        const updated = updateImageInMarkdown(content, imageEditor.src, (image) => ({
            ...image,
            alt: sanitizeAltText(imageEditor.alt) || image.alt,
            meta: {
                width: imageEditor.width ? Number(imageEditor.width) : image.meta.width,
                align: imageEditor.align || image.meta.align
            }
        }));
        if (updated.updated) {
            onChange(updated.content);
        }
        setImageEditor({ isOpen: false, src: "", alt: "", align: "", width: "" });
    };

    return (
        <div className="editor-container">
            {isMarkdown && (
                <div className="editor-toolbar">
                    <button
                        className={`editor-toggle ${!previewMode ? "active" : ""}`}
                        onClick={() => setPreviewMode(false)}
                    >
                        Edit
                    </button>
                    <button
                        className={`editor-toggle ${previewMode ? "active" : ""}`}
                        onClick={() => setPreviewMode(true)}
                    >
                        Preview
                    </button>
                </div>
            )}
            {isMarkdown && previewMode ? (
                <div
                    className="markdown-preview"
                    style={{ fontSize: `${fontSize}px` }}
                    dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
                    ref={previewRef}
                    onClick={handlePreviewClick}
                    onMouseDown={handlePreviewMouseDown}
                />
            ) : (
                <textarea
                    ref={textareaRef}
                    className={`editor-textarea ${wordWrap ? "wrap" : "no-wrap"}`}
                    value={content}
                    onChange={handleChange}
                    onSelect={handleSelect}
                    onKeyUp={handleSelect}
                    onClick={handleSelect}
                    onPaste={handlePaste}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    spellCheck={false}
                    style={{ fontSize: `${fontSize}px` }}
                />
            )}
            {errorMessage && (
                <div className="editor-error">
                    <span>{errorMessage}</span>
                    <button onClick={() => setErrorMessage(null)}>Dismiss</button>
                </div>
            )}
            {imageEditor.isOpen && (
                <div className="image-editor-overlay">
                    <div className="image-editor">
                        <div className="image-editor-header">Edit Image</div>
                        <label className="image-editor-label">Alt Text</label>
                        <input
                            className="image-editor-input"
                            value={imageEditor.alt}
                            onChange={(e) => setImageEditor({ ...imageEditor, alt: e.target.value })}
                        />
                        <label className="image-editor-label">Alignment</label>
                        <select
                            className="image-editor-input"
                            value={imageEditor.align}
                            onChange={(e) => setImageEditor({ ...imageEditor, align: e.target.value as ImageAlign })}
                        >
                            <option value="">Auto</option>
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                        </select>
                        <label className="image-editor-label">Width (%)</label>
                        <input
                            className="image-editor-input"
                            type="number"
                            min="20"
                            max="100"
                            value={imageEditor.width}
                            onChange={(e) => setImageEditor({ ...imageEditor, width: e.target.value === "" ? "" : Number(e.target.value) })}
                        />
                        <div className="image-editor-actions">
                            <button onClick={() => setImageEditor({ isOpen: false, src: "", alt: "", align: "", width: "" })}>Cancel</button>
                            <button onClick={applyImageEdits}>Apply</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
