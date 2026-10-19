import { ImageResponse } from "next/og";

// Templated fallback visual for when a LinkedIn post has no image to reuse
// from its source email — not AI-generated art, just the post's headline
// dropped onto an on-brand card (colors/logo per branding.md) so there's
// still something to post with.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get("text") ?? "Hometown Quotes").slice(0, 160);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#EFF3EF",
          padding: 64,
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 34,
            fontWeight: 700,
          }}
        >
          <span style={{ color: "#7CB342" }}>HOMETOWN</span>
          <span style={{ color: "#262626" }}>QUOTES</span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: text.length > 90 ? 44 : 56,
            fontWeight: 700,
            lineHeight: 1.25,
            color: "#262626",
            maxWidth: 950,
          }}
        >
          {text}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 48,
              height: 8,
              backgroundColor: "#7CB342",
              borderRadius: 4,
              marginRight: 16,
            }}
          />
          <span style={{ fontSize: 22, color: "#5B5F5C" }}>For agents. By agents.</span>
        </div>
      </div>
    ),
    { width: 1200, height: 627 }
  );
}
