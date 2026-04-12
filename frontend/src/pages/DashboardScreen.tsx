import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { useAuth } from "../context/AuthContext";
import {
  getProgress,
  getSessions,
  type ProgressWeek,
  type SessionRow,
  type SessionsSummary,
} from "../lib/api";

const NAV_ROUTES = {
  input: "/input",
  reader: "/reader",
  vocab: "/vocab",
  dashboard: "/dashboard",
} as const;

function formatSessionDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatWeekLabel(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function scoreColor(score: number): string {
  if (score >= 85) return "var(--lu-secondary)";
  if (score >= 70) return "var(--lu-on-surface)";
  if (score >= 55) return "var(--lu-on-primary-container)";
  if (score >= 40) return "var(--lu-tertiary-container)";
  return "var(--lu-error)";
}

export default function DashboardScreen() {
  const { token, signOut } = useAuth();
  const navigate = useNavigate();

  const handleNavigate = useCallback(
    (key: keyof typeof NAV_ROUTES) => {
      navigate(NAV_ROUTES[key]);
    },
    [navigate]
  );

  const [summary, setSummary] = useState<SessionsSummary | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [progress, setProgress] = useState<ProgressWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [listRes, progRes] = await Promise.all([
          getSessions(token),
          getProgress(token),
        ]);
        if (cancelled) return;
        setSummary(listRes.summary);
        setSessions(listRes.sessions);
        setProgress(progRes.progress);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load insights");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const chartWeeks = progress.length ? progress : [];
  const maxScore =
    chartWeeks.length > 0
      ? Math.max(1, ...chartWeeks.map((w) => w.average_score || 0))
      : 100;

  const lastIdx = chartWeeks.length - 1;

  return (
    <div className="dash-page">
      <NavBar
        active="dashboard"
        onNavigate={handleNavigate}
        onLogout={signOut}
      />

      <main className="dash-main">
        <header className="dash-top-header">
          <h1>Insights</h1>
        </header>

        {error ? <p className="dash-error">{error}</p> : null}

        {loading ? (
          <p className="dash-empty">Loading your progress…</p>
        ) : (
          <>
            <section className="dash-metrics">
              <div className="dash-metric">
                <div className="dash-metric-label">Average score</div>
                <div className="dash-metric-value primary">
                  {summary
                    ? `${Math.round(summary.average_score)}%`
                    : "—"}
                </div>
                <div className="dash-metric-bar">
                  <span
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(summary?.average_score ?? 0)
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <div className="dash-metric">
                <div className="dash-metric-label">Best score</div>
                <div
                  className="dash-metric-value secondary"
                  style={{ color: "var(--lu-secondary)" }}
                >
                  {summary ? `${Math.round(summary.best_score)}%` : "—"}
                </div>
                <div
                  className="dash-metric-bar"
                  style={{ background: "rgba(165, 208, 186, 0.2)" }}
                >
                  <span
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(summary?.best_score ?? 0)
                      )}%`,
                      background: "var(--lu-secondary)",
                    }}
                  />
                </div>
              </div>
              <div className="dash-metric">
                <div className="dash-metric-label">Total sessions</div>
                <div className="dash-metric-value">
                  {summary?.total_sessions ?? 0}
                </div>
                <div className="dash-metric-hint">
                  <span className="material-symbols-outlined filled" style={{ fontSize: "1rem" }}>
                    trending_up
                  </span>
                  Keep reading to grow this chart
                </div>
              </div>
            </section>

            <section className="dash-chart-section">
              <div className="dash-chart-head">
                <div>
                  <h2>Your progress</h2>
                  <p>Average scores by week</p>
                </div>
                <div className="dash-chart-badge">Weekly view</div>
              </div>
              <div className="dash-chart">
                <div className="dash-chart-grid" aria-hidden>
                  <div />
                  <div />
                  <div />
                  <div />
                </div>
                {chartWeeks.map((w, i) => {
                  const h = maxScore
                    ? Math.round((w.average_score / maxScore) * 100)
                    : 0;
                  const isCurrent = i === lastIdx;
                  return (
                    <div key={w.week_start} className="dash-chart-col">
                      <div
                        className={`dash-chart-bar ${isCurrent ? "is-current" : ""}`}
                        style={{ height: `${Math.max(8, h)}%` }}
                      >
                        <span className="dash-chart-dot" />
                      </div>
                      <span
                        className={`dash-chart-label ${isCurrent ? "em" : ""}`}
                      >
                        {formatWeekLabel(w.week_start)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="dash-sessions">
              <h2>Recent sessions</h2>
              {sessions.length === 0 ? (
                <p className="dash-empty">
                  No saved sessions yet. End a reader session with “Save session”
                  to see history here.
                </p>
              ) : (
                sessions.map((s) => (
                  <div key={s.id} className="dash-session-card">
                    <div className="dash-session-top">
                      <span className="dash-session-date">
                        {formatSessionDate(s.created_at)}
                      </span>
                      <span className="dash-session-level">
                        Level {s.level_used}
                      </span>
                      <span
                        className="dash-session-score"
                        style={{ color: scoreColor(s.score) }}
                      >
                        {Math.round(s.score)}%
                      </span>
                    </div>
                    <p className="dash-session-snippet">{s.content_snippet}</p>
                  </div>
                ))
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
