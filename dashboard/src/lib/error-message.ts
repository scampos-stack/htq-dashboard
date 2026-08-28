// Supabase/Postgrest errors (and other plain error-shaped objects) aren't
// Error instances and have no custom toString, so String(err) collapses
// them to "[object Object]" instead of the actual message.
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
