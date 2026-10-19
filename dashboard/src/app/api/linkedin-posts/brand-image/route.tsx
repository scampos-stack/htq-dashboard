import { ImageResponse } from "next/og";

// Templated fallback visual for when a LinkedIn post has no image to reuse
// from its source email — not AI-generated art, just the post's headline
// dropped onto an on-brand card (colors/logo per branding.md) so there's
// still something to post with.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get("text") ?? "Hometown Quotes").slice(0, 160);
  const fontSize = text.length > 110 ? 40 : text.length > 70 ? 46 : 54;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#FFFFFF",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div style={{ display: "flex", width: 14, height: "100%", backgroundColor: "#7CB342" }} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            padding: "56px 72px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", fontSize: 24, fontWeight: 700, letterSpacing: 1 }}>
            <span style={{ color: "#7CB342" }}>HOMETOWN</span>
            <span style={{ color: "#262626" }}>QUOTES</span>
          </div>

          <div
            style={{
              display: "flex",
              fontSize,
              fontWeight: 700,
              lineHeight: 1.3,
              color: "#262626",
              maxWidth: 920,
            }}
          >
            {text}
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", width: "100%", height: 1, backgroundColor: "#DDE3D6", marginBottom: 20 }} />
            <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: 2, color: "#5B5F5C", textTransform: "uppercase" }}>
              For agents. By agents.
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 627 }
  );
}
