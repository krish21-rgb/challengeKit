import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "challengeKit — Make learning a little more fun",
  description:
    "Meet challengeKit: a fresh way to turn everyday questions into moments of curiosity, connection, and learning.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
