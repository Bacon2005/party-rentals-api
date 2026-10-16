import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Party Link",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="min-h-full">
      <body className="min-h-screen flex flex-row gap-6 bg-background">
        <div className="flex-1 min-w-0">{children}</div>
      </body>
    </html>
  );
}
