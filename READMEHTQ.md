# HTQ — HometownQuotes

First project: a marketing results dashboard for the user's marketing work at HometownQuotes.
Tracks both engagement metrics (opens, clicks, replies) and pipeline outcomes (leads, conversions)
side by side, across multiple outreach channels.

## Data sources

- **Keap** — email broadcasts AND automations. Automations split into **nurture** vs **lead gen** —
  these need to stay distinguishable, not lumped together.
- **Woodpecker** — mass / cold email campaigns.
- **Zendesk** — mostly customer support, but not purely support; may carry marketing-relevant signal.
- **JustCall.io** — call tracking.
- **Teamwork** — manual outreach / channel blend (non-automated activity tracked here).
- Architecture should stay open to adding new sources later — don't hardcode to just this list.

## Data access

API keys per platform (not manual CSV exports). User has or can get credentials for Keap and
Woodpecker at minimum.

## Branding

Extracted color/type/logo/UI reference: [`branding.md`](branding.md).

## Open questions

- [ ] Exact per-source metrics to surface (e.g. Zendesk: ticket volume vs. specific tags; JustCall:
      call count/duration/outcome; Teamwork: which activity fields count as "outreach")
- [ ] Refresh cadence — real-time, daily, weekly?
- [ ] Who else views this dashboard, if anyone besides the user?
- [ ] API credentials — do they already exist somewhere, or need to be created per platform?
