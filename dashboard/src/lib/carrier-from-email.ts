// Channel Blend dispositions don't record a carrier column, but agent
// emails usually do — e.g. "@farmersagent.com" — so it's derived from the
// domain instead of asking uploaders to tag it by hand.
const CARRIER_DOMAIN_KEYWORDS: { keyword: string; carrier: string }[] = [
  { keyword: "farmers", carrier: "Farmers" },
  { keyword: "allstate", carrier: "Allstate" },
  { keyword: "statefarm", carrier: "State Farm" },
  { keyword: "geico", carrier: "GEICO" },
  { keyword: "progressive", carrier: "Progressive" },
  { keyword: "libertymutual", carrier: "Liberty Mutual" },
  { keyword: "nationwide", carrier: "Nationwide" },
  { keyword: "americanfamily", carrier: "American Family" },
];

export function carrierFromEmail(email: string | null): string | null {
  if (!email) return null;
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return null;
  const match = CARRIER_DOMAIN_KEYWORDS.find((c) => domain.includes(c.keyword));
  return match ? match.carrier : "Other / Independent";
}
