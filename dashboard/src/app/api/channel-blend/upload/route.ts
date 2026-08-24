import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { parseChannelBlendWorkbook } from "@/lib/parse-channel-blend";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const filename = file instanceof File ? file.name : "upload.xlsx";
    const rows = await parseChannelBlendWorkbook(buffer, filename);

    if (rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No recognizable rows found in the file. Check the column headers." },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();
    const { data: existing, error: existingErr } = await supabase
      .from("channel_blend_dispositions")
      .select("row_hash");
    if (existingErr) throw existingErr;

    const existingHashes = new Set((existing ?? []).map((r) => r.row_hash));
    const newRows = rows.filter((r) => !existingHashes.has(r.rowHash));
    const duplicateCount = rows.length - newRows.length;

    if (newRows.length > 0) {
      const payload = newRows.map((r) => ({
        row_hash: r.rowHash,
        category: r.category,
        lead_name: r.leadName,
        new_contact: r.newContact,
        phone_number: r.phoneNumber,
        state: r.state,
        email_on_file: r.emailOnFile,
        preferred_email: r.preferredEmail,
        details: r.details,
        raw: r.raw,
      }));
      const { error: insertErr } = await supabase
        .from("channel_blend_dispositions")
        .upsert(payload, { onConflict: "row_hash", ignoreDuplicates: true });
      if (insertErr) throw insertErr;
    }

    return NextResponse.json({
      ok: true,
      parsed: rows.length,
      inserted: newRows.length,
      duplicates: duplicateCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process file";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
