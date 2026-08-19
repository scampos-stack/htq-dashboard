"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        const supabase = supabaseBrowser();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="text-xs font-semibold text-body-gray underline hover:text-charcoal"
    >
      Sign out
    </button>
  );
}
