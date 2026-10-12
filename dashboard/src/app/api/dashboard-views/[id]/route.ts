import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { isKnownWidgetId } from "@/lib/dashboard-widgets";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if ("name" in body) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) return NextResponse.json({ ok: false, error: "A view name is required." }, { status: 400 });
      update.name = name;
    }
    if ("widgetIds" in body) {
      const widgetIds = Array.isArray(body.widgetIds) ? body.widgetIds : [];
      const validIds = widgetIds.filter((wid: unknown): wid is string => typeof wid === "string" && isKnownWidgetId(wid));
      if (validIds.length === 0) {
        return NextResponse.json({ ok: false, error: "A view needs at least one widget." }, { status: 400 });
      }
      update.widget_ids = validIds;
    }
    if (Object.keys(update).length === 1) {
      return NextResponse.json({ ok: false, error: "Nothing to update." }, { status: 400 });
    }

    const supabase = supabaseServer();
    const { error } = await supabase.from("dashboard_views").update(update).eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update view";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();
    const { error } = await supabase.from("dashboard_views").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete view";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
