"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactElement } from "react";

// Reorders already-rendered widget panels by dragging them (native HTML5
// drag-and-drop, no new dependency) and persists the new order back to the
// saved view. Takes rendered children instead of raw data so this component
// never needs the widgets' underlying data — only each child's key (the
// widget id) and its position.
export function DashboardViewDragList({
  viewId,
  initialOrder,
  children,
}: {
  viewId: number;
  initialOrder: string[];
  children: ReactElement[];
}) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [dragId, setDragId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const byId = new Map(children.map((c) => [String(c.key), c]));

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    setOrder((prev) => {
      const next = prev.filter((id) => id !== dragId);
      const targetIdx = next.indexOf(targetId);
      next.splice(targetIdx, 0, dragId);
      return next;
    });
    setDragId(null);
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard-views/${viewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgetIds: order }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to save layout");
      setDirty(false);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save layout");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {dirty && (
        <div className="sticky top-2 z-10 flex items-center justify-between gap-3 rounded-2xl bg-charcoal px-4 py-2.5 text-sm text-white shadow-lg">
          <span>Layout changed — save to keep this order for everyone.</span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setOrder(initialOrder);
                setDirty(false);
              }}
              className="rounded-full px-3 py-1 text-xs font-semibold text-white/80 hover:text-white"
            >
              Revert
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-brand-green px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save layout"}
            </button>
          </div>
        </div>
      )}
      {order.map((id) => {
        const child = byId.get(id);
        if (!child) return null;
        return (
          <div
            key={id}
            draggable
            onDragStart={() => setDragId(id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(id)}
            className={`group relative rounded-3xl transition-opacity ${dragId === id ? "opacity-40" : ""}`}
          >
            <div
              className="absolute -left-2 top-1/2 hidden -translate-y-1/2 cursor-grab select-none rounded-full bg-white px-1.5 py-3 text-body-gray shadow-sm group-hover:block active:cursor-grabbing"
              title="Drag to reorder"
            >
              ⠿
            </div>
            {child}
          </div>
        );
      })}
    </div>
  );
}
