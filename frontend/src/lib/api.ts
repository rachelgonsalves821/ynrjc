/**
 * Typed LangUp REST client (Express backend). Mirrors `src/api.js`.
 */

/** Default API origin in local dev (Express default PORT in this repo). */
const DEV_API_ORIGIN = "http://localhost:4000";

/**
 * Build the fetch URL for the Express API.
 * - If REACT_APP_API_URL is set → use it (must be the API, not the React dev server).
 * - In development, if unset → `http://localhost:4000` (direct; avoids CRA proxy returning index.html).
 * - In production, if unset → same-origin relative paths (set REACT_APP_API_URL if API is elsewhere).
 */
export function apiUrl(path: string): string {
  const raw = process.env.REACT_APP_API_URL?.trim();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (raw) {
    return `${raw.replace(/\/$/, "")}${p}`;
  }
  if (process.env.NODE_ENV === "development") {
    return `${DEV_API_ORIGIN}${p}`;
  }
  return p;
}

function headers(token?: string | null): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(apiUrl(path), options);
  const text = await res.text();
  let data: { error?: string } & Record<string, unknown>;
  try {
    data = text ? (JSON.parse(text) as typeof data) : {};
  } catch {
    const head = text.trimStart().slice(0, 80);
    if (head.startsWith("<") || head.startsWith("<!DOCTYPE")) {
      throw new Error(
        "API returned HTML instead of JSON. Start Express on port 4000 (npm run dev in /backend). In frontend/.env, do not set REACT_APP_API_URL to the React port (3001); use http://localhost:4000 or leave it unset for local dev."
      );
    }
    throw new Error(
      head ? `Invalid JSON from server: ${head}…` : "Empty response from server"
    );
  }
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Request failed"
    );
  }
  return data as T;
}

// —— Auth (raw shapes before persist) ——

export interface AuthUser {
  id: string;
  email?: string;
  target_language?: string;
  level?: number;
  [key: string]: unknown;
}

export interface AuthSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  [key: string]: unknown;
}

export interface AuthResponseRaw {
  user?: AuthUser;
  session?: AuthSession;
  token?: string;
}

export interface PersistedProfile {
  id: string;
  email?: string;
  target_language: string;
}

export interface LoginResult {
  token: string;
  user: AuthUser & { target_language: string };
}

function persistAuthResponse(
  data: AuthResponseRaw,
  fallbackTargetLanguage?: string
): LoginResult {
  const token = data.session?.access_token ?? data.token;
  if (!token) throw new Error("No access token in auth response");
  const user = data.user;
  if (!user?.id) throw new Error("No user in auth response");

  const target_language =
    user.target_language ?? fallbackTargetLanguage ?? "Spanish";

  localStorage.setItem("token", token);
  localStorage.setItem(
    "profile",
    JSON.stringify({
      id: user.id,
      email: user.email,
      target_language,
    } satisfies PersistedProfile)
  );

  return {
    token,
    user: { ...user, target_language },
  };
}

export async function signup(
  email: string,
  password: string,
  target_language: string
): Promise<LoginResult> {
  const data = await request<AuthResponseRaw>("/auth/signup", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email, password, target_language }),
  });
  return persistAuthResponse(data, target_language);
}

export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  const data = await request<AuthResponseRaw>("/auth/login", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email, password }),
  });
  return persistAuthResponse(data);
}

// —— Vocabulary ——

export interface VocabularyRow {
  id: string;
  user_id: string;
  word_native: string;
  word_english: string;
  language: string;
  times_seen: number;
  times_clicked: number;
  mastery_score: number;
  last_seen: string | null;
  [key: string]: unknown;
}

export async function recordClick(
  token: string,
  word_native: string,
  word_english: string,
  language: string
): Promise<VocabularyRow> {
  return request<VocabularyRow>("/vocab/record-click", {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ word_native, word_english, language }),
  });
}

export async function recordSeenSingle(
  token: string,
  word_native: string,
  word_english: string,
  language: string
): Promise<VocabularyRow> {
  return request<VocabularyRow>("/vocab/record-seen", {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ word_native, word_english, language }),
  });
}

export async function getVocab(token: string): Promise<VocabularyRow[]> {
  return request<VocabularyRow[]>("/vocab", { headers: headers(token) });
}

// —— Sessions ——

export interface SessionRow {
  id: string;
  user_id: string;
  content_snippet: string;
  total_words_swapped: number;
  words_clicked: number;
  score: number;
  level_used: number;
  created_at: string;
  [key: string]: unknown;
}

export interface SessionsSummary {
  average_score: number;
  best_score: number;
  total_sessions: number;
}

export interface SessionsListResponse {
  sessions: SessionRow[];
  summary: SessionsSummary;
}

export async function saveSession(
  token: string,
  content_snippet: string,
  total_words_swapped: number,
  words_clicked: number,
  level_used: number
): Promise<SessionRow> {
  return request<SessionRow>("/sessions", {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({
      content_snippet,
      total_words_swapped,
      words_clicked,
      level_used,
    }),
  });
}

export async function getSessions(
  token: string
): Promise<SessionsListResponse> {
  return request<SessionsListResponse>("/sessions", {
    headers: headers(token),
  });
}

export interface ProgressWeek {
  week_start: string;
  average_score: number;
  session_count: number;
}

export interface ProgressResponse {
  progress: ProgressWeek[];
}

export async function getProgress(token: string): Promise<ProgressResponse> {
  return request<ProgressResponse>("/sessions/progress", {
    headers: headers(token),
  });
}

// —— Studio (agent) ——

export interface StudioChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StudioChatResponse {
  role: "assistant";
  content: string;
}

export async function studioChat(
  token: string,
  payload: {
    messages: StudioChatMessage[];
    target_language: string;
    level: number;
  }
): Promise<StudioChatResponse> {
  return request<StudioChatResponse>("/api/studio/chat", {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(payload),
  });
}
