import React from "react";

export type WordPillProps = {
  /** Text in the learner’s target language (shown in the pill). */
  target: string;
  /** English gloss / native hint (e.g. tooltip). */
  native: string;
  className?: string;
  onMouseEnter?: () => void;
};

/**
 * Small inline chip for a swapped vocabulary item in the reader.
 */
export function WordPill({
  target,
  native,
  className = "",
  onMouseEnter,
}: WordPillProps) {
  return (
    <span
      className={`word-pill ${className}`.trim()}
      title={native}
      onMouseEnter={onMouseEnter}
    >
      {target}
    </span>
  );
}

export default WordPill;
