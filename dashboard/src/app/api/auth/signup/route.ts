import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

const ALLOWED_DOMAIN = "hometownquotes.com";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ ok: false, error: "Email is required." }, { status: 400 });
    }
    const domain = email.split("@")[1]?.toLowerCase();
    if (domain !== ALLOWED_DOMAIN) {
      return NextResponse.json(
        { ok: false, error: `Only @${ALLOWED_DOMAIN} email addresses can sign up.` },
        { status: 403 }
      );
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();
    const { error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create account";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
