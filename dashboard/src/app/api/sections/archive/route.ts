import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseServerAuth } from "@/lib/supabase/server";

// Sections that can be archived. Restricted to a known list so the endpoint
// can't be used to write arbitrary keys.
const ARCHIVABLE = new Set(["channel_blend"]);

export async function POST(req: Request) {
  try {
    const { sectionKey, archived } = await req.json();
    if (typeof sectionKey !== "string" || !ARCHIVABLE.has(sectionKey)) {
      return NextResponse.json({ ok: false, error: "Unknown section." }, { status: 400 });
    }

    const {
      data: { user },
    } = await (await supabaseServerAuth()).auth.getUser();

    const supabase = supabaseServer();
    const { error } = await supabase.from("section_archive").upsert(
      {
        section_key: sectionKey,
        archived: Boolean(archived),
        archived_at: new Date().toISOString(),
        archived_by: user?.email ?? null,
      },
      { onConflict: "section_key" }
    );
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update archive state";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
