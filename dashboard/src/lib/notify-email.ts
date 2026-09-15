// Maps the fixed assignee names (see ASSIGNEE_OPTIONS in
// BroadcastDraftForm/BroadcastDraftAssigneeSelect) to a real inbox — set via
// env vars rather than hardcoded so recipients can change without a code
// deploy. A name with no configured address just doesn't get emailed.
const ASSIGNEE_EMAILS: Record<string, string | undefined> = {
  Paula: process.env.ASSIGNEE_EMAIL_PAULA,
  Sarah: process.env.ASSIGNEE_EMAIL_SARAH,
  Mohammed: process.env.ASSIGNEE_EMAIL_MOHAMMED,
};

// Sends via a Make.com scenario (Webhook -> Microsoft 365 Email/Outlook)
// instead of a third-party email API — Teams webhooks were blocked on this
// tenant without a Premium Power Automate plan, and this reuses Make (which
// the account already has) plus a real Outlook connection instead of
// needing a new service + DNS domain verification.
// Configure MAKE_ASSIGNEE_EMAIL_WEBHOOK_URL in Vercel with the webhook URL
// from the Make scenario.
export async function notifyAssigneeByEmail(
  assignee: string,
  subject: string,
  body: string
): Promise<void> {
  const webhookUrl = process.env.MAKE_ASSIGNEE_EMAIL_WEBHOOK_URL;
  const to = ASSIGNEE_EMAILS[assignee];
  console.log(
    "[notify-email] attempt:",
    JSON.stringify({ assignee, hasWebhookUrl: !!webhookUrl, resolvedTo: to ?? null })
  );
  if (!webhookUrl || !to) {
    console.log("[notify-email] skipped — missing webhook URL or no email configured for", assignee);
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, body }),
    });
    console.log("[notify-email] webhook response status:", res.status);
    if (!res.ok) {
      console.error("[notify-email] Make webhook returned", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("[notify-email] failed:", err);
  }
}
