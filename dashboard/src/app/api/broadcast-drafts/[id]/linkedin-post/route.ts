import { NextResponse } from "next/server";
import { generateLinkedInPostFromDraft } from "@/lib/generate-summary";

// Generates a preview only — nothing is saved until the human approves it
// and it's POSTed to /api/linkedin-posts.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await generateLinkedInPostFromDraft(Number(id));
    if (!result.generated) {
      return NextResponse.json({ ok: false, error: result.reason ?? "Generation failed" }, { status: 422 });
    }
    return NextResponse.json({ ok: true, content: result.content, imageUrl: result.imageUrl ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate LinkedIn post";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
