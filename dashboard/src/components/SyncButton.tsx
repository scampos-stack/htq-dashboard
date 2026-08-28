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
      const parts: string[] = [];
      if (data.woodpecker?.campaigns != null) {
        parts.push(`Woodpecker: ${data.woodpecker.campaigns} campaigns`);
      } else if (data.woodpecker?.error) {
        parts.push(`Woodpecker failed`);
      }
      if (data.woodpecker?.stepStatsError) {
        parts.push(`Step stats failed: ${data.woodpecker.stepStatsError}`);
      } else if (data.woodpecker?.stepSnapshots != null) {
        parts.push(`Step stats: ${data.woodpecker.stepSnapshots} rows`);
      }
      if (data.woodpecker?.prospectsError) {
        parts.push(`Prospects failed: ${data.woodpecker.prospectsError}`);
      } else if (data.woodpecker?.prospects != null) {
        parts.push(`Prospects: ${data.woodpecker.prospects}`);
      }
      if (data.keap?.campaigns != null) {
        parts.push(`Keap: ${data.keap.campaigns} automations`);
      } else if (data.keap?.error) {
        parts.push(`Keap failed: ${data.keap.error}`);
      }
      if (data.zendesk?.tickets != null) {
        parts.push(`Zendesk: ${data.zendesk.tickets} tickets`);
      } else if (data.zendesk?.error) {
        parts.push(`Zendesk failed: ${data.zendesk.error}`);
      }
      if (data.zendesk?.metricsError) {
        parts.push(`Zendesk metrics failed: ${data.zendesk.metricsError}`);
      } else if (data.zendesk?.metrics != null) {
        parts.push(`Zendesk metrics: ${data.zendesk.metrics}`);
      }

      setStatus("done");
      setMessage(parts.join(" · ") || "Synced");
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
