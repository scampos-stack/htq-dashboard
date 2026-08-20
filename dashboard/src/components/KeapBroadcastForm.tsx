"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CARRIERS = [
  "Independent",
  "Farmers",
  "State Farm",
  "Country Financial",
  "Liberty Mutual",
  "AAA",
  "Allstate",
  "American Family",
  "General",
  "Blend (Multi-Carrier)",
];

const EMPTY = {
  campaignName: "",
  dateSent: "",
  emailsDelivered: "",
  opens: "",
  clicks: "",
  replies: "",
  carrier: "General",
};

export function KeapBroadcastForm() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): string | null {
    if (!form.campaignName.trim()) return "Campaign name is required.";
    if (!form.dateSent) return "Date sent is required.";
    for (const [label, val] of [
      ["Emails delivered", form.emailsDelivered],
      ["Opens", form.opens],
      ["Clicks", form.clicks],
      ["Replies", form.replies],
    ]) {
      if (val === "" || Number.isNaN(Number(val)) || Number(val) < 0) {
        return `${label} must be a non-negative number.`;
      }
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/keap-broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to save broadcast");
      }
      setForm(EMPTY);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save broadcast");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-3xl bg-white p-6 shadow-sm"
    >
      <h3 className="mb-4 font-heading text-base font-semibold text-charcoal">
        Log a Broadcast
      </h3>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="text-xs font-semibold text-body-gray sm:col-span-2">
          Campaign Name
          <input
            type="text"
            value={form.campaignName}
            onChange={(e) => set("campaignName", e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-charcoal"
          />
        </label>
        <label className="text-xs font-semibold text-body-gray">
          Carrier
          <select
            value={form.carrier}
            onChange={(e) => set("carrier", e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-charcoal"
          >
            {CARRIERS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-body-gray">
          Date Sent
          <input
            type="date"
            value={form.dateSent}
            onChange={(e) => set("dateSent", e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-charcoal"
          />
        </label>
        <label className="text-xs font-semibold text-body-gray">
          Emails Delivered
          <input
            type="number"
            min="0"
            value={form.emailsDelivered}
            onChange={(e) => set("emailsDelivered", e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-charcoal"
          />
        </label>
        <label className="text-xs font-semibold text-body-gray">
          Opens
          <input
            type="number"
            min="0"
            value={form.opens}
            onChange={(e) => set("opens", e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-charcoal"
          />
        </label>
        <label className="text-xs font-semibold text-body-gray">
          Clicks
          <input
            type="number"
            min="0"
            value={form.clicks}
            onChange={(e) => set("clicks", e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-charcoal"
          />
        </label>
        <label className="text-xs font-semibold text-body-gray">
          Replies
          <input
            type="number"
            min="0"
            value={form.replies}
            onChange={(e) => set("replies", e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-charcoal"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-4 rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-600 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Add Broadcast"}
      </button>
    </form>
  );
}
