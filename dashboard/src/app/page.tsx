import { getCampaignsWithStats } from "@/lib/data";

function StatusPill({ status }: { status: string | null }) {
  const isRunning = status === "RUNNING";
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
        isRunning
          ? "bg-brand-green/15 text-brand-green-dark"
          : "bg-charcoal/10 text-charcoal"
      }`}
    >
      {status ?? "UNKNOWN"}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-bold text-charcoal font-heading">{value}</span>
      <span className="text-xs uppercase tracking-wide text-body-gray">{label}</span>
    </div>
  );
}

export default async function Home() {
  const campaigns = await getCampaignsWithStats();

  return (
    <div className="flex-1 bg-mist">
      <header className="border-b border-black/5 bg-white px-6 py-6 sm:px-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-body-gray">
          Marketing Dashboard
        </p>
        <h1 className="font-heading text-3xl font-bold">
          <span className="text-brand-green">HOMETOWN</span>
          <span className="text-charcoal">QUOTES</span>
        </h1>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
        <h2 className="mb-6 font-heading text-xl font-semibold text-charcoal">
          Woodpecker Campaigns
        </h2>

        {campaigns.length === 0 ? (
          <p className="text-body-gray">
            No campaigns yet — run the import scripts to load Woodpecker data.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="rounded-3xl border-l-4 border-brand-green bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <h3 className="font-heading text-lg font-semibold text-charcoal">
                    {c.name}
                  </h3>
                  <StatusPill status={c.status} />
                </div>

                {c.stats ? (
                  <div className="grid grid-cols-3 gap-4">
                    <Metric label="Sent" value={c.stats.sent.toLocaleString()} />
                    <Metric
                      label="Open rate"
                      value={
                        c.stats.opened_rate != null
                          ? `${c.stats.opened_rate}%`
                          : "—"
                      }
                    />
                    <Metric label="Clicked" value={c.stats.clicked.toLocaleString()} />
                    <Metric label="Delivered" value={c.stats.delivered.toLocaleString()} />
                    <Metric
                      label="Bounce rate"
                      value={
                        c.stats.bounce_rate != null ? `${c.stats.bounce_rate}%` : "—"
                      }
                    />
                    <Metric label="Responded" value={c.stats.responded.toLocaleString()} />
                  </div>
                ) : (
                  <p className="text-sm text-body-gray">No stats pulled yet.</p>
                )}

                {c.stats && (
                  <p className="mt-4 text-xs text-body-gray">
                    Last pulled {new Date(c.stats.pulled_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
