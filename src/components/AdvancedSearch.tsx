import { useEffect, useRef, useState } from "react";
import { filesystem, SearchResult } from "../services/filesystem";
import { Note } from "../types/note";
import "../styles/advancedsearch.css";

interface AdvancedSearchProps {
    isOpen: boolean;
    onClose: () => void;
    rootPath: string;
    onOpenNote: (note: Note) => void;
}

export default function AdvancedSearch({ isOpen, onClose, rootPath, onOpenNote }: AdvancedSearchProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const requestIdRef = useRef(0);

    useEffect(() => {
        if (!isOpen) {
            setQuery("");
            setResults([]);
            setError(null);
            setIsSearching(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const trimmed = query.trim();
        if (!trimmed) {
            setResults([]);
            setError(null);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        setError(null);
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;

        const timeoutId = window.setTimeout(async () => {
            try {
                const res = await filesystem.searchNotes(rootPath, trimmed);
                if (requestIdRef.current !== requestId) return;
                setResults(res);
            } catch (e) {
                if (requestIdRef.current !== requestId) return;
                setResults([]);
                setError("Search failed. Please try again.");
                console.error("Advanced search failed", e);
            } finally {
                if (requestIdRef.current === requestId) {
                    setIsSearching(false);
                }
            }
        }, 200);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [query, rootPath, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="advanced-search-overlay">
            <div className="advanced-search-modal">
                <div className="advanced-search-header">
                    <h3>Search Files</h3>
                    <button onClick={onClose}>&times;</button>
                </div>
                <div className="advanced-search-input">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search for text in files..."
                        autoFocus
                    />
                </div>
                <div className="advanced-search-results">
                    {isSearching && (
                        <div className="search-status">Searching...</div>
                    )}
                    {error && (
                        <div className="search-error">{error}</div>
                    )}
                    {results.map((res, i) => (
                        <div key={i} className="search-result-item" onClick={() => {
                            onOpenNote(res.file);
                            onClose();
                        }}>
                            <div className="result-path">{res.file.name}</div>
                            {res.match_type === 'content' && (
                                <div className="result-snippet">...{res.snippet}...</div>
                            )}
                        </div>
                    ))}
                    {results.length === 0 && !isSearching && query && (
                        <div className="no-results">No results found</div>
                    )}
                </div>
            </div>
        </div>
    );
}
