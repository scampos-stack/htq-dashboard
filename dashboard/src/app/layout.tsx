import type { Metadata } from "next";
import { Poppins, Open_Sans, Cinzel } from "next/font/google";
import "./globals.css";

const heading = Poppins({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const body = Open_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

// Only used by the "One Ring" theme Easter egg — see ThemeToggle.
const ring = Cinzel({
  variable: "--font-ring",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "HTQ Marketing Dashboard",
  description: "HometownQuotes marketing engagement & pipeline dashboard",
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem("htq-theme");
    var theme = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    if (theme === "dark" || theme === "ring") document.documentElement.classList.add(theme === "ring" ? "one-ring" : "dark");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${heading.variable} ${body.variable} ${ring.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
