"use client";

import { useState } from "react";

type Prospect = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string | null;
  interestLevel: string | null;
};

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; prospects: Prospect[]; total: number };

export function CampaignProspectsPanel({ campaignId }: { campaignId: number }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<LoadState>({ status: "idle" });

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && state.status === "idle") {
      setState({ status: "loading" });
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/prospects`);
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to load prospects");
        setState({ status: "loaded", prospects: data.prospects, total: data.total });
      } catch (err) {
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Failed to load prospects",
        });
      }
    }
  }

  return (
    <div className="mt-3">
      <button onClick={handleToggle} className="text-xs font-semibold text-charcoal underline">
        {open ? "Hide prospects" : "Show prospects"}
      </button>
      {open && (
        <div className="mt-3 overflow-x-auto">
          {state.status === "loading" && (
            <p className="text-xs text-body-gray">Loading…</p>
          )}
          {state.status === "error" && (
            <p className="text-xs text-red-600">{state.message}</p>
          )}
          {state.status === "loaded" && (
            <>
              {state.prospects.length === 0 ? (
                <p className="text-xs text-body-gray">No prospects synced yet.</p>
              ) : (
                <>
                  <table className="w-full min-w-[480px] border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-black/10 text-left uppercase tracking-wide text-body-gray">
                        <th className="py-1.5 pr-3">Name</th>
                        <th className="py-1.5 pr-3">Email</th>
                        <th className="py-1.5 pr-3">Status</th>
                        <th className="py-1.5 pr-3">Interest</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.prospects.map((p) => (
                        <tr key={p.email} className="border-b border-black/5">
                          <td className="py-2 pr-3 font-semibold text-charcoal">
                            {[p.firstName, p.lastName].filter(Boolean).join(" ") || "—"}
                          </td>
                          <td className="py-2 pr-3">{p.email}</td>
                          <td className="py-2 pr-3">{p.status ?? "—"}</td>
                          <td className="py-2 pr-3">{p.interestLevel ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {state.total > state.prospects.length && (
                    <p className="mt-2 text-xs text-body-gray">
                      Showing {state.prospects.length} of {state.total.toLocaleString()}.
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
