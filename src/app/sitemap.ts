import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n/config";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://zarina-hotels.vercel.app"
  ).replace(/\/$/, "");

  // path, priority, changeFrequency — ana sayfa en üstte, sonra ana bölümler
  const staticPaths: Array<{ path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
    { path: "", priority: 1, freq: "daily" },
    { path: "/hotels", priority: 0.9, freq: "weekly" },
    { path: "/gallery", priority: 0.8, freq: "weekly" },
    { path: "/amenities", priority: 0.8, freq: "weekly" },
    { path: "/faq", priority: 0.7, freq: "monthly" },
    { path: "/about", priority: 0.6, freq: "monthly" },
    { path: "/contact", priority: 0.6, freq: "monthly" },
    { path: "/manage-booking", priority: 0.5, freq: "monthly" },
    { path: "/privacy", priority: 0.3, freq: "yearly" },
    { path: "/cookies", priority: 0.3, freq: "yearly" },
    { path: "/terms", priority: 0.3, freq: "yearly" },
    { path: "/booking-terms", priority: 0.3, freq: "yearly" },
    { path: "/cancellation-policy", priority: 0.3, freq: "yearly" },
  ];

  const entries: MetadataRoute.Sitemap = [];
  const now = new Date();

  // Ana sayfalar (TR varsayılan dil öncelikli görünüm için önce gelir)
  const orderedLocales = [...locales].sort((a, b) => (a === "tr" ? -1 : b === "tr" ? 1 : 0));

  for (const locale of orderedLocales) {
    for (const { path, priority, freq } of staticPaths) {
      entries.push({
        url: `${siteUrl}/${locale}${path}`,
        lastModified: now,
        changeFrequency: freq,
        priority,
        alternates: {
          languages: Object.fromEntries(locales.map((l) => [l, `${siteUrl}/${l}${path}`])),
        },
      });
    }
  }

  try {
    const hotels = await db.hotel.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    });
    for (const hotel of hotels) {
      for (const locale of orderedLocales) {
        entries.push({
          url: `${siteUrl}/${locale}/hotels/${hotel.slug}`,
          lastModified: hotel.updatedAt ?? now,
          changeFrequency: "weekly",
          priority: 0.9,
          alternates: {
            languages: Object.fromEntries(
              locales.map((l) => [l, `${siteUrl}/${l}/hotels/${hotel.slug}`]),
            ),
          },
        });
      }
    }
  } catch {
    // DB unavailable during build — static routes still ship
  }

  return entries;
}
