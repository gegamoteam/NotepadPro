import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, Globe2, Link2, Loader2, Lock, Share2 } from "lucide-react";
import { enableSharing, disableSharing, CloudNote } from "../services/cloudApi";

interface ShareButtonProps {
  cloudNote: CloudNote | null;
  canShare: boolean;
  onNoteUpdate: (updated: CloudNote) => void;
}

export default function ShareButton({ cloudNote, canShare, onNoteUpdate }: ShareButtonProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const isPublic = cloudNote?.is_public && !!cloudNote?.share_url;
  const disabledReason = !canShare
    ? "Open a .md or .txt note to share"
    : !cloudNote
      ? "Syncing note before sharing..."
      : "";
  const statusText = isPublic ? "Public" : "Private";
  const StatusIcon = isPublic ? Globe2 : Lock;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showError = (message: string) => {
    setError(message);
    window.setTimeout(() => setError(""), 3000);
  };

  const handleEnableSharing = async () => {
    if (!canShare || !cloudNote) {
      showError(disabledReason || "Please wait, note is syncing to cloud...");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await enableSharing(cloudNote.id);
      onNoteUpdate({
        ...cloudNote,
        is_public: true,
        share_token: result.share_token,
        share_url: result.share_url,
      });
      await navigator.clipboard.writeText(result.share_url);
      setCopied(true);
      setOpen(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Failed to enable sharing.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisableSharing = async () => {
    if (!cloudNote) return;

    setLoading(true);
    setError("");
    try {
      await disableSharing(cloudNote.id);
      onNoteUpdate({
        ...cloudNote,
        is_public: false,
        share_token: null,
        share_url: null,
      });
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Failed to disable sharing.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!cloudNote?.share_url) return;

    await navigator.clipboard.writeText(cloudNote.share_url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="share-control" ref={menuRef}>
      {error && <span className="share-error">{error}</span>}
      <button
        type="button"
        className={`share-trigger ${isPublic ? "is-public" : ""}`}
        disabled={loading || !canShare}
        title={disabledReason || (isPublic ? cloudNote?.share_url ?? "Public note" : "Share this note")}
        onClick={() => {
          if (!cloudNote) {
            handleEnableSharing();
            return;
          }
          setOpen((value) => !value);
        }}
      >
        {loading ? <Loader2 className="share-icon spin" /> : <Share2 className="share-icon" />}
        <span>Share</span>
        <span className="share-pill">
          <StatusIcon className="share-pill-icon" />
          {statusText}
        </span>
        <ChevronDown className="share-icon" />
      </button>

      {open && cloudNote && (
        <div className="share-menu" role="menu">
          <div className="share-menu-header">
            <span>Visibility</span>
            <strong>{statusText}</strong>
          </div>

          <button
            type="button"
            className="share-menu-item"
            disabled={loading || isPublic}
            onClick={handleEnableSharing}
          >
            <Globe2 className="share-menu-icon" />
            <span>Public</span>
            {isPublic && <Check className="share-menu-check" />}
          </button>

          <button
            type="button"
            className="share-menu-item"
            disabled={loading || !isPublic}
            onClick={handleDisableSharing}
          >
            <Lock className="share-menu-icon" />
            <span>Private</span>
            {!isPublic && <Check className="share-menu-check" />}
          </button>

          <div className="share-menu-separator" />

          <button
            type="button"
            className="share-menu-item"
            disabled={!isPublic || loading}
            onClick={handleCopyLink}
          >
            {copied ? <Check className="share-menu-icon" /> : <Copy className="share-menu-icon" />}
            <span>{copied ? "Copied link" : "Copy link"}</span>
          </button>

          {cloudNote.share_url && (
            <div className="share-url" title={cloudNote.share_url}>
              <Link2 className="share-url-icon" />
              <span>{cloudNote.share_url}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
