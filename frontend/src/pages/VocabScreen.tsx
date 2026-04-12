import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { useAuth } from "../context/AuthContext";
import { getVocab, type VocabularyRow } from "../lib/api";

const NAV_ROUTES = {
  input: "/input",
  reader: "/reader",
  vocab: "/vocab",
  dashboard: "/dashboard",
} as const;

type FilterKey = "all" | "struggling" | "mastered";

function masteryBarColor(score: number): string {
  if (score < 35) return "var(--lu-error)";
  if (score < 70) return "var(--lu-tertiary-container)";
  return "var(--lu-primary)";
}

export default function VocabScreen() {
  const { token, signOut } = useAuth();
  const navigate = useNavigate();

  const handleNavigate = useCallback(
    (key: keyof typeof NAV_ROUTES) => {
      navigate(NAV_ROUTES[key]);
    },
    [navigate]
  );

  const [rows, setRows] = useState<VocabularyRow[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getVocab(token);
        if (!cancelled) setRows(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load vocabulary");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const score = r.mastery_score ?? 0;
      if (filter === "struggling" && score >= 45) return false;
      if (filter === "mastered" && score < 75) return false;
      if (!q) return true;
      const hay = `${r.word_native} ${r.word_english} ${r.language}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, filter]);

  return (
    <div className="vocab-page">
      <NavBar
        active="vocab"
        onNavigate={handleNavigate}
        onLogout={signOut}
      />

      <main className="vocab-main">
        <div className="vocab-sticky-head">
          <div className="vocab-search-wrap">
            <span className="material-symbols-outlined" aria-hidden>
              search
            </span>
            <input
              type="search"
              placeholder="Search your archive…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search vocabulary"
            />
          </div>
        </div>

        <div className="vocab-heading-row">
          <h1>Your vocab</h1>
          <span className="vocab-count-badge">{rows.length} words</span>
        </div>

        {error ? <p className="dash-error">{error}</p> : null}

        <div className="vocab-filters" role="tablist" aria-label="Filter vocabulary">
          {(
            [
              ["all", "All words"],
              ["struggling", "Struggling"],
              ["mastered", "Mastered"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              className={`vocab-filter-btn ${filter === key ? "active" : ""}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="dash-empty">Loading vocabulary…</p>
        ) : (
          <div className="vocab-grid">
            {filtered.length === 0 ? (
              <p className="dash-empty">
                {rows.length === 0
                  ? "No vocabulary rows yet — tap blended words in the reader to build your archive."
                  : "No words match this filter."}
              </p>
            ) : (
              filtered.map((r) => {
                const score = Math.min(
                  100,
                  Math.max(0, Math.round(r.mastery_score ?? 0))
                );
                return (
                  <article key={r.id} className="vocab-card">
                    <div className="vocab-card-row">
                      <div className="vocab-card-left">
                        <div className="vocab-kanji" lang={r.language}>
                          {r.word_native}
                        </div>
                        <div className="vocab-meta">
                          <div className="roma">{r.language}</div>
                          <h3>{r.word_english}</h3>
                        </div>
                      </div>
                      <div className="vocab-mastery">
                        <div className="vocab-mastery-bar">
                          <span
                            style={{
                              width: `${score}%`,
                              background: masteryBarColor(score),
                            }}
                          />
                        </div>
                        <p className="vocab-mastery-hint">
                          seen {r.times_seen} times, clicked {r.times_clicked}{" "}
                          times
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
}
