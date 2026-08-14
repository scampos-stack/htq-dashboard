import { supabaseServer } from "./supabase-server";

function domainOf(mailbox: string | null): string {
  if (!mailbox || !mailbox.includes("@")) return "unknown";
  return mailbox.split("@")[1];
}

export type DomainTotals = {
  domain: string;
  sent: number;
  delivered: number;
  bounceRate: number | null;
};

export type DomainHealthOverview = {
  totalSent: number;
  totalDelivered: number;
  overallBounceRate: number | null;
  domains: DomainTotals[];
  earliestDate: string | null;
  latestDate: string | null;
};

// Woodpecker's live API only returns account-wide totals, not per-mailbox
// breakdown — per-mailbox/domain data only comes from the manual CSV export
// (scripts/import-woodpecker.js), so this reflects whatever date range that
// CSV covered, not necessarily "up to today."
export async function getDomainHealthOverview(): Promise<DomainHealthOverview> {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("campaign_stats_daily")
    .select("mailbox, sent, delivered, sent_date")
    .order("sent_date", { ascending: true });
  if (error) throw error;

  const rows = data ?? [];
  if (rows.length === 0) {
    return {
      totalSent: 0,
      totalDelivered: 0,
      overallBounceRate: null,
      domains: [],
      earliestDate: null,
      latestDate: null,
    };
  }

  const byDomain = new Map<string, { sent: number; delivered: number }>();
  let totalSent = 0;
  let totalDelivered = 0;

  for (const row of rows) {
    const domain = domainOf(row.mailbox);
    const existing = byDomain.get(domain) ?? { sent: 0, delivered: 0 };
    existing.sent += row.sent;
    existing.delivered += row.delivered;
    byDomain.set(domain, existing);
    totalSent += row.sent;
    totalDelivered += row.delivered;
  }

  const domains: DomainTotals[] = [...byDomain.entries()]
    .map(([domain, t]) => ({
      domain,
      sent: t.sent,
      delivered: t.delivered,
      bounceRate: t.sent ? ((t.sent - t.delivered) / t.sent) * 100 : null,
    }))
    .sort((a, b) => b.sent - a.sent);

  return {
    totalSent,
    totalDelivered,
    overallBounceRate: totalSent
      ? ((totalSent - totalDelivered) / totalSent) * 100
      : null,
    domains,
    earliestDate: rows[0].sent_date,
    latestDate: rows[rows.length - 1].sent_date,
  };
}

export type DomainTrendPoint = { date: string; bounceRate: number };
export type DomainTrendSeries = { domain: string; points: DomainTrendPoint[] };

export async function getDomainHealthTrend(): Promise<DomainTrendSeries[]> {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("campaign_stats_daily")
    .select("mailbox, sent, delivered, sent_date")
    .order("sent_date", { ascending: true });
  if (error) throw error;

  const rows = data ?? [];
  // domain -> date -> totals
  const byDomainDate = new Map<
    string,
    Map<string, { sent: number; delivered: number }>
  >();

  for (const row of rows) {
    const domain = domainOf(row.mailbox);
    const byDate = byDomainDate.get(domain) ?? new Map();
    const existing = byDate.get(row.sent_date) ?? { sent: 0, delivered: 0 };
    existing.sent += row.sent;
    existing.delivered += row.delivered;
    byDate.set(row.sent_date, existing);
    byDomainDate.set(domain, byDate);
  }

  // Only keep the top domains by volume so the chart stays legible.
  const domainVolume = [...byDomainDate.entries()]
    .map(([domain, byDate]) => ({
      domain,
      total: [...byDate.values()].reduce((sum, v) => sum + v.sent, 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 4)
    .map((d) => d.domain);

  return domainVolume.map((domain) => {
    const byDate = byDomainDate.get(domain)!;
    const points = [...byDate.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, t]) => ({
        date,
        bounceRate: t.sent ? ((t.sent - t.delivered) / t.sent) * 100 : 0,
      }));
    return { domain, points };
  });
}
