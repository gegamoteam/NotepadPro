/**
 * cloudApi.ts
 *
 * Typed client for the NoteX Rust backend API.
 *
 * Security notes:
 *  - EVERY authenticated request passes the JWT via `Authorization: Bearer <token>`
 *  - The user_id is NEVER sent in the request body — the backend extracts it
 *    from the verified JWT so clients cannot impersonate other users.
 *  - No secrets are embedded here — the token is loaded from disk via authService.
 */

import { loadToken } from "./authService";
import { BACKEND_API_URL } from "./authService";

// ─── Types ────────────────────────────────────────────────────────────────

export interface CloudNote {
  id: string;
  title: string;
  content: string;
  is_public: boolean;
  share_token: string | null;
  share_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShareResult {
  share_token: string;
  share_url: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
  const token = await loadToken();
  if (!token) throw new Error("Not signed in");
  const clientToken = import.meta.env.VITE_CLIENT_TOKEN || "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "X-Client-Token": clientToken,
  };
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await authHeaders();
  const response = await fetch(`${BACKEND_API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });

  if (!response.ok) {
    let msg = `API error: ${response.status}`;
    try {
      const body = await response.json();
      msg = body.error || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  if (response.status === 204) return undefined as unknown as T;
  return response.json();
}

// ─── API Methods ──────────────────────────────────────────────────────────

/** Fetch all cloud notes for the current user. */
export async function listCloudNotes(): Promise<CloudNote[]> {
  return apiFetch<CloudNote[]>("/api/notes");
}

/**
 * Upsert a note in the cloud.
 *
 * Pass `id` to update an existing note (by its cloud UUID).
 * Omit `id` to create a new cloud note.
 *
 * The backend enforces ownership via JWT — you cannot update another user's note.
 */
export async function upsertCloudNote(note: {
  id?: string;
  title: string;
  content: string;
}): Promise<CloudNote> {
  return apiFetch<CloudNote>("/api/notes", {
    method: "PUT",
    body: JSON.stringify(note),
  });
}

/** Delete a cloud note by its UUID. */
export async function deleteCloudNote(noteId: string): Promise<void> {
  return apiFetch<void>(`/api/notes/${noteId}`, { method: "DELETE" });
}

/** Enable public link sharing for a note. Returns the share URL. */
export async function enableSharing(noteId: string): Promise<ShareResult> {
  return apiFetch<ShareResult>(`/api/notes/${noteId}/share`, { method: "POST" });
}

/** Disable public link sharing for a note. */
export async function disableSharing(noteId: string): Promise<void> {
  return apiFetch<void>(`/api/notes/${noteId}/share`, { method: "DELETE" });
}

/**
 * Fetch a publicly shared note by its share token.
 * This does NOT require authentication and hits the unauthenticated public route.
 */
export async function getPublicNote(token: string): Promise<{
  title: string;
  content: string;
  updated_at: string;
}> {
  const response = await fetch(
    `${BACKEND_API_URL}/api/public/notes/${token}`
  );
  if (!response.ok) {
    throw new Error(`Note not found or not public (${response.status})`);
  }
  return response.json();
}
