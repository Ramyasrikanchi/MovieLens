import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MovieLens",
  description: "Search movies and TV shows, then generate content-based recommendations."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
