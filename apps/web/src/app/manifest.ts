import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QR Attendance Scan",
    short_name: "QR Scan",
    description: "QR kod ile check-in uygulamasi",
    start_url: "/scan",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#18181b",
    lang: "tr",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
