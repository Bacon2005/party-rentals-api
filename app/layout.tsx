import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Party Link",
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="min-h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
          try {
            const theme = localStorage.getItem('partylink-theme');
            document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
          } catch {
            document.documentElement.dataset.theme = 'light';
          }
        `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-row gap-6 bg-background">
        <div className="flex-1 min-w-0">{children}</div>
      </body>
    </html>
  );
}
