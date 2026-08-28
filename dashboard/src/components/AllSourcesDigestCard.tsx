"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AllSourcesDigest } from "@/lib/data";

type DigestSection = { title: string; body: string };

// The prompt asks Claude for "PERIOD: ..." as line 1 and "## Section Title"
// markers before each paragraph, so this renders as real headings instead
// of one flat wall of text. Falls back to plain text for older digests
// generated before this format existed.
function parseDigest(text: string): { period: string | null; sections: DigestSection[] } {
  const lines = text.split("\n");
  let period: string | null = null;
  const sections: DigestSection[] = [];
  let current: DigestSection | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!period && line.startsWith("PERIOD:")) {
      period = line.replace(/^PERIOD:\s*/, "");
      continue;
    }
    if (line.startsWith("## ")) {
      current = { title: line.slice(3).trim(), body: "" };
      sections.push(current);
      continue;
    }
    if (!line) continue;
    if (current) {
      current.body = current.body ? `${current.body} ${line}` : line;
    }
  }

  return { period, sections };
}

export function AllSourcesDigestCard({ digest }: { digest: AllSourcesDigest }) {
  const router = useRouter();
  const [period, setPeriod] = useState("30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      let since: Date;
      let until: Date | undefined;
      if (period === "custom" && customFrom) {
        since = new Date(customFrom);
        until = customTo ? new Date(customTo) : undefined;
      } else {
        since = new Date();
        since.setDate(since.getDate() - Number(period));
      }

      const res = await fetch("/api/all-sources/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          since: since.toISOString(),
          until: until?.toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to generate digest");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate digest");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mb-6 rounded-3xl border-l-4 border-charcoal bg-white p-6 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-base font-semibold text-charcoal">
          Executive Digest (AI Summary)
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal shadow-sm"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="custom">Custom range</option>
          </select>
          {period === "custom" && (
            <>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-charcoal shadow-sm"
              />
              <span className="text-xs text-body-gray">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-charcoal shadow-sm"
              />
            </>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating || (period === "custom" && !customFrom)}
            className="text-xs font-semibold text-charcoal underline disabled:opacity-50"
          >
            {generating ? "Generating…" : digest ? "Regenerate" : "Generate"}
          </button>
        </div>
      </div>

      {digest ? (
        <>
          {(() => {
            const { period, sections } = parseDigest(digest.summary);
            if (sections.length === 0) {
              // Older digest generated before the "## Section" format existed.
              return (
                <p className="whitespace-pre-line text-sm leading-relaxed text-charcoal">
                  {digest.summary}
                </p>
              );
            }
            return (
              <div>
                {period && (
                  <span className="mb-4 inline-block rounded-full bg-charcoal/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-body-gray">
                    {period}
                  </span>
                )}
                <div className="flex flex-col gap-5">
                  {sections.map((s) => (
                    <div key={s.title}>
                      <h4 className="mb-1.5 font-heading text-sm font-bold uppercase tracking-wide text-charcoal">
                        {s.title}
                      </h4>
                      <p className="text-sm leading-relaxed text-charcoal">{s.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          <p className="mt-4 text-xs text-body-gray">
            Generated {new Date(digest.generatedAt).toLocaleString()}
          </p>
        </>
      ) : (
        <p className="text-sm text-body-gray">
          No digest yet — pick a period above and click Generate.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
