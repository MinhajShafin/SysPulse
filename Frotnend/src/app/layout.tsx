import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SysPulse | System Monitor",
  description: "Real-time system monitoring dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
