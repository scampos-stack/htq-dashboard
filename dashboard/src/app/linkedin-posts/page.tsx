import { redirect } from "next/navigation";

// The LinkedIn queue now lives on the Broadcast Schedule page behind a
// Channel switcher, alongside the email schedule — this old URL just
// forwards there so existing bookmarks/links keep working.
export default function LinkedInPostsRedirect() {
  redirect("/broadcast-drafts?channel=linkedin");
}
