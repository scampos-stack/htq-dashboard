import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { campaignName, dateSent, emailsDelivered, opens, clicks, replies, carrier } = body;

    if (!campaignName || typeof campaignName !== "string" || !campaignName.trim()) {
      return NextResponse.json(
        { ok: false, error: "Campaign name is required." },
        { status: 400 }
      );
    }
    if (!dateSent || Number.isNaN(Date.parse(dateSent))) {
      return NextResponse.json(
        { ok: false, error: "A valid date sent is required." },
        { status: 400 }
      );
    }
    const numbers = { emailsDelivered, opens, clicks, replies };
    for (const [key, val] of Object.entries(numbers)) {
      if (val == null || Number.isNaN(Number(val)) || Number(val) < 0) {
        return NextResponse.json(
          { ok: false, error: `${key} must be a non-negative number.` },
          { status: 400 }
        );
      }
    }

    const supabase = supabaseServer();
    const { error } = await supabase
      .from("keap_broadcasts")
      .update({
        campaign_name: campaignName.trim(),
        date_sent: dateSent,
        emails_delivered: Number(emailsDelivered),
        opens: Number(opens),
        clicks: Number(clicks),
        replies: Number(replies),
        carrier: carrier || "General",
      })
      .eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update broadcast";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();
    const { error } = await supabase.from("keap_broadcasts").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete broadcast";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
