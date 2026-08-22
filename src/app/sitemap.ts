import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://mutabasir.ae";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entry = (
    path: string,
    priority: number,
    changeFrequency: "weekly" | "monthly" | "yearly",
  ): MetadataRoute.Sitemap[number] => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
    alternates: {
      languages: {
        "en-AE": `${BASE}${path}`,
        "ar-AE": `${BASE}${path}`,
        "x-default": `${BASE}${path}`,
      },
    },
  });

  return [
    entry("/", 1, "weekly"),
    entry("/pricing", 0.9, "monthly"),
    entry("/faq", 0.7, "monthly"),
    entry("/sign-up", 0.8, "monthly"),
    entry("/sign-in", 0.4, "monthly"),
    entry("/privacy", 0.3, "yearly"),
    entry("/terms", 0.3, "yearly"),
  ];
}
