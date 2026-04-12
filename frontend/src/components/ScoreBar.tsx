import React from "react";

export type ScoreBarProps = {
  /** Value in the same units as `max` (e.g. session score 0–100). */
  value: number;
  max?: number;
  label?: string;
  className?: string;
};

/**
 * Horizontal bar for session score or mastery feedback.
 */
export function ScoreBar({
  value,
  max = 100,
  label,
  className = "",
}: ScoreBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div className={`score-bar ${className}`.trim()} role="group" aria-label={label}>
      {label ? <span className="score-bar-label">{label}</span> : null}
      <div className="score-bar-track">
        <div
          className="score-bar-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default ScoreBar;
