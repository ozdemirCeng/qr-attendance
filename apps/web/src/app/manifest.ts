import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QR Yoklama Tarama",
    short_name: "QR Yoklama",
    description: "QR kod ile yoklama ve giriş uygulaması",
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
