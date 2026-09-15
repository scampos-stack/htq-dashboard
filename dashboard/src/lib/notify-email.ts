import { Resend } from "resend";

// Maps the fixed assignee names (see ASSIGNEE_OPTIONS in
// BroadcastDraftForm/BroadcastDraftAssigneeSelect) to a real inbox — set via
// env vars rather than hardcoded so recipients can change without a code
// deploy. A name with no configured address just doesn't get emailed.
const ASSIGNEE_EMAILS: Record<string, string | undefined> = {
  Paula: process.env.ASSIGNEE_EMAIL_PAULA,
  Sarah: process.env.ASSIGNEE_EMAIL_SARAH,
  Mohammed: process.env.ASSIGNEE_EMAIL_MOHAMMED,
};

// Silently no-ops (rather than throwing) if RESEND_API_KEY isn't set or the
// assignee has no configured email — a missing/incomplete email setup
// shouldn't block someone from saving a draft edit.
export async function notifyAssigneeByEmail(
  assignee: string,
  subject: string,
  body: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = ASSIGNEE_EMAILS[assignee];
  if (!apiKey || !to) return;

  const from = process.env.RESEND_FROM_EMAIL ?? "HTQ Dashboard <onboarding@resend.dev>";

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to, subject, text: body });
    if (error) console.error("[notify-email] Resend error:", error);
  } catch (err) {
    console.error("[notify-email] failed:", err);
  }
}
