import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer } from "../src/footer";
import { Header } from "../src/header";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://taskwish.ai"),
  title: {
    default: "TaskWish — The framework for building autonomous companies",
    template: "%s · TaskWish",
  },
  description: "Build autonomous companies from typed actors, tools, state, and AI workflows in TypeScript.",
  openGraph: {
    title: "TaskWish — The framework for building autonomous companies",
    description: "Build autonomous companies from typed actors, tools, state, and AI workflows in TypeScript.",
    url: "https://taskwish.ai",
    siteName: "TaskWish",
    type: "website",
  },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body><Header />{children}<Footer /></body>
    </html>
  );
}
