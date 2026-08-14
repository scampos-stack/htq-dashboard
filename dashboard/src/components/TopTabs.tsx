import Link from "next/link";

const TABS = [
  { href: "/", label: "Client Dashboard" },
  { href: "/domain-health", label: "Domain Health" },
];

export function TopTabs({ active }: { active: "client" | "domain-health" }) {
  return (
    <nav className="flex gap-1">
      {TABS.map((t) => {
        const isActive =
          (active === "client" && t.href === "/") ||
          (active === "domain-health" && t.href === "/domain-health");
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? "bg-charcoal text-white"
                : "bg-white text-charcoal hover:bg-charcoal/5"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
