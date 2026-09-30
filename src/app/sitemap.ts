import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n/config";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

  const staticPaths = [
    "", "/hotels", "/gallery", "/amenities", "/about", "/contact", "/manage-booking",
    "/privacy", "/cookies", "/terms", "/booking-terms", "/cancellation-policy",
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const path of staticPaths) {
      entries.push({
        url: `${siteUrl}/${locale}${path}`,
        changeFrequency: path === "" ? "daily" : "weekly",
        priority: path === "" ? 1 : 0.7,
      });
    }
  }

  try {
    const hotels = await db.hotel.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } });
    for (const hotel of hotels) {
      for (const locale of locales) {
        entries.push({ url: `${siteUrl}/${locale}/hotels/${hotel.slug}`, lastModified: hotel.updatedAt, priority: 0.9 });
      }
    }
  } catch {
    // DB unavailable during build — static routes still ship
  }

  return entries;
}
