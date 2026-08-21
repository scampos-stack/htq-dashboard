"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type DispositionRowData = {
  id: number;
  category: string;
  leadName: string | null;
  state: string | null;
  details: string | null;
};

export function DispositionRow({ row }: { row: DispositionRowData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    category: row.category,
    leadName: row.leadName ?? "",
    state: row.state ?? "",
    details: row.details ?? "",
  });

  async function handleSave() {
    if (!form.category.trim()) {
      setError("Category is required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/channel-blend/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to save");
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete this ${row.category} entry? This can't be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/channel-blend/${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to delete");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <tr className="border-b border-black/5 bg-mist/50">
        <td className="py-2 pr-4" colSpan={4}>
          {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <input
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="Category"
              className="rounded-lg border border-black/10 px-2 py-1 text-sm"
            />
            <input
              value={form.leadName}
              onChange={(e) => setForm((f) => ({ ...f, leadName: e.target.value }))}
              placeholder="Lead name"
              className="rounded-lg border border-black/10 px-2 py-1 text-sm"
            />
            <input
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              placeholder="State"
              className="rounded-lg border border-black/10 px-2 py-1 text-sm"
            />
            <input
              value={form.details}
              onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
              placeholder="Details"
              className="rounded-lg border border-black/10 px-2 py-1 text-sm"
            />
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-charcoal px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-full px-3 py-1 text-xs font-semibold text-body-gray"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-black/5">
      <td className="py-3 pr-4 font-semibold text-charcoal">{row.category}</td>
      <td className="py-3 pr-4">{row.leadName ?? "—"}</td>
      <td className="py-3 pr-4">{row.state ?? "—"}</td>
      <td className="py-3 pr-4 max-w-xs truncate" title={row.details ?? ""}>
        {row.details ?? "—"}
      </td>
      <td className="py-3 pr-4 whitespace-nowrap">
        <button
          onClick={() => setEditing(true)}
          className="mr-3 text-xs font-semibold text-charcoal underline"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs font-semibold text-red-600 underline disabled:opacity-50"
        >
          {deleting ? "…" : "Delete"}
        </button>
      </td>
    </tr>
  );
}
