// The catalog of panels that can be added to a saved Custom View (see
// migration 032 / DashboardViewsManager / DashboardWidget in page.tsx).
// Deliberately starts with the self-contained, data-only panels — ones that
// just take already-fetched data as props, with no filters of their own
// tied to URL params — so a widget renders the same wherever it's placed.
// Add to this list (and the matching case in DashboardWidget) to make a new
// panel pickable; nothing else needs to change.
export type WidgetWidth = "half" | "full";

export const WIDGET_CATALOG = [
  { id: "overview.sourceMixDonut", label: "Source Mix (Sent)", tab: "Overview", defaultWidth: "half" },
  { id: "overview.byCarrier", label: "By Carrier", tab: "Overview", defaultWidth: "half" },
  { id: "overview.vipSubmissions", label: "VIP Form Submissions", tab: "Overview", defaultWidth: "full" },
  { id: "overview.sourceSummaryTable", label: "All Sources Summary Table", tab: "Overview", defaultWidth: "full" },
  { id: "overview.allSourcesDigest", label: "Executive Digest (AI)", tab: "Overview", defaultWidth: "full" },
  { id: "overview.bookedCalls", label: "Booked Calls", tab: "Overview", defaultWidth: "full" },
  { id: "marketing.keapBroadcastsLog", label: "Keap Broadcasts Log", tab: "Marketing", defaultWidth: "full" },
  { id: "marketing.channelBlendPatterns", label: "Channel Blend Patterns (AI)", tab: "Marketing", defaultWidth: "half" },
  { id: "support.zendeskCsatTrend", label: "Zendesk CSAT Trend", tab: "Support", defaultWidth: "half" },
  { id: "support.zendeskCsatByAgent", label: "Zendesk CSAT by Agent", tab: "Support", defaultWidth: "half" },
] as const satisfies { id: string; label: string; tab: string; defaultWidth: WidgetWidth }[];

export type WidgetId = (typeof WIDGET_CATALOG)[number]["id"];

export const WIDGET_LABELS: Record<string, string> = Object.fromEntries(
  WIDGET_CATALOG.map((w) => [w.id, w.label])
);

export const WIDGET_DEFAULT_WIDTHS: Record<string, WidgetWidth> = Object.fromEntries(
  WIDGET_CATALOG.map((w) => [w.id, w.defaultWidth])
);

export function isKnownWidgetId(id: string): id is WidgetId {
  return WIDGET_CATALOG.some((w) => w.id === id);
}

// A saved view's widgetIds entries are the bare id ("overview.byCarrier")
// for a full-width widget, or id + ":half" for a half-width one — avoids a
// second DB column just to carry one bit of layout per widget.
export function parseWidgetToken(token: string): { id: string; width: WidgetWidth } {
  const [id, widthPart] = token.split(":");
  return { id, width: widthPart === "half" ? "half" : "full" };
}

export function makeWidgetToken(id: string, width: WidgetWidth): string {
  return width === "half" ? `${id}:half` : id;
}
