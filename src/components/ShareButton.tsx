/**
 * ShareButton.tsx
 *
 * Compact inline button shown in the editor status bar for authenticated users.
 * Manages public link sharing for the currently active cloud note.
 *
 * Behaviour:
 *  - Shows "Share" if the note is not yet public.
 *  - Shows "Shared — Copy Link" + "Stop Sharing" if it is public.
 *  - Fires enable/disable sharing calls to the Rust backend API.
 *  - On enable: displays a toast with the share URL and copies it to clipboard.
 *  - On disable: clears the share state.
 */

import { useState } from "react";
import { enableSharing, disableSharing, CloudNote } from "../services/cloudApi";

interface ShareButtonProps {
  cloudNote: CloudNote | null;
  onNoteUpdate: (updated: CloudNote) => void;
}

export default function ShareButton({ cloudNote, onNoteUpdate }: ShareButtonProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  if (!cloudNote) return null;

  const isPublic = cloudNote.is_public && !!cloudNote.share_url;

  const handleEnableSharing = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await enableSharing(cloudNote.id);
      const updated: CloudNote = {
        ...cloudNote,
        is_public: true,
        share_token: result.share_token,
        share_url: result.share_url,
      };
      onNoteUpdate(updated);
      // Auto-copy to clipboard
      await navigator.clipboard.writeText(result.share_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to enable sharing.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisableSharing = async () => {
    setLoading(true);
    setError("");
    try {
      await disableSharing(cloudNote.id);
      const updated: CloudNote = {
        ...cloudNote,
        is_public: false,
        share_token: null,
        share_url: null,
      };
      onNoteUpdate(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to disable sharing.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!cloudNote.share_url) return;
    await navigator.clipboard.writeText(cloudNote.share_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const btnBase: React.CSSProperties = {
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 11,
    cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.6 : 1,
    border: "1px solid var(--border-color)",
    background: "transparent",
    color: "var(--text-color)",
    transition: "background 0.15s",
  };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginLeft: 8 }}>
      {error && (
        <span style={{ color: "#ef4444", fontSize: 10 }}>{error}</span>
      )}

      {!isPublic ? (
        <button
          onClick={handleEnableSharing}
          disabled={loading}
          title="Publish a read-only public link for this note"
          style={{ ...btnBase }}
        >
          {loading ? "…" : "🔗 Share"}
        </button>
      ) : (
        <>
          <button
            onClick={handleCopyLink}
            disabled={loading}
            title={cloudNote.share_url ?? ""}
            style={{
              ...btnBase,
              background: copied
                ? "rgba(34,197,94,0.15)"
                : "rgba(37,99,235,0.12)",
              borderColor: copied ? "rgba(34,197,94,0.4)" : "rgba(37,99,235,0.3)",
              color: copied ? "#22c55e" : "#60a5fa",
            }}
          >
            {copied ? "✓ Copied!" : "🔗 Copy Link"}
          </button>
          <button
            onClick={handleDisableSharing}
            disabled={loading}
            title="Revoke public access to this note"
            style={{
              ...btnBase,
              background: "rgba(239,68,68,0.08)",
              borderColor: "rgba(239,68,68,0.25)",
              color: "#f87171",
            }}
          >
            {loading ? "…" : "Unshare"}
          </button>
        </>
      )}
    </span>
  );
}
