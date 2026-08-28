"use client";

import { useRouter, useSearchParams } from "next/navigation";

const SOURCES = [
  { value: "all", label: "All Sources", dot: "bg-charcoal" },
  { value: "woodpecker", label: "Woodpecker", dot: "bg-brand-green" },
  { value: "keap_automations", label: "Keap Automations", dot: "bg-amber-500" },
  { value: "keap_broadcasts", label: "Keap Broadcasts", dot: "bg-sky-500" },
  { value: "channel_blend", label: "Channel Blend", dot: "bg-violet-500" },
  { value: "zendesk", label: "Zendesk", dot: "bg-sky-500" },
];

export function SourceNav() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("source") ?? "all";

  return (
    <nav className="sticky top-6 flex shrink-0 flex-col gap-1 self-start sm:w-52">
      {SOURCES.map((s) => {
        const active = current === s.value;
        return (
          <button
            key={s.value}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              if (s.value === "all") {
                params.delete("source");
              } else {
                params.set("source", s.value);
              }
              router.push(`/?${params.toString()}`);
            }}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-left text-sm font-semibold transition-colors ${
              active
                ? "bg-charcoal text-white"
                : "bg-white text-charcoal hover:bg-charcoal/5"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${s.dot}`} />
            {s.label}
          </button>
        );
      })}
    </nav>
  );
}
