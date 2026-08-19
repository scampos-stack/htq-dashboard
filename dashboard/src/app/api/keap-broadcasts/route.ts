import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { campaignName, dateSent, emailsDelivered, opens, clicks, replies } = body;

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
    const { data, error } = await supabase
      .from("keap_broadcasts")
      .insert({
        campaign_name: campaignName.trim(),
        date_sent: dateSent,
        emails_delivered: Number(emailsDelivered),
        opens: Number(opens),
        clicks: Number(clicks),
        replies: Number(replies),
      })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, broadcast: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save broadcast";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
