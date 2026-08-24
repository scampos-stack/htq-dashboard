"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "ring";

const NEXT_THEME: Record<Theme, Theme> = {
  light: "dark",
  dark: "ring",
  ring: "light",
};

const LABEL: Record<Theme, string> = {
  light: "Switch to dark mode",
  dark: "Switch to One Ring mode",
  ring: "Switch to light mode",
};

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.classList.toggle("one-ring", theme === "ring");
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const el = document.documentElement;
    if (el.classList.contains("one-ring")) setTheme("ring");
    else if (el.classList.contains("dark")) setTheme("dark");
  }, []);

  function toggle() {
    const next = NEXT_THEME[theme];
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem("htq-theme", next);
    } catch {
      // localStorage unavailable — theme just won't persist across reloads
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={LABEL[theme]}
      title={LABEL[theme]}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-charcoal shadow-sm transition-colors hover:bg-charcoal/5"
    >
      {theme === "dark" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ) : theme === "ring" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="13" r="7" />
          <path d="M9 6l3-4 3 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}
