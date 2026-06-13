/**
 * authService.ts
 *
 * Handles login/logout with Neon Auth and stores the JWT access_token
 * securely in the app's data directory via Tauri commands.
 *
 * Security notes:
 *  - The token is written to a JSON file in the OS app data directory
 *    (not in the notes folder or any world-readable location).
 *  - The file is only readable by the current user on all major OSes.
 *  - We never log the token value itself, only its presence/absence.
 *  - On logout the file is cleared (token removed from disk).
 *
 * The Neon Auth REST endpoint used is the "sign-in with email" route:
 *   POST <NEON_AUTH_BASE_URL>/auth/sign-in/email
 */

import { invoke } from "@tauri-apps/api/core";

// ─── Production backend URLs ───────────────────────────────────────────────
// These are the only two URLs the desktop app ever calls:
//   1. Neon Auth REST endpoint (for login)
//   2. Our Rust backend API (for note operations)
//
// Both are hard-coded to production since this is a production-only app.
/**
 * authService.ts
 *
 * Handles login/logout with Neon Auth and stores the JWT access_token
 * securely in the app's data directory via Tauri commands.
 *
 * Security notes:
 *  - The token is written to a JSON file in the OS app data directory
 *    (not in the notes folder or any world-readable location).
 *  - The file is only readable by the current user on all major OSes.
 *  - We never log the token value itself, only its presence/absence.
 *  - On logout the file is cleared (token removed from disk).
 *
 * The Neon Auth REST endpoint used is the "sign-in with email" route:
 *   POST <NEON_AUTH_BASE_URL>/auth/sign-in/email
 */

import { invoke } from "@tauri-apps/api/core";

// ─── Production backend URLs ───────────────────────────────────────────────
// These are the only two URLs the desktop app ever calls:
//   1. Neon Auth REST endpoint (for login)
//   2. Our Rust backend API (for note operations)
//
// Both are hard-coded to production since this is a production-only app.
// Users who build from source can override via VITE_ env vars at build time.

export const NEON_AUTH_BASE_URL =
  import.meta.env.VITE_NEON_AUTH_BASE_URL ||
  "https://ep-royal-violet-at02i5yg.neonauth.c-9.us-east-1.aws.neon.tech/neondb/auth";

export const BACKEND_API_URL =
  import.meta.env.VITE_BACKEND_API_URL ||
  "https://notepadpro.lol";

export const SITE_URL =
  import.meta.env.VITE_SITE_URL ||
  "https://notepadpro.lol";

const TOKEN_FILE_KEY = "cloud_auth_token";

/** Persist the JWT token to the secure app data directory. */
export async function storeToken(token: string): Promise<void> {
  await invoke("store_secure_value", { key: TOKEN_FILE_KEY, value: token });
}

/** Load the JWT token from the secure app data directory. */
export async function loadToken(): Promise<string | null> {
  try {
    const value: string | null = await invoke("load_secure_value", { key: TOKEN_FILE_KEY });
    return value || null;
  } catch {
    return null;
  }
}

/** Remove the token from disk (logout). */
export async function clearToken(): Promise<void> {
  await invoke("store_secure_value", { key: TOKEN_FILE_KEY, value: null });
}

// ─── Auth API ──────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface NeonAuthResponse {
  user?: AuthUser;
  session?: {
    token: string;
    access_token?: string;
  };
  token?: string;
  access_token?: string;
  error?: string;
  message?: string;
}

/**
 * Sign in with email + password via Neon Auth REST endpoint.
 * On success, stores the JWT to disk and returns the user object.
 */
export async function signIn(
  email: string,
  password: string
): Promise<{ user: AuthUser; token: string }> {
  const url = `${NEON_AUTH_BASE_URL}/sign-in/email`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    let msg = `Auth error: ${response.status}`;
    try {
      const err: NeonAuthResponse = await response.json();
      msg = err.message || err.error || msg;
    } catch {
      // ignore parse errors
    }
    throw new Error(msg);
  }

  const data: NeonAuthResponse = await response.json();

  // Neon Auth returns the token in different shapes depending on the SDK version
  const token =
    data.session?.access_token ||
    data.session?.token ||
    data.access_token ||
    data.token;

  if (!token) {
    throw new Error("No access token in response from auth server.");
  }

  const user = data.user;
  if (!user) {
    throw new Error("No user object in response from auth server.");
  }

  await storeToken(token);
  return { user, token };
}

/**
 * Sign out: clears the local token from disk.
 * (There is no server-side session invalidation needed since the
 * desktop app uses short-lived JWTs directly — sessions live in the
 * neon_auth schema and expire naturally.)
 */
export async function signOut(): Promise<void> {
  await clearToken();
}

/** Check if the user is currently signed in (token present on disk). */
export async function isSignedIn(): Promise<boolean> {
  const token = await loadToken();
  return token !== null;
}

/** Decode AuthUser object from public claims of JWT */
export function decodeUserFromToken(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return {
      id: payload.sub || "",
      name: payload.name || payload.email || "NoteX User",
      email: payload.email || "",
    };
  } catch {
    return null;
  }
}
