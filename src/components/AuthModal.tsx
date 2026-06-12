/**
 * AuthModal.tsx
 *
 * Login / logout modal for the NoteX desktop app.
 * Shown when the user clicks the "Sign in to Cloud" button.
 *
 * On successful sign-in the token is saved to the secure store via
 * authService.signIn() → Tauri command store_secure_value().
 *
 * Design: clean, minimal, dark-mode-aware — matches the existing NoteX UI.
 */

import { useState } from "react";
import { signIn, signOut, AuthUser } from "../services/authService";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await signIn(email, password);
      onAuthChange(user);
      setEmail("");
      setPassword("");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
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
            /* ── Sign-in form ── */
            <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary, #888)" }}>
                Sign in with your NoteX account to sync and share notes from any device.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, color: "var(--text-secondary)" }}>Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={loading}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--border-color)",
                    background: "var(--editor-bg)",
                    color: "var(--text-color)",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, color: "var(--text-secondary)" }}>Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--border-color)",
                    background: "var(--editor-bg)",
                    color: "var(--text-color)",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

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
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 2,
                  padding: "9px 0",
                  background: "var(--accent, #2563eb)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
