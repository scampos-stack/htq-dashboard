import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// Upserts the status/notes overlay for a VIP submission (keyed by the Keap
// contact id — see migration 031). The submission itself always comes live
// from Keap; this only ever touches our local overlay row.
export async function PATCH(req: Request, { params }: { params: Promise<{ contactId: string }> }) {
  try {
    const { contactId } = await params;
    const id = Number(contactId);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ ok: false, error: "Invalid contact id." }, { status: 400 });
    }
    const body = await req.json();
    const update: Record<string, unknown> = { contact_id: id, updated_at: new Date().toISOString() };
    if ("status" in body) update.status = body.status || null;
    if ("notes" in body) update.notes = body.notes || null;
    if (Object.keys(update).length <= 2) {
      return NextResponse.json({ ok: false, error: "Nothing to update." }, { status: 400 });
    }

    const supabase = supabaseServer();
    const { error } = await supabase.from("vip_submission_status").upsert(update, { onConflict: "contact_id" });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
