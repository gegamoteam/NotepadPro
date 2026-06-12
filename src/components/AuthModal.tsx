/**
 * AuthModal.tsx
 *
 * Browser-based login / logout modal for the NoteX desktop app.
 * Shown when the user clicks the "Sign in to Cloud" button.
 */

import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { signOut, AuthUser, SITE_URL } from "../services/authService";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onAuthChange: (user: AuthUser | null) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  currentUser,
  onAuthChange,
}: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleBrowserSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      // Open the browser to the app-auth endpoint
      await openUrl(`${SITE_URL}/app-auth`);
      // Keep loading state until deep link redirect triggers login or modal is closed
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to open browser.");
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onAuthChange(null);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-container auth-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 360 }}
      >
        <div className="modal-header">
          <h2 style={{ margin: 0, fontSize: 16 }}>
            {currentUser ? "Cloud Account" : "Sign in to Cloud"}
          </h2>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-secondary)" }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: "16px 20px 20px" }}>
          {currentUser ? (
            /* ── Signed-in view ── */
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Signed in as
              </div>
              <div
                style={{
                  background: "var(--bg-secondary, rgba(255,255,255,0.06))",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600 }}>{currentUser.name}</div>
                <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 2 }}>
                  {currentUser.email}
                </div>
              </div>
              <button
                onClick={handleSignOut}
                style={{
                  marginTop: 4,
                  padding: "8px 0",
                  background: "transparent",
                  border: "1px solid var(--border-color)",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                  color: "var(--text-color)",
                }}
              >
                Sign out
              </button>
            </div>
          ) : (
            /* ── Sign-in with Browser view ── */
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary, #888)", lineHeight: "1.4" }}>
                Authenticate securely through the NoteX website to enable cloud sync and sharing.
              </p>

              {error && (
                <div
                  style={{
                    padding: "7px 10px",
                    borderRadius: 6,
                    background: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "#ef4444",
                    fontSize: 12,
                  }}
                >
                  {error}
                </div>
              )}

              <button
                onClick={handleBrowserSignIn}
                disabled={loading}
                style={{
                  padding: "9px 0",
                  background: "var(--accent, #2563eb)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  opacity: loading ? 0.8 : 1,
                }}
              >
                {loading ? "Opening Browser..." : "Sign in with NoteX Website"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
