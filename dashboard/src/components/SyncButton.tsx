"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Status = "idle" | "syncing" | "done" | "error";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callSync(path: string): Promise<any> {
  try {
    const res = await fetch(path, { method: "POST" });
    const bodyText = await res.text();
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch {
      // Non-JSON body means the request never reached our route handler
      // (e.g. a platform timeout page) — surface whatever text came back
      // instead of a cryptic "Unexpected token" parse error.
      return {
        ok: false,
        error: `Did not return a valid response (HTTP ${res.status}): ${bodyText.slice(0, 200)}`,
      };
    }
    return data;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Request failed" };
  }
}

export function SyncButton() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setStatus("syncing");
    setMessage(null);

    // Separate requests (not one combined endpoint) — each source gets its
    // own function timeout instead of all four sharing one budget, so a
    // slow source (e.g. a large Keap email backlog) can't sink the others.
    const [woodpecker, keap, keapEmails, zendesk, justcall] = await Promise.all([
      callSync("/api/sync/woodpecker"),
      callSync("/api/sync/keap"),
      callSync("/api/sync/keap-emails"),
      callSync("/api/sync/zendesk"),
      callSync("/api/sync/justcall"),
    ]);

    const parts: string[] = [];

    if (woodpecker.campaigns != null) {
      parts.push(`Woodpecker: ${woodpecker.campaigns} campaigns`);
    } else if (woodpecker.error) {
      parts.push(`Woodpecker failed: ${woodpecker.error}`);
    }
    if (woodpecker.stepStatsError) {
      parts.push(`Step stats failed: ${woodpecker.stepStatsError}`);
    } else if (woodpecker.stepSnapshots != null) {
      parts.push(`Step stats: ${woodpecker.stepSnapshots} rows`);
    }
    if (woodpecker.prospectsError) {
      parts.push(`Prospects failed: ${woodpecker.prospectsError}`);
    } else if (woodpecker.prospects != null) {
      parts.push(`Prospects: ${woodpecker.prospects}`);
    }

    if (keap.campaigns != null) {
      parts.push(`Keap: ${keap.campaigns} automations`);
    } else if (keap.error) {
      parts.push(`Keap failed: ${keap.error}`);
    }

    if (keapEmails.capped) {
      parts.push(`Keap emails: ${keapEmails.sent} (hit page cap, real total is higher)`);
    } else if (keapEmails.sent != null) {
      parts.push(`Keap emails: ${keapEmails.sent}`);
    } else if (keapEmails.error) {
      parts.push(`Keap emails failed: ${keapEmails.error}`);
    }

    if (zendesk.tickets != null) {
      parts.push(`Zendesk: ${zendesk.tickets} tickets`);
    } else if (zendesk.error) {
      parts.push(`Zendesk failed: ${zendesk.error}`);
    }
    if (zendesk.metricsError) {
      parts.push(`Zendesk metrics failed: ${zendesk.metricsError}`);
    } else if (zendesk.metrics != null) {
      parts.push(`Zendesk metrics: ${zendesk.metrics}`);
    }

    if (justcall.calls != null) {
      parts.push(
        `JustCall: ${justcall.calls} calls${justcall.cappedByRateLimit ? " (still catching up)" : ""}`
      );
    } else if (justcall.error) {
      parts.push(`JustCall failed: ${justcall.error}`);
    }

    const anyOk = [woodpecker, keap, keapEmails, zendesk, justcall].some((r) => r.ok !== false);
    setStatus(anyOk ? "done" : "error");
    setMessage(parts.join(" · ") || "Synced");
    router.refresh();
    setTimeout(() => setStatus("idle"), 3000);
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
