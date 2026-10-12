"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  WIDGET_CATALOG,
  WIDGET_LABELS,
  WIDGET_DEFAULT_WIDTHS,
  parseWidgetToken,
  makeWidgetToken,
  type WidgetWidth,
} from "@/lib/dashboard-widgets";
import type { DashboardView } from "@/lib/data";

const TABS = [...new Set(WIDGET_CATALOG.map((w) => w.tab))];

function baseId(token: string): string {
  return parseWidgetToken(token).id;
}

export function DashboardViewsManager({
  views,
  activeViewId = null,
}: {
  views: DashboardView[];
  // The view currently open on the page (if any) — shows inline Edit/Delete
  // for just that one, instead of listing every saved view's controls on
  // screen at once.
  activeViewId?: number | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeView = activeViewId != null ? (views.find((v) => v.id === activeViewId) ?? null) : null;
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState(false);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

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

  function toggle(id: string, defaultWidth: WidgetWidth) {
    setSelected((prev) =>
      prev.some((t) => baseId(t) === id) ? prev.filter((t) => baseId(t) !== id) : [...prev, makeWidgetToken(id, defaultWidth)]
    );
  }

  function remove(token: string) {
    setSelected((prev) => prev.filter((t) => t !== token));
  }

  function setWidth(token: string, width: WidgetWidth) {
    setSelected((prev) => prev.map((t) => (t === token ? makeWidgetToken(baseId(t), width) : t)));
  }

  // Dropping a catalog widget onto the drop zone adds it (at a specific spot
  // if dropped between two already-added chips, else at the end), keeping
  // its current width if it's already in the view. Dropping an
  // already-added chip onto another one reorders instead of duplicating.
  function handleDropOnZone(atIndex?: number) {
    setDragOverZone(false);
    setDropIndex(null);
    if (!dragId) return;
    const draggedBase = baseId(dragId);
    setSelected((prev) => {
      const withoutDragged = prev.filter((t) => baseId(t) !== draggedBase);
      const insertAt = atIndex ?? withoutDragged.length;
      const next = [...withoutDragged];
      next.splice(insertAt, 0, dragId);
      return next;
    });
    setDragId(null);
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
      // Deleting the view currently open leaves a dead "view-<id>" in the
      // URL — back out to Overview instead of showing an empty page.
      if (activeViewId === v.id) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("arrangement");
        router.push(`/?${params.toString()}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete view");
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {activeView && (
          <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs">
            <button onClick={() => startEdit(activeView)} className="font-semibold text-charcoal hover:underline">
              Edit View
            </button>
            <span className="text-black/15">|</span>
            <button onClick={() => handleDelete(activeView)} className="text-red-600 hover:underline">
              Delete
            </button>
          </div>
        )}
        <button
          onClick={startNew}
          className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-charcoal shadow-sm hover:bg-charcoal/5"
        >
          + New View
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-[min(92vw,760px)] rounded-3xl border border-black/10 bg-white p-5 shadow-lg">
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
            Drag a widget into the view, or click it to add — drag chips inside the view to set their order.
          </p>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {TABS.map((tab) => (
                <div key={tab}>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-body-gray">{tab}</h4>
                  <div className="flex flex-col gap-1.5">
                    {WIDGET_CATALOG.filter((w) => w.tab === tab).map((w) => {
                      const added = selected.some((t) => baseId(t) === w.id);
                      return (
                        <div
                          key={w.id}
                          draggable
                          onDragStart={() => {
                            const existing = selected.find((t) => baseId(t) === w.id);
                            setDragId(existing ?? makeWidgetToken(w.id, WIDGET_DEFAULT_WIDTHS[w.id] ?? "full"));
                          }}
                          onDragEnd={() => setDragId(null)}
                          onClick={() => toggle(w.id, WIDGET_DEFAULT_WIDTHS[w.id] ?? "full")}
                          className={`cursor-grab select-none rounded-lg border px-2.5 py-1.5 text-sm transition-colors active:cursor-grabbing ${
                            added
                              ? "border-brand-green/40 bg-brand-green/10 text-brand-green-dark"
                              : "border-black/10 bg-white text-charcoal hover:bg-charcoal/5"
                          }`}
                        >
                          {added ? "✓ " : ""}
                          {w.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-body-gray">Your View</h4>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverZone(true);
                }}
                onDragLeave={() => setDragOverZone(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDropOnZone();
                }}
                className={`flex min-h-[140px] flex-col gap-1.5 rounded-2xl border-2 border-dashed p-3 transition-colors ${
                  dragOverZone ? "border-brand-green bg-brand-green/5" : "border-black/15"
                }`}
              >
                {selected.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center text-center text-xs text-body-gray">
                    Drag a widget here, or click one on the left
                  </div>
                ) : (
                  selected.map((token, i) => {
                    const { id, width } = parseWidgetToken(token);
                    return (
                      <div
                        key={token}
                        draggable
                        onDragStart={() => setDragId(token)}
                        onDragEnd={() => {
                          setDragId(null);
                          setDropIndex(null);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDropIndex(i);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDropOnZone(i);
                        }}
                        className={`flex items-center justify-between gap-2 rounded-lg border bg-white px-2.5 py-1.5 text-sm text-charcoal shadow-sm transition-opacity ${
                          dragId === token ? "opacity-40" : ""
                        } ${dropIndex === i && dragId && dragId !== token ? "border-brand-green" : "border-black/10"}`}
                      >
                        <span className="cursor-grab select-none truncate active:cursor-grabbing">
                          ⠿ {WIDGET_LABELS[id] ?? id}
                        </span>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={() => setWidth(token, width === "half" ? "full" : "half")}
                            title="Toggle how much row width this widget takes"
                            className="rounded-full border border-black/10 px-2 py-0.5 text-[10px] font-semibold text-body-gray hover:bg-charcoal/5"
                          >
                            {width === "half" ? "Half" : "Full"}
                          </button>
                          <button
                            onClick={() => remove(token)}
                            className="text-body-gray hover:text-red-600"
                            aria-label={`Remove ${WIDGET_LABELS[id] ?? id}`}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
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
    </div>
  );
}
