"use client";

import { useState } from "react";

// Keeps a detail table out of the default read — the Overview arrangement
// is meant to be scannable in ~30 seconds, so the full row-by-row numbers
// are opt-in rather than always taking up vertical space.
export function Collapsible({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold text-charcoal underline"
      >
        {open ? `Hide ${label}` : `Show ${label}`}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
