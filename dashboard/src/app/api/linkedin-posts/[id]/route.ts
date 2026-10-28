import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { notifyTeams } from "@/lib/teams-notify";
import { notifyAssigneeByEmail } from "@/lib/notify-email";

const EDITABLE_FIELDS: Record<string, string> = {
  title: "title",
  content: "content",
  imageUrl: "image_url",
  account: "account",
  status: "status",
  assignedTo: "assigned_to",
  scheduledDate: "scheduled_date",
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [key, column] of Object.entries(EDITABLE_FIELDS)) {
      if (key in body) update[column] = body[key];
    }
    if (Object.keys(update).length === 1) {
      return NextResponse.json({ ok: false, error: "No fields to update." }, { status: 400 });
    }

    const supabase = supabaseServer();

    // Same pattern as broadcast drafts — only fires when assigned_to is
    // actually changing to a new real person, not on every save or on
    // unassigning.
    let assigneeChangeContext: { title: string | null } | null = null;
    if ("assigned_to" in update && update.assigned_to) {
      const { data: current } = await supabase
        .from("linkedin_posts")
        .select("title, content, assigned_to")
        .eq("id", id)
        .maybeSingle();
      if (current && current.assigned_to !== update.assigned_to) {
        assigneeChangeContext = { title: current.title || current.content.split("\n").find((l: string) => l.trim()) || null };
      }
    }

    const { error } = await supabase.from("linkedin_posts").update(update).eq("id", id);
    if (error) throw error;

    if (assigneeChangeContext) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ateam.hometownquotes.com";
      const link = `${appUrl}/broadcast-drafts?channel=linkedin`;
      const assignee = String(update.assigned_to);
      const label = assigneeChangeContext.title ?? "a LinkedIn post";

      await Promise.all([
        notifyTeams(`📋 "${label}" (LinkedIn) is now assigned to **${assignee}** — ${link}`),
        notifyAssigneeByEmail(assignee, `Assigned to you: ${label}`, `"${label}" (LinkedIn post) is now assigned to you.\n\n${link}`),
      ]);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update LinkedIn post";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();
    const { error } = await supabase.from("linkedin_posts").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete LinkedIn post";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
