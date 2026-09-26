import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BookingSearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") qs.set(k, v);
  }
  if (!qs.has("checkIn")) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    qs.set("checkIn", d.toISOString().slice(0, 10));
  }
  if (!qs.has("checkOut")) {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    qs.set("checkOut", d.toISOString().slice(0, 10));
  }
  if (!qs.has("adults")) qs.set("adults", "2");
  if (!qs.has("children")) qs.set("children", "0");
  redirect(`/${locale}/booking/results?${qs.toString()}`);
}
