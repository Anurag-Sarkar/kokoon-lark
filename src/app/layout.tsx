import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/shell/PwaRegister";

export const metadata: Metadata = {
  title: "Kokoon Task",
  description: "Own your work. See where you stand.",
  applicationName: "Kokoon Task",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Kokoon Task", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  // Next emits the standard mobile-web-app-capable tag; older iOS only reads the Apple-prefixed one.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-full">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
