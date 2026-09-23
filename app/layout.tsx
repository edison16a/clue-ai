// app/layout.tsx
import type { Metadata } from "next";
import { ReactNode } from "react";
import strings from "@/data/strings.json";
import "./globals.css";

export const metadata: Metadata = {
  title: strings.meta.title,
  description: strings.meta.description,
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="root">
        {children}
      </body>
    </html>
  );
}
