"use client";

import { useState } from "react";
import { stripHtml } from "@/lib/strip-html";

type EmailCopy = { subject: string | null; msg: string | null };

export function CampaignEmailContent({ emailCopy }: { emailCopy: EmailCopy[] }) {
  const [open, setOpen] = useState(false);
  const usable = emailCopy.filter((e) => e.subject || e.msg);
  if (usable.length === 0) return null;

  return (
    <div className="mt-3">
      <button onClick={() => setOpen((v) => !v)} className="text-xs font-semibold text-charcoal underline">
        {open ? "Hide email content" : `Show email content (${usable.length})`}
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-3">
          {usable.map((e, i) => (
            <div key={i} className="rounded-xl bg-mist/60 p-3 text-xs">
              <p className="mb-1 font-semibold text-charcoal">
                Step {i + 1}
                {e.subject ? `: ${e.subject}` : ""}
              </p>
              {e.msg && (
                <p className="whitespace-pre-line text-body-gray">{stripHtml(e.msg)}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
