"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Status = "idle" | "syncing" | "done" | "error";

export function SyncButton() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setStatus("syncing");
    setMessage(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Sync failed");
      }
      setStatus("done");
      setMessage(`Synced ${data.campaigns} campaigns`);
      router.refresh();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSync}
        disabled={status === "syncing"}
        className="inline-flex items-center gap-2 rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-green-dark disabled:opacity-60"
      >
        {status === "syncing" ? "Syncing…" : "Sync Now"}
      </button>
      {message && (
        <span
          className={`text-xs ${
            status === "error" ? "text-red-600" : "text-body-gray"
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
}
