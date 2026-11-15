import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kokoon Task",
  description: "Own your work. See where you stand.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
