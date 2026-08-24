import { TopTabs } from "@/components/TopTabs";
import { SyncButton } from "@/components/SyncButton";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

export function DashboardHeader({
  active,
}: {
  active: "client" | "domain-health";
}) {
  return (
    <header className="border-b border-black/5 bg-white px-6 py-6 sm:px-10">
      <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-3">
        <div className="text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-widest text-body-gray">
            Marketing Dashboard
          </p>
          <h1 className="font-heading text-3xl font-bold">
            <span className="text-brand-green">HOMETOWN</span>
            <span className="text-charcoal">QUOTES</span>
          </h1>
        </div>

        <div className="flex justify-center">
          <TopTabs active={active} />
        </div>

        <div className="flex flex-col items-center gap-2 sm:items-end">
          <div className="flex items-center gap-2">
            <SyncButton />
            <ThemeToggle />
          </div>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
