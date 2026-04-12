import React from "react";

export type NavKey = "input" | "reader" | "vocab" | "dashboard";

export type NavBarProps = {
  active?: NavKey;
  onNavigate?: (key: NavKey) => void;
  onLogout?: () => void;
  className?: string;
};

const ITEMS: { key: NavKey; label: string; icon: string }[] = [
  { key: "input", label: "Studio", icon: "edit_note" },
  { key: "reader", label: "Reader", icon: "menu_book" },
  { key: "dashboard", label: "Insights", icon: "query_stats" },
  { key: "vocab", label: "Vocabulary", icon: "style" },
];

export function NavBar({
  active,
  onNavigate,
  onLogout,
  className = "",
}: NavBarProps) {
  return (
    <nav
      className={`langup-nav ${className}`.trim()}
      aria-label="Main navigation"
    >
      <span className="langup-nav-brand">LangUp</span>
      <ul className="langup-nav-list">
        {ITEMS.map(({ key, label, icon }) => (
          <li key={key}>
            <button
              type="button"
              className={active === key ? "active" : undefined}
              onClick={() => onNavigate?.(key)}
              aria-current={active === key ? "page" : undefined}
            >
              <span className="material-symbols-outlined" aria-hidden>
                {icon}
              </span>
              {label}
            </button>
          </li>
        ))}
      </ul>
      {onLogout ? (
        <button type="button" className="langup-nav-logout" onClick={onLogout}>
          Sign out
        </button>
      ) : null}
    </nav>
  );
}

export default NavBar;
