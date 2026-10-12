"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { WIDGET_CATALOG } from "@/lib/dashboard-widgets";
import type { DashboardView } from "@/lib/data";

const TABS = [...new Set(WIDGET_CATALOG.map((w) => w.tab))];

export function DashboardViewsManager({ views }: { views: DashboardView[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startNew() {
    setEditingId(null);
    setName("");
    setSelected([]);
    setError(null);
    setOpen(true);
  }

  function startEdit(v: DashboardView) {
    setEditingId(v.id);
    setName(v.name);
    setSelected(v.widgetIds);
    setError(null);
    setOpen(true);
  }

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSave() {
    if (!name.trim()) return setError("Give the view a name.");
    if (selected.length === 0) return setError("Pick at least one widget.");
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(editingId ? `/api/dashboard-views/${editingId}` : "/api/dashboard-views", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, widgetIds: selected }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to save view");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save view");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(v: DashboardView) {
    if (!confirm(`Delete the "${v.name}" view? This can't be undone.`)) return;
    try {
      const res = await fetch(`/api/dashboard-views/${v.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to delete view");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete view");
    }
  }

  return (
    <div>
      <button
        onClick={startNew}
        className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-charcoal shadow-sm hover:bg-charcoal/5"
      >
        + New View
      </button>

      {open && (
        <div className="mt-3 rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-heading text-base font-semibold text-charcoal">
              {editingId ? "Edit View" : "New Custom View"}
            </h3>
            <button onClick={() => setOpen(false)} className="text-sm text-body-gray hover:text-charcoal">
              Cancel
            </button>
          </div>
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <label className="mb-4 block text-xs font-semibold text-body-gray">
            View name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sales focus"
              className="mt-1 w-full max-w-sm rounded-lg border border-black/10 px-3 py-2 text-sm text-charcoal"
            />
          </label>

          <p className="mb-2 text-xs font-semibold text-body-gray">
            Pick widgets from any tab — reorder them by dragging once the view is open.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {TABS.map((tab) => (
              <div key={tab}>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-body-gray">{tab}</h4>
                <div className="flex flex-col gap-1.5">
                  {WIDGET_CATALOG.filter((w) => w.tab === tab).map((w) => (
                    <label key={w.id} className="flex items-center gap-2 text-sm text-charcoal">
                      <input type="checkbox" checked={selected.includes(w.id)} onChange={() => toggle(w.id)} />
                      {w.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : editingId ? "Save Changes" : "Create View"}
            </button>
          </div>
        </div>
      )}

      {views.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {views.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs"
            >
              <span className="font-semibold text-charcoal">{v.name}</span>
              <button onClick={() => startEdit(v)} className="text-body-gray underline hover:text-charcoal">
                Edit
              </button>
              <button onClick={() => handleDelete(v)} className="text-red-600 underline hover:text-red-700">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
