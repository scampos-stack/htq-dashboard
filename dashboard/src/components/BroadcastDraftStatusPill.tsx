import type { BroadcastDraftStatus } from "@/lib/data";

const STATUS_STYLE: Record<BroadcastDraftStatus, { label: string; className: string; dot: string }> = {
  not_started: { label: "Not Started", className: "bg-charcoal/10 text-charcoal", dot: "bg-body-gray" },
  writing: { label: "Writing", className: "bg-amber-500/15 text-amber-700", dot: "bg-amber-500" },
  for_approval: { label: "For Approval", className: "bg-sky-500/15 text-sky-700", dot: "bg-sky-500" },
  approved: { label: "Approved", className: "bg-brand-green/15 text-brand-green-dark", dot: "bg-brand-green-dark" },
  sent: { label: "Sent", className: "bg-violet-500/15 text-violet-700", dot: "bg-violet-500" },
};

export function BroadcastDraftStatusPill({ status }: { status: BroadcastDraftStatus }) {
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.not_started;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${style.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}
