// app/layout.tsx
import type { Metadata } from "next";
import { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clue-ai",
  description:
    "An AI Agent that helps students fix code and figure out labs without directly giving the answer.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="root">
        <div className="bg-gradient" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
