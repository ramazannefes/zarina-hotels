// Referans site (zarinahotelshamam.site) verileriyle DB senkronizasyonu.
// Usage: DATABASE_URL=<any> npx tsx scripts/sync-reference-data.ts
//
// FK-güvenli: oda tipleri silinmez, YERİNDE güncellenir (isim/m²/yatak/fiyat).
// FAM-3 (Family Triple) referansta yok → pasife alınır, fiziksel odaları
// Comfort Triple'a taşınır. Gelecek tarihli DailyRate kayıtları yeni
// fiyatlardan yeniden üretilir. En/ka/tr çevirileri güncellenir.
// Odaların PMS durumu/temizliği korunur.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ── Referans veri (zarinahotelshamam.site, 2026-09 itibarıyla) ──
const REF = {
  hotel: {
    name: "Zarina Hotels & Hamam",
    stars: 3,
    address: "Mayakovsky Street 11, 6010 Batumi, Georgia",
    city: "Batumi",
    phone: "+995 511 24 92 92",
    email: "bookings@zarinahotels.com",
    description:
      "3-star hotel in Batumi's Adjara region with a spa & wellness centre (hamam + hot tub), on-site restaurant and bar, free parking and airport shuttle. Rooms from €50 — all with balcony, air conditioning, flat-screen TV and free WiFi. Suites with separate bedrooms for families and small groups.",
  },
  translations: {
    en: {
      name: "Zarina Hotels & Hamam",
      description:
        "Zarina Hotels & Hamam is a 3-star hotel in Batumi, in Georgia's Adjara region. It has a spa and wellness centre with a hamam and hot tub, an on-site restaurant and bar, and free parking for guests. Rooms start at €50 a night and all come with a balcony, air conditioning, flat-screen TV and free WiFi. Suites with separate bedrooms suit families and small groups, and an airport shuttle is available.",
      metaTitle: "Zarina Hotels & Hamam Batumi — Spa, Hamam & Free Parking | Book Direct",
      metaDescription:
        "Book direct at Zarina Hotels & Hamam, Batumi. 3-star comfort from €50: hamam & spa with hot tub, restaurant, free parking, airport shuttle. Balcony rooms and family suites.",
    },
    tr: {
      name: "Zarina Hotels & Hamam",
      description:
        "Zarina Hotels & Hamam, Gürcistan'ın Acara bölgesinde, Batumi'de 3 yıldızlı bir oteldir. Hamam ve jakuzili spa & wellness merkezi, restoran ve bar ile ücretsiz otopark sunar. Odalar gecelik €50'den başlar; tüm odalarda balkon, klima, LED TV ve ücretsiz WiFi bulunur. Ayrı yatak odalı süitler ailelere ve küçük gruplara uygundur; havaalanı transferi mevcuttur.",
      metaTitle: "Zarina Hotels & Hamam Batum — Hamam, Spa & Ücretsiz Otopark | Doğrudan Rezervasyon",
      metaDescription:
        "Zarina Hotels & Hamam Batum'da doğrudan rezervasyon: €50'den başlayan fiyatlarla hamam & spa, jakuzi, restoran, ücretsiz otopark ve havaalanı transferi. Balkonlu odalar ve aile süitleri.",
    },
    ka: {
      name: "Zarina Hotels & Hamam",
      description:
        "Zarina Hotels & Hamam — 3-ვარსკვლავიანი სასტუმრო ბათუმში, აჭარაში. სპა და ველნეს ცენტრი ჰამამით და ჯაკუზით, რესტორანი და ბარი, უფასო პარკირება და აეროპორტის ტრანსფერი. ოთახები €50-დან — აივნით, კონდიციონერით, ტელევიზორით და უფასო Wi-Fi-ით.",
    },
  },
  // EUR→GEL kabaca 2.90 (admin panelden güncellenebilir)
  EUR_GEL: 2.9,
  roomTypes: [
    {
      code: "DBL-STD",
      refName: "Standard Double Room",
      sizeSqm: 30,
      maxGuests: 2,
      maxAdults: 2,
      maxChildren: 0,
      bedType: "KING" as const,
      bedDescription: "1 çift kişilik (full) yatak",
      bedDescriptionEn: "1 full bed",
      eur: 50,
      view: "CITY" as const,
      amenities: ["balcony", "air_conditioning", "flat_screen_tv", "free_wifi"],
    },
    {
      code: "DBL-CMF",
      refName: "Standard Double or Twin Room",
      sizeSqm: 30,
      maxGuests: 2,
      maxAdults: 2,
      maxChildren: 0,
      bedType: "TWIN" as const,
      bedDescription: "2 tek kişilik yatak",
      bedDescriptionEn: "2 twin beds",
      eur: 50,
      view: "CITY" as const,
      amenities: ["balcony", "air_conditioning", "flat_screen_tv", "free_wifi"],
    },
    {
      code: "SGL-PRM",
      refName: "Comfort Triple Room",
      sizeSqm: 35,
      maxGuests: 3,
      maxAdults: 3,
      maxChildren: 1,
      bedType: "TWIN" as const,
      bedDescription: "3 çift kişilik (full) yatak",
      bedDescriptionEn: "3 full beds",
      eur: 60,
      view: "COURTYARD" as const,
      amenities: ["balcony", "air_conditioning", "flat_screen_tv", "free_wifi"],
    },
    {
      code: "JST",
      refName: "Junior Suite",
      sizeSqm: 40,
      maxGuests: 4,
      maxAdults: 4,
      maxChildren: 1,
      bedType: "MIXED" as const,
      bedDescription: "2 ayrı yatak odası, her birinde 1 çift kişilik (full) yatak",
      bedDescriptionEn: "Two bedrooms, each with a full bed",
      eur: 88,
      view: "COURTYARD" as const,
      amenities: ["balcony", "air_conditioning", "flat_screen_tv", "free_wifi", "separate_bedrooms"],
    },
    {
      code: "FST",
      refName: "Family Suite",
      sizeSqm: 45,
      maxGuests: 5,
      maxAdults: 4,
      maxChildren: 2,
      bedType: "MIXED" as const,
      bedDescription: "2 ayrı yatak odası + oturma odası (çekyat); 2 çift kişilik + 1 queen yatak",
      bedDescriptionEn: "Two bedrooms + living room with sofa bed; 2 full beds + 1 queen",
      eur: 95,
      view: "COURTYARD" as const,
      amenities: ["balcony", "air_conditioning", "flat_screen_tv", "free_wifi", "separate_bedrooms", "living_room"],
    },
  ],
  // FAM-3 referansta yok → pasife çekilecek
  deactivate: ["FAM-3"],
  // Yeni amenity key'leri
  newAmenities: [
    { key: "balcony", icon: "balcony" },
    { key: "air_conditioning", icon: "ac" },
    { key: "flat_screen_tv", icon: "tv" },
    { key: "free_wifi", icon: "wifi" },
    { key: "separate_bedrooms", icon: null },
    { key: "living_room", icon: null },
    { key: "hot_tub", icon: "hot_tub" },
    { key: "sun_deck", icon: "sun" },
    { key: "garden", icon: "garden" },
    { key: "room_service", icon: "room_service" },
    { key: "bar", icon: "bar" },
  ],
  hotelAmenityKeys: [
    // mevcut + referansta belirtilenler
    "wifi", "free_wifi", "spa", "hamam", "hot_tub", "sauna", "restaurant", "bar",
    "parking", "airport_shuttle", "room_service", "breakfast", "garden", "sun_deck",
    "laundry", "elevator", "luggage_storage", "concierge", "babysitting",
  ],
} as const;

