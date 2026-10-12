// The catalog of panels that can be added to a saved Custom View (see
// migration 032 / DashboardViewsManager / DashboardWidget in page.tsx).
// Deliberately starts with the self-contained, data-only panels — ones that
// just take already-fetched data as props, with no filters of their own
// tied to URL params — so a widget renders the same wherever it's placed.
// Add to this list (and the matching case in DashboardWidget) to make a new
// panel pickable; nothing else needs to change.
export const WIDGET_CATALOG = [
  { id: "overview.sourceMixDonut", label: "Source Mix (Sent)", tab: "Overview" },
  { id: "overview.byCarrier", label: "By Carrier", tab: "Overview" },
  { id: "overview.vipSubmissions", label: "VIP Form Submissions", tab: "Overview" },
  { id: "overview.sourceSummaryTable", label: "All Sources Summary Table", tab: "Overview" },
  { id: "overview.allSourcesDigest", label: "Executive Digest (AI)", tab: "Overview" },
  { id: "overview.bookedCalls", label: "Booked Calls", tab: "Overview" },
  { id: "marketing.keapBroadcastsLog", label: "Keap Broadcasts Log", tab: "Marketing" },
  { id: "marketing.channelBlendPatterns", label: "Channel Blend Patterns (AI)", tab: "Marketing" },
  { id: "support.zendeskCsatTrend", label: "Zendesk CSAT Trend", tab: "Support" },
  { id: "support.zendeskCsatByAgent", label: "Zendesk CSAT by Agent", tab: "Support" },
] as const;

export type WidgetId = (typeof WIDGET_CATALOG)[number]["id"];

export const WIDGET_LABELS: Record<string, string> = Object.fromEntries(
  WIDGET_CATALOG.map((w) => [w.id, w.label])
);

export function isKnownWidgetId(id: string): id is WidgetId {
  return WIDGET_CATALOG.some((w) => w.id === id);
}
