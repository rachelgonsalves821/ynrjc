import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NavBar from "../components/NavBar";
import {
  apiUrl,
  studioChat,
  type StudioChatMessage,
} from "../lib/api";

const STORAGE_KEY = "langup-studio-chat-v1";

const LEVELS = [1, 2, 3, 4, 5] as const;

const LEVEL_TITLE: Record<number, string> = {
  1: "Light touch",
  2: "Basic mix",
  3: "Intermediate mix",
  4: "Advanced immersion",
  5: "Full immersion",
};

const LANGUAGE_OPTIONS = [
  "Japanese",
  "Spanish",
  "French",
  "German",
  "Korean",
  "Mandarin",
  "Arabic",
  "Hindi",
] as const;

const AGENT_GREETING: StudioChatMessage = {
  role: "assistant",
  content:
    "Hi — tell me a topic, rough notes, or the kind of text you want to read. I'll help you shape clean English you can send to the reader.",
};

export type BlendWordResult = {
  original: string;
  swapped: string;
  romaji: string;
  translation: string;
  is_swapped: boolean;
};

export type BlendApiResponse = {
  words: BlendWordResult[];
  detected_language: string;
  total_words_swapped: number;
};

export type ReaderLocationState = {
  sourceText: string;
  level: number;
  target_language: string;
  blend: BlendApiResponse;
};

const NAV_ROUTES: Record<
  "input" | "reader" | "vocab" | "dashboard",
  string
> = {
  input: "/input",
  reader: "/reader",
  vocab: "/vocab",
  dashboard: "/dashboard",
};

function wordCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

function loadStoredMessages(): StudioChatMessage[] | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { messages?: StudioChatMessage[] };
    if (Array.isArray(p.messages) && p.messages.length > 0) return p.messages;
  } catch {
    /* ignore */
  }
  return null;
}

