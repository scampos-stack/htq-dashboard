import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// Fetched on demand (not embedded in the main page load) since this is PII
// and can run to hundreds/thousands of rows per campaign.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();

    const { data, error, count } = await supabase
      .from("woodpecker_prospects")
      .select("email, first_name, last_name, status, interest_level", { count: "exact" })
      .eq("campaign_id", id)
      .order("email")
      .limit(200);
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      total: count ?? data?.length ?? 0,
      prospects: (data ?? []).map((p) => ({
        email: p.email,
        firstName: p.first_name,
        lastName: p.last_name,
        status: p.status,
        interestLevel: p.interest_level,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load prospects";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
