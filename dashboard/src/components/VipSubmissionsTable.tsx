"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { VipSubmission } from "@/lib/data";

const STATUS_OPTIONS = [
  { value: "", label: "— No status —" },
  { value: "follow_up", label: "Follow-up" },
  { value: "call_booked", label: "Call Booked" },
  { value: "closed_won", label: "Closed — Won" },
  { value: "closed_lost", label: "Closed — Lost" },
  { value: "non_qualified", label: "Non-Qualified" },
];

const STATUS_STYLE: Record<string, string> = {
  follow_up: "bg-amber-500/15 text-amber-700",
  call_booked: "bg-sky-500/15 text-sky-700",
  closed_won: "bg-brand-green/15 text-brand-green-dark",
  closed_lost: "bg-red-500/15 text-red-700",
  non_qualified: "bg-charcoal/10 text-body-gray",
};

function OwnerSelect({
  contactId,
  owner,
  options,
}: {
  contactId: number;
  owner: string | null;
  // Every Active Keap user's first name (see getKeapOwnerNames in data.ts)
  // — live from Keap, not a hardcoded list, so a new hire with a Keap
  // login shows up here without a code change. Plus "Unassigned".
  options: string[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const current = owner ?? "";

  async function handleChange(next: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/vip-submissions/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: next }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to update owner");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update owner");
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={current}
      disabled={saving}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-lg border border-black/10 bg-white px-2 py-1 text-sm text-charcoal disabled:opacity-60"
    >
      {/* Shows whatever data.ts already resolved (Keap's owner, or a prior
          override) as the current selection, even if it isn't in the
          options list below (e.g. the account's owner is Inactive, or a
          shared mailbox) — picking one of those replaces it. */}
      {current && !options.includes(current) && <option value={current}>{current}</option>}
      {!current && <option value="">—</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function StatusSelect({ contactId, status }: { contactId: number; status: string | null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const current = status ?? "";

  async function handleChange(next: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/vip-submissions/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to update status");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={current}
      disabled={saving}
      onChange={(e) => handleChange(e.target.value)}
      className={`rounded-full border-none px-2.5 py-1 text-xs font-semibold outline-none disabled:opacity-60 ${
        current ? STATUS_STYLE[current] ?? "bg-charcoal/10 text-charcoal" : "bg-charcoal/5 text-body-gray"
      }`}
    >
      {STATUS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function NotesCell({ contactId, notes }: { contactId: number; notes: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleBlur() {
    if (value === (notes ?? "")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/vip-submissions/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: value }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to save note");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  }

  return (
    <input
      type="text"
      value={value}
      disabled={saving}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      placeholder="Add a note…"
      className="w-full min-w-[160px] rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-charcoal placeholder:text-body-gray/60 hover:border-black/10 focus:border-black/20 focus:bg-white focus:outline-none disabled:opacity-60"
    />
  );
}

export function VipSubmissionsTable({
  submissions,
  ownerOptions,
}: {
  submissions: VipSubmission[];
  ownerOptions: string[];
}) {
  const ownerSelectOptions = useMemo(() => [...ownerOptions, "Unassigned"], [ownerOptions]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const rows = useMemo(() => {
    return submissions.filter((s) => {
      const applied = s.dateApplied.slice(0, 10);
      if (fromDate && applied < fromDate) return false;
      if (toDate && applied > toDate) return false;
      return true;
    });
  }, [submissions, fromDate, toDate]);

  return (
    <div className="overflow-x-auto rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <label className="flex items-center gap-1.5 text-body-gray">
          From
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-black/10 px-2 py-1 text-charcoal"
          />
        </label>
        <label className="flex items-center gap-1.5 text-body-gray">
          To
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-black/10 px-2 py-1 text-charcoal"
          />
        </label>
        {(fromDate || toDate) && (
          <button
            onClick={() => {
              setFromDate("");
              setToDate("");
            }}
            className="font-semibold text-charcoal underline"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-body-gray">
          {rows.length} of {submissions.length} submission{submissions.length === 1 ? "" : "s"}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-body-gray">
          {submissions.length === 0 ? "No VIP form submissions yet." : "No submissions in this date range."}
        </p>
      ) : (
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-body-gray">
              <th className="py-2 pr-4">Submission Date</th>
              <th className="py-2 pr-4">Contact Name</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Form Details</th>
              <th className="py-2 pr-4">Owner</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.contactId} className="border-b border-black/5">
                <td className="py-3 pr-4 whitespace-nowrap">
                  {/* Explicit "en-US" so this always reads mm/dd/yyyy,
                      regardless of the viewer's own system locale (which
                      otherwise renders it dd/mm/yyyy for some people). */}
                  {new Date(s.dateApplied).toLocaleDateString("en-US")}
                </td>
                <td className="py-3 pr-4 font-semibold text-charcoal">{s.name}</td>
                <td className="py-3 pr-4">{s.email ?? "—"}</td>
                <td className="py-3 pr-4 text-body-gray">{s.formDetails}</td>
                <td className="py-3 pr-4">
                  <OwnerSelect contactId={s.contactId} owner={s.owner} options={ownerSelectOptions} />
                </td>
                <td className="py-3 pr-4">
                  <StatusSelect contactId={s.contactId} status={s.status} />
                </td>
                <td className="py-3 pr-4">
                  <NotesCell contactId={s.contactId} notes={s.notes} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
