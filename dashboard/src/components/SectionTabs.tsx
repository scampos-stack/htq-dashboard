"use client";

import { useState, type ReactNode } from "react";

export function SectionTabs({
  tabs,
  accent = "border-charcoal",
}: {
  tabs: { label: string; content: ReactNode }[];
  accent?: string;
}) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-1 border-b border-black/10">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setActive(i)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              active === i
                ? `${accent} text-charcoal`
                : "border-transparent text-body-gray hover:text-charcoal"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs[active]?.content}
    </div>
  );
}
