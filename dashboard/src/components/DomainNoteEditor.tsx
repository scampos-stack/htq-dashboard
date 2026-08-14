"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DomainNoteEditor({
  domain,
  initialNote,
}: {
  domain: string;
  initialNote: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialNote ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/domain-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, note: value }),
      });
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-left text-xs text-body-gray hover:text-charcoal"
      >
        {initialNote ? (
          <span className="italic">&quot;{initialNote}&quot;</span>
        ) : (
          <span className="underline">+ Add note</span>
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. Expected — State Farm mailbox has a release delay"
        rows={2}
        className="w-full min-w-[220px] rounded-lg border border-black/10 p-2 text-xs"
      />
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-full bg-charcoal px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setValue(initialNote ?? "");
          }}
          className="rounded-full px-3 py-1 text-xs font-semibold text-body-gray"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
