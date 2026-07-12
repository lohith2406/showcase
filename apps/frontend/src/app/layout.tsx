import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Showcase — product demos, composed by AI",
    template: "%s · Showcase",
  },
  description:
    "Turn any SaaS product into an interactive, editable product demo.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
