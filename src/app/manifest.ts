import type { MetadataRoute } from "next";

/** Served at /manifest.webmanifest; makes the app installable on phones and desktops. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Kokoon Task",
    short_name: "Kokoon Task",
    description: "Own your work. See where you stand. Tasks, deadlines and ownership for the whole team.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f6f3",
    theme_color: "#ffffff",
    categories: ["productivity", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "New task", url: "/tasks/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Board", url: "/tasks?view=board", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