async function main() {
  const hotel = await db.hotel.findFirst({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  if (!hotel) {
    console.error("Aktif otel bulunamadı.");
    process.exit(1);
  }

  console.info(`Referans veri senkronizasyonu → ${hotel.name} [${hotel.slug}]`);

  // ── 1) Otel çekirdek bilgileri ──
  await db.hotel.update({
    where: { id: hotel.id },
    data: {
      name: REF.hotel.name,
      stars: REF.hotel.stars,
      address: REF.hotel.address,
      city: REF.hotel.city,
      phone: REF.hotel.phone,
      email: REF.hotel.email,
      description: REF.hotel.description,
      isDemo: false,
    },
  });
  console.info("  ✓ Otel bilgileri (ad, 3★, adres, iletişim) güncellendi — isDemo=false");

  // ── 2) Çeviriler ──
  for (const [locale, t] of Object.entries(REF.translations)) {
    await db.hotelTranslation.upsert({
      where: { hotelId_locale: { hotelId: hotel.id, locale } },
      update: {
        name: t.name,
        description: t.description,
        ...(locale === "ka"
          ? {}
          : { metaTitle: (t as { metaTitle?: string }).metaTitle, metaDescription: (t as { metaDescription?: string }).metaDescription }),
        needsVerification: false,
      },
      create: {
        hotelId: hotel.id,
        locale,
        name: t.name,
        description: t.description,
        ...(locale === "ka"
          ? {}
          : { metaTitle: (t as { metaTitle?: string }).metaTitle, metaDescription: (t as { metaDescription?: string }).metaDescription }),
        needsVerification: false,
      },
    });
  }
  console.info("  ✓ en/ka/tr çevirileri güncellendi (needsVerification=false)");

  // ── 3) Yeni amenity'ler ──
  for (const a of REF.newAmenities) {
    await db.amenity.upsert({ where: { key: a.key }, update: {}, create: { key: a.key, icon: a.icon ?? undefined } });
  }
  // Otel amenity bağlantıları
  for (const key of REF.hotelAmenityKeys) {
    const amenity = await db.amenity.findUnique({ where: { key } });
    if (amenity) {
      await db.hotelAmenity.upsert({
        where: { hotelId_amenityId: { hotelId: hotel.id, amenityId: amenity.id } },
        update: {},
        create: { hotelId: hotel.id, amenityId: amenity.id },
      });
    }
  }
  console.info(`  ✓ ${REF.newAmenities.length} yeni amenity + otel olanakları bağlandı`);

  // ── 4) Oda tipleri (yerinde güncelleme, FK güvenli) ──
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const futureDates: Date[] = [];
  for (let i = 0; i < 120; i++) {
    futureDates.push(new Date(today.getTime() + i * 86_400_000));
  }

  for (const def of REF.roomTypes) {
    const roomType = await db.roomType.findUnique({
      where: { hotelId_code: { hotelId: hotel.id, code: def.code } },
    });
    if (!roomType) {
      console.warn(`  ⚠ Oda tipi bulunamadı: ${def.code} — atlandı`);
      continue;
    }
    const gel = Math.round(def.eur * REF.EUR_GEL * 100) / 100;
    const gelWeekend = Math.round(gel * 1.2 * 100) / 100;

    await db.roomType.update({
      where: { id: roomType.id },
      data: {
        name: def.refName,
        shortDescription: `${def.sizeSqm} m² · ${def.bedDescriptionEn} · from €${def.eur}`,
        description: `A ${def.sizeSqm} m² ${def.refName.toLowerCase()} with ${def.bedDescriptionEn.toLowerCase()}, a balcony and a view. Air conditioning, a flat-screen TV and free WiFi are included, and rates start at €${def.eur} a night.`,
        sizeSqm: def.sizeSqm,
        maxGuests: def.maxGuests,
        maxAdults: def.maxAdults,
        maxChildren: def.maxChildren,
        bedType: def.bedType,
        bedDescription: def.bedDescriptionEn,
        viewType: def.view,
        basePrice: gel,
        weekendPrice: gelWeekend,
        isDemo: false,
        isActive: true,
      },
    });

    // Oda çevirileri (en/tr)
    await db.roomTranslation.upsert({
      where: { roomTypeId_locale: { roomTypeId: roomType.id, locale: "en" } },
      update: { name: def.refName, shortDescription: `${def.sizeSqm} m² · ${def.bedDescriptionEn}`, description: `A ${def.sizeSqm} m² room with ${def.bedDescriptionEn.toLowerCase()}, balcony, air conditioning, flat-screen TV and free WiFi. From €${def.eur}/night.`, needsVerification: false },
      create: { roomTypeId: roomType.id, locale: "en", name: def.refName, shortDescription: `${def.sizeSqm} m² · ${def.bedDescriptionEn}`, description: `A ${def.sizeSqm} m² room with ${def.bedDescriptionEn.toLowerCase()}, balcony, air conditioning, flat-screen TV and free WiFi. From €${def.eur}/night.`, needsVerification: false },
    });
    await db.roomTranslation.upsert({
      where: { roomTypeId_locale: { roomTypeId: roomType.id, locale: "tr" } },
      update: { name: def.refName, shortDescription: `${def.sizeSqm} m² · ${def.bedDescription}`, description: `${def.sizeSqm} m² büyüklüğünde, ${def.bedDescription.toLowerCase()} ve balkonlu oda. Klima, LED TV ve ücretsiz WiFi dahildir. Gecelik €${def.eur}'den başlar.`, needsVerification: false },
      create: { roomTypeId: roomType.id, locale: "tr", name: def.refName, shortDescription: `${def.sizeSqm} m² · ${def.bedDescription}`, description: `${def.sizeSqm} m² büyüklüğünde, ${def.bedDescription.toLowerCase()} ve balkonlu oda. Klima, LED TV ve ücretsiz WiFi dahildir. Gecelik €${def.eur}'den başlar.`, needsVerification: false },
    });

    // Oda amenity'leri (önce temizle, sonra bağla — idempotent)
    await db.roomAmenity.deleteMany({ where: { roomTypeId: roomType.id } });
    for (const key of def.amenities) {
      const amenity = await db.amenity.findUnique({ where: { key } });
      if (amenity) {
        await db.roomAmenity.create({ data: { roomTypeId: roomType.id, amenityId: amenity.id } });
      }
    }

    // Gelecek tarihli günlük fiyatları yeni fiyata çek (geçmiş korunur)
    await db.dailyRate.updateMany({
      where: { roomTypeId: roomType.id, date: { gte: today } },
      data: { price: gel },
    });
    // Gelecek envanter kaydı yoksa üret
    const existingInv = await db.roomInventory.count({
      where: { roomTypeId: roomType.id, date: { gte: today } },
    });
    if (existingInv < futureDates.length) {
      for (const date of futureDates) {
        await db.roomInventory.upsert({
          where: { roomTypeId_date: { roomTypeId: roomType.id, date } },
          update: {},
          create: { roomTypeId: roomType.id, date, inventory: roomType.inventoryCount || 1 },
        });
      }
    }

    console.info(`  ✓ ${def.code} → ${def.refName} (${def.sizeSqm} m², ₾${gel}/gece)`);
  }

  // ── 5) FAM-3 pasife çek + fiziksel odalarını Comfort Triple'a (SGL-PRM) taşı ──
  for (const code of REF.deactivate) {
    const rt = await db.roomType.findUnique({ where: { hotelId_code: { hotelId: hotel.id, code } } });
    if (!rt) continue;
    const target = await db.roomType.findUnique({
      where: { hotelId_code: { hotelId: hotel.id, code: "SGL-PRM" } },
    });
    const moved = await db.room.count({ where: { roomTypeId: rt.id } });
    if (target) {
      await db.room.updateMany({ where: { roomTypeId: rt.id }, data: { roomTypeId: target.id } });
    }
    await db.roomType.update({ where: { id: rt.id }, data: { isActive: false } });
    console.info(`  ✓ ${code} pasife alındı (${moved} fiziksel oda Comfort Triple'a taşındı)`);
  }

  // ── 6) Özet ──
  const counts = await db.roomType.groupBy({ by: ["isActive"], _count: { _all: true }, where: { hotelId: hotel.id } });
  console.info("Oda tipi durumu:", counts.map((c) => `${c.isActive ? "aktif" : "pasif"}=${c._count._all}`).join(", "));
  console.info("Senkronizasyon tamamlandı.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
