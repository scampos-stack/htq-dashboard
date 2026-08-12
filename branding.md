# HometownQuotes — Brand Reference (extracted from live site screenshots, 2026-08-12)

Values below are visually estimated from screenshots of hometownquotes.com, not sampled from source
CSS or a media kit. Treat hex codes as close approximations — verify against exact brand assets
(logo files, style guide, or site CSS) before using them anywhere pixel-precision matters.

## Color palette

| Token | Hex (approx) | Usage |
|---|---|---|
| Brand Green | `#7CB342` | Logo wordmark ("HOMETOWN"), primary CTA buttons, icons, links |
| Brand Green Dark | `#5B9427` | Gradient panel dark end, hover/depth accent |
| Charcoal | `#262626` | Logo ring, wordmark ("QUOTES"), headings |
| Ink Black | `#101010` | Secondary CTA buttons on green panels ("Start Now") |
| Mist | `#EFF3EF` | Light content-card backgrounds |
| Utility Gray | `#ECECEC` | Top utility bar background |
| Body Gray | `#5B5F5C` | Paragraph/body copy |
| White | `#FFFFFF` | Page background, cards |

## Typography

- **Headlines**: Bold, rounded geometric sans-serif with chunky, friendly letterforms (visually close
  to Poppins SemiBold/Bold or Nunito ExtraBold). Used for hero headings, section titles, CTA labels.
- **Body / navigation**: Clean grotesque sans-serif, regular-to-semibold weight (visually close to
  Open Sans / Source Sans Pro / Helvetica Neue). Used for nav links, paragraph copy, form labels.
- **Eyebrows / small labels** (e.g. "TOP SECTIONS", "HAVE QUESTIONS?"): body face, uppercase, letter-spaced.

## Logo

- Mark: a circular speech-bubble/"Q" icon — charcoal ring outline with a green accent swoosh/tail.
- Wordmark: "HOMETOWNQUOTES" set as one word, all caps, bold, no space — "HOMETOWN" in brand green,
  "QUOTES" in charcoal.
- Always paired (mark + wordmark), left-aligned in the header.

## UI / component patterns

- Buttons: full pill shape (fully rounded ends). Primary = green fill + white bold text
  ("Get a Quote", "Request Custom Pricing"). Secondary/contrast = black fill + white text
  ("Start Now", used on green backgrounds).
- Cards: large corner radius (~20–28px), white or mist background, soft drop shadow.
- Icon badges: simple line icons (car, house, heart-in-hands) in brand green, either in white rounded
  cards with a bold black caption, or inside circle outlines next to list items.
- Feature panels: diagonal green gradient (dark → light) blocks pairing a bold white/black headline
  with a black pill CTA — used repeatedly across Auto/Home/Agent landing sections.
- Info callout cards: white card with a thick green rounded border accent on one edge, bold black
  heading, gray body copy, bold underlined green link.
- Trust bar: partner/carrier logos (Allstate, Liberty Mutual, Nationwide, etc.) shown desaturated
  grayscale on white — signals credibility without competing with brand green.

## Imagery & tone

- Photography: warm, candid lifestyle shots of real people at home (couples on a sofa, natural/lamp
  lighting, muted warm tones with green/teal furnishings) — reinforces "hometown," approachable,
  trustworthy positioning rather than a corporate/stock-photo feel.
- Voice: short, plain-language, benefit-first copy ("Fast. Free. Easy.", "Save On Your Insurance
  Today", "We love our agents and they love us").
- Overall read: friendly local-insurance-agent warmth layered on a modern, clean lead-gen/SaaS UI
  (pill buttons, rounded cards, icon badges) — bridges "small town trust" with "easy online tool."

## Open questions for the dashboard project

- Exact hex values / logo SVG / font files — do they have a formal media kit or brand guide, or
  should these be sampled from live CSS?
- Who is the dashboard for — internal ops/agents, or the insurance-carrier partners (Allstate,
  Nationwide, etc.) referenced on the leads page?
- What data/metrics does it need to surface (leads, conversions, partner performance, pricing)?
