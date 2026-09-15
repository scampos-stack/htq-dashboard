// Posts a plain-text message to a Microsoft Teams Incoming Webhook.
// Configure TEAMS_ASSIGNEE_WEBHOOK_URL in Vercel with the webhook URL from
// Teams: channel -> "..." -> Connectors -> Incoming Webhook (or Workflows,
// on tenants where classic connectors are retired). Silently no-ops if the
// env var isn't set, rather than failing the request that triggered it —
// a missing webhook shouldn't block someone from saving a draft edit.
export async function notifyTeams(text: string): Promise<void> {
  const webhookUrl = process.env.TEAMS_ASSIGNEE_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      console.error("[teams-notify] webhook returned", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("[teams-notify] failed:", err);
  }
}
