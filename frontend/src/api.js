const BASE =
  process.env.REACT_APP_API_URL || "http://localhost:4000";

function headers(token) {
  const h = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

/**
 * Normalizes Supabase-style { user, session } or flat { token, user } responses,
 * persists token + profile, returns { token, user } for callers.
 */
function persistAuthResponse(data, fallbackTargetLanguage) {
  const token =
    data.session?.access_token ?? data.token;
  if (!token) {
    throw new Error("No access token in auth response");
  }
  const user = data.user;
  if (!user) {
    throw new Error("No user in auth response");
  }
  const target_language =
    user.target_language ?? fallbackTargetLanguage ?? "Spanish";

  localStorage.setItem("token", token);
  localStorage.setItem(
    "profile",
    JSON.stringify({
      id: user.id,
      email: user.email,
      target_language,
    })
  );

  return { token, user: { ...user, target_language } };
}

export async function signup(email, password, target_language) {
  const data = await request("/auth/signup", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email, password, target_language }),
  });
  return persistAuthResponse(data, target_language);
}

export async function login(email, password) {
  const data = await request("/auth/login", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email, password }),
  });
  return persistAuthResponse(data);
}

// Vocab
export const recordClick = (token, word_native, word_english, language) =>
  request("/vocab/record-click", {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ word_native, word_english, language }),
  });

export const recordSeenSingle = (token, word_native, word_english, language) =>
  request("/vocab/record-seen", {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ word_native, word_english, language }),
  });

export const getVocab = (token) =>
  request("/vocab", { headers: headers(token) });

// Sessions
export const saveSession = (
  token,
  content_snippet,
  total_words_swapped,
  words_clicked,
  level_used
) =>
  request("/sessions", {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({
      content_snippet,
      total_words_swapped,
      words_clicked,
      level_used,
    }),
  });

export const getSessions = (token) =>
  request("/sessions", { headers: headers(token) });

export const getProgress = (token) =>
  request("/sessions/progress", { headers: headers(token) });

// —— Legacy shims for `Chat.jsx` (reference only; remove when ReaderScreen replaces it) ——

export async function getWeakWords(token) {
  const rows = await getVocab(token);
  const words = rows
    .filter((r) => r.mastery_score < 0.3)
    .slice(0, 8);
  return { words };
}

export async function sendMessage() {
  throw new Error(
    "Legacy chat endpoint removed — wire ReaderScreen to the blend + sessions API."
  );
}

export async function recordSeenBatch(token, words) {
  await Promise.all(
    words.map((w) =>
      recordSeenSingle(token, w.word_native, w.word_english, w.language)
    )
  );
}
