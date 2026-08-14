// Shared across sources — carrier isn't a native field on either Woodpecker
// or Keap, so it's inferred from the campaign/automation name. Matches the
// carrier list from HTQ's own reporting sheet.
const CARRIERS = [
  "Independent",
  "Farmers",
  "State Farm",
  "Country Financial",
  "Liberty Mutual",
  "AAA",
  "Allstate",
  "American Family",
];

export function classifyCarrier(name: string): string {
  const lower = name.toLowerCase();
  const match = CARRIERS.find((c) => lower.includes(c.toLowerCase()));
  return match ?? "General";
}