export default function InputScreen() {
  const { token, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleNavigate = useCallback(
    (key: keyof typeof NAV_ROUTES) => {
      navigate(NAV_ROUTES[key]);
    },
    [navigate]
  );

  const [mode, setMode] = useState<"paste" | "agent">("paste");
  const [text, setText] = useState("");
  const [level, setLevel] = useState(3);
  const [targetLanguage, setTargetLanguage] = useState(
    () => profile?.target_language || "Japanese"
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<StudioChatMessage[]>(() => {
    return loadStoredMessages() ?? [{ ...AGENT_GREETING }];
  });
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ messages, targetLanguage, level })
      );
    } catch {
      /* ignore */
    }
  }, [messages, targetLanguage, level]);

  const wc = useMemo(() => wordCount(text), [text]);

  const lastAssistantContent = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === "assistant") return messages[i].content.trim();
    }
    return "";
  }, [messages]);

  const canOpenReaderFromAgent = useMemo(
    () =>
      Boolean(
        lastAssistantContent &&
          messages.some((m) => m.role === "user")
      ),
    [lastAssistantContent, messages]
  );

  async function openReaderWithPassage(
    raw: string,
    opts?: { fromAgent?: boolean }
  ) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setError(
        opts?.fromAgent
          ? "Wait for the assistant’s reply, then tap Open in reader."
          : "Paste or type some text to practice."
      );
      return;
    }
    if (!token) {
      setError("Not signed in.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/blend"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: trimmed,
          level,
          target_language: targetLanguage,
        }),
      });
      const data = (await res.json()) as BlendApiResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Blend request failed");
      }

      if (opts?.fromAgent) {
        setText(trimmed);
      }

      navigate("/reader", {
        replace: false,
        state: {
          sourceText: trimmed,
          level,
          target_language: targetLanguage,
          blend: data,
        } satisfies ReaderLocationState,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (mode === "agent") {
      await openReaderWithPassage(lastAssistantContent, { fromAgent: true });
      return;
    }
    await openReaderWithPassage(text);
  }

  async function handleOpenReaderFromAgent() {
    await openReaderWithPassage(lastAssistantContent, { fromAgent: true });
  }

  async function handleChatSend() {
    const trimmed = chatInput.trim();
    if (!trimmed || !token || chatLoading) return;
    setChatError("");
    const nextMessages: StudioChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await studioChat(token, {
        messages: nextMessages,
        target_language: targetLanguage,
        level,
      });
      setMessages((m) => [...m, { role: "assistant", content: res.content }]);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Chat failed");
    } finally {
      setChatLoading(false);
    }
  }

  function handleUsePassage() {
    if (!lastAssistantContent) return;
    setText(lastAssistantContent);
    setError("");
    setMode("paste");
  }

  function handleClearChat() {
    setMessages([{ ...AGENT_GREETING }]);
    setChatError("");
  }

  return (
    <div className="input-page">
      <NavBar
        active="input"
        onNavigate={handleNavigate}
        onLogout={signOut}
      />

      <div className="lu-studio-layout">
        <aside className="lu-studio-sidebar" aria-label="Workspace">
          <div className="lu-studio-sidebar-brand">LangUp</div>
          <Link className="lu-studio-side-link active" to="/input">
            <span className="material-symbols-outlined" aria-hidden>
              edit_note
            </span>
            Studio
          </Link>
          <Link className="lu-studio-side-link" to="/reader">
            <span className="material-symbols-outlined" aria-hidden>
              auto_stories
            </span>
            Library
          </Link>
          <Link className="lu-studio-side-link" to="/dashboard">
            <span className="material-symbols-outlined" aria-hidden>
              military_tech
            </span>
            Growth
          </Link>
          <Link className="lu-studio-side-link" to="/vocab">
            <span className="material-symbols-outlined" aria-hidden>
              translate
            </span>
            Vocabulary
          </Link>
        </aside>

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <header className="lu-studio-mobile-header">
            <span className="brand">LangUp</span>
            <span className="material-symbols-outlined" style={{ opacity: 0.6 }}>
              account_circle
            </span>
          </header>

          <main className="input-screen lu-studio-main">
            <header className="lu-studio-header">
              <h1>Input Studio</h1>
              <p>
                Transform any source text into an immersive language lesson by
                blending target vocabulary into your reading flow.
              </p>
            </header>

            <form className="lu-studio-grid" onSubmit={handleSubmit}>
              <section>
                <div className="lu-studio-mode-row" role="tablist" aria-label="Input mode">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "paste"}
                    className={`lu-studio-mode-btn ${mode === "paste" ? "active" : ""}`}
                    onClick={() => {
                      setMode("paste");
                      setError("");
                    }}
                  >
                    Paste
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "agent"}
                    className={`lu-studio-mode-btn ${mode === "agent" ? "active" : ""}`}
                    onClick={() => {
                      setMode("agent");
                      setError("");
                    }}
                  >
                    Agent
                  </button>
                </div>

                {mode === "paste" ? (
                  <>
                    <div className="lu-studio-text-wrap">
                      <label htmlFor="lu-passage">Paste source text</label>
                      <textarea
                        id="lu-passage"
                        className="lu-studio-textarea"
                        value={text}
                        onChange={(e) => {
                          setText(e.target.value);
                          setError("");
                        }}
                        placeholder="Paste an article, a story, or notes here to start the transformation…"
                        disabled={loading}
                        spellCheck
                      />
                      <div className="lu-studio-badges" aria-hidden>
                        <span className="lu-studio-badge">{wc} words</span>
                        <span className="lu-studio-badge">
                          Practice: {targetLanguage}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="lu-studio-chat">
                      <div className="lu-studio-chat-log" aria-live="polite">
                        {messages.map((m, i) => (
                          <div
                            key={`${m.role}-${i}`}
                            className={`lu-studio-msg ${m.role}`}
                          >
                            {m.content}
                          </div>
                        ))}
                        {chatLoading ? (
                          <div className="lu-studio-msg assistant" aria-busy>
                            …
                          </div>
                        ) : null}
                      </div>
                      <div className="lu-studio-chat-actions lu-studio-chat-actions--primary">
                        <button
                          type="button"
                          className="lu-studio-open-reader-inline"
                          onClick={handleOpenReaderFromAgent}
                          disabled={
                            loading || chatLoading || !canOpenReaderFromAgent
                          }
                        >
                          <span className="material-symbols-outlined" aria-hidden>
                            auto_stories
                          </span>
                          Open in reader
                        </button>
                      </div>
                      <div className="lu-studio-chat-actions">
                        <button
                          type="button"
                          className="lu-studio-use-passage"
                          onClick={handleUsePassage}
                          disabled={!lastAssistantContent || chatLoading}
                        >
                          Copy last reply to Paste
                        </button>
                        <button
                          type="button"
                          className="lu-studio-use-passage"
                          onClick={handleClearChat}
                          disabled={chatLoading}
                          title="Reset conversation"
                        >
                          Clear chat
                        </button>
                      </div>
                      <p className="lu-studio-agent-hint">
                        Uses immersion level and target language on the right. When the
                        assistant has a reply you like, tap <strong>Open in reader</strong>{" "}
                        to blend and read — no need to switch to Paste.
                      </p>
                      {chatError ? (
                        <p className="lu-studio-error">{chatError}</p>
                      ) : null}
                      <div className="lu-studio-chat-input-row">
                        <textarea
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Ask for a draft, edit, or topic…"
                          disabled={chatLoading || !token}
                          rows={2}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleChatSend();
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="lu-studio-chat-send"
                          onClick={handleChatSend}
                          disabled={
                            chatLoading ||
                            !token ||
                            !chatInput.trim()
                          }
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <div className="lu-studio-lang">
                  <label htmlFor="lu-lang">Target language</label>
                  <select
                    id="lu-lang"
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    disabled={loading}
                  >
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>

                {error ? <p className="lu-studio-error">{error}</p> : null}
              </section>

              <aside className="lu-studio-panel">
                <div className="lu-level-card">
                  <h3>Immersion level</h3>
                  <div className="lu-level-row">
                    {LEVELS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`lu-level-btn ${level === n ? "selected" : ""}`}
                        onClick={() => setLevel(n)}
                        disabled={loading}
                        aria-pressed={level === n}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="lu-level-detail">
                    <span className="material-symbols-outlined" aria-hidden>
                      auto_fix_high
                    </span>
                    <span>{LEVEL_TITLE[level]}</span>
                  </div>
                  <ul className="lu-level-legend">
                    {LEVELS.map((n) => (
                      <li
                        key={n}
                        className={
                          level < 4 && n >= 4
                            ? "muted"
                            : level > 3 && n <= 2
                            ? "muted"
                            : ""
                        }
                      >
                        <span>Level {n}</span>
                        <span>{LEVEL_TITLE[n]}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="lu-pipeline-card">
                  <button
                    type="submit"
                    className="lu-pipeline-submit"
                    disabled={
                      loading ||
                      chatLoading ||
                      (mode === "paste"
                        ? !text.trim()
                        : !canOpenReaderFromAgent)
                    }
                  >
                    {loading ? (
                      <>
                        <span className="lu-spinner" aria-hidden />
                        <span>Analyzing text…</span>
                      </>
                    ) : (
                      <span>Open in reader</span>
                    )}
                  </button>

                  <div className="lu-pipeline-steps" aria-live="polite">
                    <div className={`lu-pipeline-step ${!loading ? "muted" : ""}`}>
                      <div className={`lu-pipeline-icon ${loading ? "done" : ""}`}>
                        <span
                          className={`material-symbols-outlined ${
                            loading ? "filled" : ""
                          }`}
                        >
                          {loading ? "check_circle" : "manage_search"}
                        </span>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: loading
                              ? "var(--lu-primary)"
                              : "var(--lu-on-surface-variant)",
                          }}
                        >
                          Detecting language
                        </div>
                        <div
                          style={{
                            fontSize: "0.6rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: "var(--lu-on-surface-variant)",
                          }}
                        >
                          {loading ? "Completed" : "Idle"}
                        </div>
                      </div>
                    </div>
                    <div className="lu-pipeline-connector" />
                    <div className="lu-pipeline-step">
                      <div
                        className={`lu-pipeline-icon ${loading ? "active" : ""}`}
                      >
                        <span className="material-symbols-outlined">
                          translate
                        </span>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: loading
                              ? "var(--lu-on-surface)"
                              : "var(--lu-on-surface-variant)",
                          }}
                        >
                          Swapping words
                        </div>
                        {loading ? (
                          <div className="lu-shimmer-bar" aria-hidden>
                            <span />
                          </div>
                        ) : (
                          <div
                            style={{
                              fontSize: "0.6rem",
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                              color: "var(--lu-on-surface-variant)",
                              marginTop: 4,
                            }}
                          >
                            Waiting
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="lu-pipeline-connector" />
                    <div className={`lu-pipeline-step ${loading ? "muted" : ""}`}>
                      <div className="lu-pipeline-icon">
                        <span className="material-symbols-outlined">
                          auto_stories
                        </span>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700 }}>
                          Ready
                        </div>
                        <div
                          style={{
                            fontSize: "0.6rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: "var(--lu-on-surface-variant)",
                          }}
                        >
                          Reader
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            </form>
          </main>
        </div>
      </div>
    </div>
  );
}
