"use client";

import { useState } from "react";
import type { CampaignStepStat } from "@/lib/data";

export function CampaignStepBreakdown({ steps }: { steps: CampaignStepStat[] }) {
  const [open, setOpen] = useState(false);
  if (steps.length === 0) return null;

  return (
    <div className="mt-4 border-t border-black/5 pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold text-charcoal underline"
      >
        {open ? "Hide step breakdown" : `Show step breakdown (${steps.length})`}
      </button>
      {open && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-black/10 text-left uppercase tracking-wide text-body-gray">
                <th className="py-1.5 pr-3">Step</th>
                <th className="py-1.5 pr-3">Sent</th>
                <th className="py-1.5 pr-3">Delivered</th>
                <th className="py-1.5 pr-3">Opened</th>
                <th className="py-1.5 pr-3">Responded</th>
                <th className="py-1.5 pr-3">Bounced</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((s) => (
                <tr key={`${s.step}-${s.version ?? ""}`} className="border-b border-black/5">
                  <td className="py-2 pr-3 font-semibold text-charcoal">
                    Step {s.step}
                    {s.version ? ` (${s.version})` : ""}
                  </td>
                  <td className="py-2 pr-3">{s.sent.toLocaleString()}</td>
                  <td className="py-2 pr-3">{s.delivered.toLocaleString()}</td>
                  <td className="py-2 pr-3">{s.opened.toLocaleString()}</td>
                  <td className="py-2 pr-3">{s.responded.toLocaleString()}</td>
                  <td className="py-2 pr-3">{s.bounced.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
