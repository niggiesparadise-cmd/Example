import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Source_Serif_4 } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { NativeShell } from "@/components/native/native-shell";
import { Providers } from "@/components/providers";
import { site } from "@/config/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/** A text serif, used only for headings — it gives the UI its academic voice. */
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
  /**
   * `viewport-fit: cover` lets the page paint under the Android status bar and
   * gesture bar, and is what makes `env(safe-area-inset-*)` report real values
   * rather than zero. The shell pads itself back out of those insets.
   */
  viewportFit: "cover",
  /** A packaged app should not pinch-zoom its own chrome. */
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      className={`${inter.variable} ${sourceSerif.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <Providers>
          <NativeShell />
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
