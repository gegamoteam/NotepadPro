import { useState } from "react";
import { filesystem, SearchResult } from "../services/filesystem";
import "../styles/advancedsearch.css";

interface AdvancedSearchProps {
    isOpen: boolean;
    onClose: () => void;
    rootPath: string;
    onOpenNote: (note: any) => void;
}

export default function AdvancedSearch({ isOpen, onClose, rootPath, onOpenNote }: AdvancedSearchProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setIsSearching(true);
        try {
            const res = await filesystem.searchNotes(rootPath, query);
            setResults(res);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
    };

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
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Search for text in files..."
                        autoFocus
                    />
                    <button onClick={handleSearch} disabled={isSearching}>
                        {isSearching ? "Searching..." : "Search"}
                    </button>
                </div>
                <div className="advanced-search-results">
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
