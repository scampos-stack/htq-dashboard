import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseServerAuth } from "@/lib/supabase/server";
import { isKnownWidgetId, parseWidgetToken } from "@/lib/dashboard-widgets";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const widgetIds = Array.isArray(body.widgetIds) ? body.widgetIds : [];
    if (!name) {
      return NextResponse.json({ ok: false, error: "A view name is required." }, { status: 400 });
    }
    const validIds = widgetIds.filter(
      (id: unknown): id is string => typeof id === "string" && isKnownWidgetId(parseWidgetToken(id).id)
    );
    if (validIds.length === 0) {
      return NextResponse.json({ ok: false, error: "Pick at least one widget." }, { status: 400 });
    }

    const {
      data: { user },
    } = await (await supabaseServerAuth()).auth.getUser();

    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from("dashboard_views")
      .insert({ name, widget_ids: validIds, created_by: user?.email ?? null })
      .select("id")
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create view";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
