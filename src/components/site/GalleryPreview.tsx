import Image from "next/image";
import Link from "next/link";
import { GALLERY_ITEMS } from "@/lib/gallery-data";
import type { Locale } from "@/lib/i18n/config";

type Props = { locale: Locale };

export default function GalleryPreview({ locale }: Props) {
  const picks = GALLERY_ITEMS.filter((it) => it.size === "wide").slice(0, 6);
  const label = (it: (typeof picks)[number]) =>
    locale === "tr" ? it.labelTr : locale === "ka" ? it.labelKa : it.labelEn;

  return (
    <div>
      <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {picks.map((it, i) => (
          <Link
            key={it.src}
            href={`/${locale}/gallery`}
            className="reveal group relative block overflow-hidden rounded-xl border border-white/10"
            style={{ "--reveal-delay": `${i * 90}ms` } as React.CSSProperties}
            aria-label={label(it)}
          >
            <div className={`relative w-full ${i === 0 ? "aspect-[16/10] lg:col-span-2" : "aspect-[4/3]"}`}>
              <Image
                src={it.src}
                alt={label(it)}
                fill
                sizes="(min-width: 1024px) 33vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.06]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
              <p className="absolute bottom-3 left-4 font-display text-sm font-semibold text-white drop-shadow">
                {label(it)}
              </p>
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-8">
        <Link href={`/${locale}/gallery`} className="btn-ghost !px-5 !py-2.5 text-xs">
          {locale === "tr" ? "Tüm galeriyi gör" : locale === "ka" ? "ყველა ფოტო" : "View full gallery"}
        </Link>
      </div>
    </div>
  );
}
