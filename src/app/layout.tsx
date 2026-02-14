import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "People Pleaser Polling",
  description: "Anonymous group polling with sliders",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full overflow-auto">
      <body className="h-full">
        <main className="mx-auto max-w-lg px-4 py-8">{children}</main>
        <Analytics />
      </body>
    </html>
  );
}
