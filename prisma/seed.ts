// Seed: DEMO DATA for development.
// All records are flagged isDemo=true and translations flagged needsVerification=true.
// Verified public facts (address, phone, 73 rooms, check-in/out, amenities) come from research;
// everything else is demo and MUST be replaced by the hotel via Admin Panel.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.info("Seeding DEMO DATA (isDemo=true)…");

  // ── Admin (setup-pending; password set via one-time token: npm run admin:create) ──
  const adminEmail = (process.env.ADMIN_BOOTSTRAP_EMAIL ?? "owner@zarinahotels.com").toLowerCase();
  await db.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: process.env.ADMIN_BOOTSTRAP_NAME ?? "Owner",
      role: "SUPER_ADMIN",
      // placeholder hash — login impossible until one-time setup completes
      passwordHash: "SETUP_PENDING",
      isActive: false,
    },
  });

  // ── Amenities ──
  const amenityKeys = [
    "wifi", "spa", "hamam", "sauna", "gym", "restaurant", "lobby_bar", "snack_bar",
    "parking", "valet_parking", "conference_room", "banquet_hall", "babysitting",
    "laundry", "elevator", "luggage_storage", "safe", "concierge", "bbq", "airport_shuttle",
  ];
  for (const key of amenityKeys) {
    await db.amenity.upsert({ where: { key }, update: {}, create: { key } });
  }

  // ── Hotel (verified public facts, translations flagged) ──
  const hotel = await db.hotel.upsert({
    where: { slug: "zarina-batumi" },
    update: {},
    create: {
      slug: "zarina-batumi",
      name: "Zarina Hotels Batumi",
      stars: 4,
      city: "Batumi",
      address: "Tsminda Severiani Adjareli St 11",
      phone: "+995 511 24 92 92",
      email: "bookings@zarinahotels.com",
      description:
        "In the heart of Batumi: 73 rooms, 24/7 Turkish hamam & spa, restaurant and lobby bar, minutes from the sea and the old bazaar.",
      checkInFrom: "14:00",
      checkOutTo: "12:00",
      airportKm: 7.4,
      isActive: true,
      isDemo: true, // becomes false when admin verifies content
      sortOrder: 1,
    },
  });

  await db.hotelTranslation.upsert({
    where: { hotelId_locale: { hotelId: hotel.id, locale: "en" } },
    update: {},
    create: {
      hotelId: hotel.id,
      locale: "en",
      name: "Zarina Hotels Batumi",
      description:
        "In the heart of Batumi: 73 rooms, 24/7 Turkish hamam & spa, restaurant and lobby bar — minutes from the sea and the old bazaar.",
      metaTitle: "Zarina Hotels Batumi — Spa & Turkish Hamam | Book Direct",
      metaDescription:
        "Book direct at Zarina Hotels Batumi. 73 rooms, 24/7 hamam & spa, restaurant, free valet parking. Best available rate guaranteed.",
      needsVerification: true,
    },
  });
  await db.hotelTranslation.upsert({
    where: { hotelId_locale: { hotelId: hotel.id, locale: "tr" } },
    update: {},
    create: {
      hotelId: hotel.id,
      locale: "tr",
      name: "Zarina Hotels Batum",
      description:
        "Batum'un kalbinde: 73 oda, 7/24 Türk hamamı & spa, restoran ve lobby bar — denize ve eski çarşıya birkaç adım.",
      metaTitle: "Zarina Hotels Batum — Türk Hamamı & Spa | Doğrudan Rezervasyon",
      metaDescription: "Zarina Hotels Batum'da doğrudan rezervasyon: 73 oda, 7/24 hamam & spa, restoran, ücretsiz vale otopark.",
      needsVerification: true,
    },
  });
  await db.hotelTranslation.upsert({
    where: { hotelId_locale: { hotelId: hotel.id, locale: "ka" } },
    update: {},
    create: {
      hotelId: hotel.id,
      locale: "ka",
      name: "Zarina Hotels ბათუმი",
      description: "ბათუმის გულში: 73 ოთახი, 24/7 თურქული აბანო & სპა, რესტორანი და ლობი-ბარი.",
      needsVerification: true,
    },
  });

  // Hotel amenities
  for (const key of ["wifi", "spa", "hamam", "sauna", "gym", "restaurant", "lobby_bar", "valet_parking", "conference_room", "babysitting", "airport_shuttle", "laundry", "elevator", "concierge"]) {
    const amenity = await db.amenity.findUnique({ where: { key } });
    if (amenity) {
      await db.hotelAmenity.upsert({
        where: { hotelId_amenityId: { hotelId: hotel.id, amenityId: amenity.id } },
        update: {},
        create: { hotelId: hotel.id, amenityId: amenity.id },
      });
    }
  }

  // ── Hotel media (optimized WebP from official AI-staged photography set) ──
  // 24 photos: lobby, 15 rooms, 3 hamam/spa pools, sauna, massage, restaurant, bathroom.
  const HOTEL_MEDIA: Array<{ url: string; alt: string; isFeatured?: boolean }> = [
    { url: "/images/zarina/web/lobby-red-lounge.webp", alt: "Zarina Hotels Batumi — lobby lounge with red velvet armchairs", isFeatured: true },
    { url: "/images/zarina/web/hamam-indoor-pool.webp", alt: "Zarina Hotels Batumi — 24/7 Turkish hamam with heated marble göbek taşı and gold dome ceiling", isFeatured: true },
    { url: "/images/zarina/web/hamam-marble-pool.webp", alt: "Zarina Hotels Batumi — marble hamam pool under an ornate golden dome", isFeatured: true },
    { url: "/images/zarina/web/restaurant-dining.webp", alt: "Zarina Hotels Batumi — restaurant serving Georgian and international cuisine", isFeatured: true },
    { url: "/images/zarina/web/spa-relax-lounge.webp", alt: "Zarina Hotels Batumi — spa relaxation lounge", isFeatured: true },
    { url: "/images/zarina/web/spa-massage-room.webp", alt: "Zarina Hotels Batumi — spa massage room", isFeatured: true },
    { url: "/images/zarina/web/spa-towel-lounge.webp", alt: "Zarina Hotels Batumi — spa towel lounge with fresh linen", isFeatured: true },
    { url: "/images/zarina/web/hamam-sauna.webp", alt: "Zarina Hotels Batumi — sauna wrapped in ornate gold tilework", isFeatured: true },
    { url: "/images/zarina/web/bathroom-shower.webp", alt: "Zarina Hotels Batumi — bathroom with walk-in shower", isFeatured: true },
    // Room gallery set (non-featured; shown in the hotel photo gallery)
    { url: "/images/zarina/web/room-standard-twin.webp", alt: "Zarina Hotels Batumi — standard twin room" },
    { url: "/images/zarina/web/room-deluxe-red-accent.webp", alt: "Zarina Hotels Batumi — deluxe room with red accent wall" },
    { url: "/images/zarina/web/room-superior-double.webp", alt: "Zarina Hotels Batumi — superior double room" },
    { url: "/images/zarina/web/room-twin-bright.webp", alt: "Zarina Hotels Batumi — bright twin room" },
    { url: "/images/zarina/web/room-double-workdesk.webp", alt: "Zarina Hotels Batumi — double room with work desk" },
    { url: "/images/zarina/web/room-twin-city.webp", alt: "Zarina Hotels Batumi — twin room with city view" },
    { url: "/images/zarina/web/room-double-garden.webp", alt: "Zarina Hotels Batumi — double room with garden view" },
    { url: "/images/zarina/web/room-double-terrace.webp", alt: "Zarina Hotels Batumi — double room with terrace" },
    { url: "/images/zarina/web/room-double-entry.webp", alt: "Zarina Hotels Batumi — double room entrance hall" },
  ];
  // Idempotent: replace previous seed media for this hotel on re-run
  await db.media.deleteMany({ where: { hotelId: hotel.id } });
  for (const [i, m] of HOTEL_MEDIA.entries()) {
    await db.media.create({
      data: {
        hotelId: hotel.id,
        url: m.url,
        alt: m.alt,
        isFeatured: m.isFeatured ?? false,
        isPlaceholder: false,
        sortOrder: i,
        width: 1448,
        height: 1086,
        type: "IMAGE",
      },
    });
  }

  // ── Room types (demo prices; structure from public data) ──
  const roomDefs = [
    { code: "DBL-STD", name: "Standard Double Room", short: "Comfortable double room with city view.", desc: "Individually styled room with premium bedding, Smart TV, minibar and shower.", max: 2, adults: 2, children: 0, bed: "1 double bed", bedType: "KING" as const, size: 22, view: "CITY" as const, price: 140, weekend: 170, featured: false, sort: 1, img: "/images/zarina/web/room-double-classic.webp" },
    { code: "DBL-CMF", name: "Comfort Double Room", short: "Spacious double with seating corner.", desc: "Larger room with Select Comfort bed, work desk and city view.", max: 2, adults: 2, children: 1, bed: "1 queen bed", bedType: "QUEEN" as const, size: 28, view: "CITY" as const, price: 180, weekend: 220, featured: true, sort: 2, img: "/images/zarina/web/room-comfort-double.webp" },
    { code: "SGL-PRM", name: "Premium Single Room", short: "Elegant single room for solo travellers.", desc: "Compact and quiet with twin beds, Smart TV and minibar.", max: 2, adults: 1, children: 0, bed: "2 single beds", bedType: "TWIN" as const, size: 20, view: "COURTYARD" as const, price: 120, weekend: 150, featured: false, sort: 3, img: "/images/zarina/web/room-single-city.webp" },
    { code: "FAM-3", name: "Family Triple Room", short: "Family room with three single beds.", desc: "Roomy family accommodation with three single beds and city view.", max: 3, adults: 3, children: 1, bed: "3 single beds", bedType: "TWIN" as const, size: 32, view: "CITY" as const, price: 220, weekend: 260, featured: false, sort: 4, img: "/images/zarina/web/room-family-terrace.webp" },
    { code: "JST", name: "Junior Suite", short: "Junior suite with lounge area.", desc: "Suite with separate lounge, five sleeping places and upgraded amenities.", max: 5, adults: 4, children: 2, bed: "5 single beds", bedType: "MIXED" as const, size: 45, view: "MIXED" as const, price: 320, weekend: 380, featured: true, sort: 5, img: "/images/zarina/web/room-junior-suite.webp" },
    { code: "FST", name: "Family Suite", short: "Two-room family suite.", desc: "Two connected rooms with six single beds, ideal for families.", max: 6, adults: 4, children: 3, bed: "6 single beds", bedType: "TWIN" as const, size: 55, view: "MIXED" as const, price: 390, weekend: 460, featured: true, sort: 6, img: "/images/zarina/web/room-suite-red-panel.webp" },
  ];

  for (const def of roomDefs) {
    const room = await db.roomType.upsert({
      where: { hotelId_code: { hotelId: hotel.id, code: def.code } },
      update: {},
      create: {
        hotelId: hotel.id,
        code: def.code,
        name: def.name,
        shortDescription: def.short,
        description: def.desc,
        maxGuests: def.max,
        maxAdults: def.adults,
        maxChildren: def.children,
        bedType: def.bedType,
        bedDescription: def.bed,
        sizeSqm: def.size,
        viewType: def.view,
        basePrice: def.price,
        weekendPrice: def.weekend,
        extraBedPrice: 80,
        breakfastIncluded: false,
        minStay: 1,
        inventoryCount: 8,
        isFeatured: def.featured,
        isDemo: true,
        sortOrder: def.sort,
      },
    });

    await db.roomTranslation.upsert({
      where: { roomTypeId_locale: { roomTypeId: room.id, locale: "en" } },
      update: {},
      create: { roomTypeId: room.id, locale: "en", name: def.name, shortDescription: def.short, description: def.desc, needsVerification: true },
    });
    await db.roomTranslation.upsert({
      where: { roomTypeId_locale: { roomTypeId: room.id, locale: "tr" } },
      update: {},
      create: { roomTypeId: room.id, locale: "tr", name: def.name, shortDescription: def.short, description: def.desc, needsVerification: true },
    });

    // Idempotent: replace previous seed media for this room on re-run
    await db.media.deleteMany({ where: { roomTypeId: room.id } });
    await db.media.create({
      data: {
        roomTypeId: room.id,
        url: def.img,
        alt: `${def.name} — Zarina Hotels Batumi`,
        isPlaceholder: false,
        isFeatured: true,
        sortOrder: 0,
        width: 1448,
        height: 1086,
        type: "IMAGE",
      },
    });

    // Rate plans
    await db.ratePlan.upsert({
      where: { roomTypeId_code: { roomTypeId: room.id, code: "FLEX-BB" } },
      update: {},
      create: {
        roomTypeId: room.id,
        code: "FLEX-BB",
        name: "Flexible + Breakfast",
        type: "BREAKFAST_INCLUDED",
        mealPlan: "BED_AND_BREAKFAST",
        refundable: true,
        priceModifierPercent: 15,
        cancellationPolicy: "Free cancellation until 48h before arrival.",
      },
    });
    await db.ratePlan.upsert({
      where: { roomTypeId_code: { roomTypeId: room.id, code: "NRF-RO" } },
      update: {},
      create: {
        roomTypeId: room.id,
        code: "NRF-RO",
        name: "Non-refundable · Room only",
        type: "NON_REFUNDABLE",
        mealPlan: "ROOM_ONLY",
        refundable: false,
        priceModifierPercent: -8,
        cancellationPolicy: "Non-refundable. No changes permitted after confirmation.",
      },
    });
  }

  // ── Inventory & rates for next 120 days ──
  const rooms = await db.roomType.findMany({ where: { hotelId: hotel.id } });
  const today = new Date();
  const dates: Date[] = [];
  for (let i = 0; i < 120; i++) {
    dates.push(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + i)));
  }
  for (const room of rooms) {
    for (const date of dates) {
      const dow = date.getUTCDay();
      const isWeekend = dow === 5 || dow === 6;
      const price = isWeekend ? Number(room.weekendPrice ?? room.basePrice) : Number(room.basePrice);
      await db.roomInventory.upsert({
        where: { roomTypeId_date: { roomTypeId: room.id, date } },
        update: {},
        create: { roomTypeId: room.id, date, inventory: room.inventoryCount },
      });
      await db.dailyRate.upsert({
        where: { roomTypeId_date: { roomTypeId: room.id, date } },
        update: {},
        create: { roomTypeId: room.id, date, price },
      });
    }
  }

  // ── Extras ──
  const extras = [
    { key: "airport_transfer", name: "Airport transfer", description: "Private transfer, Batumi International Airport (7.4 km).", priceType: "PER_STAY", price: 120, maxQuantity: 2 },
    { key: "breakfast", name: "Breakfast buffet", description: "Western breakfast, 09:00–11:00.", priceType: "PER_PERSON", price: 45, maxQuantity: 6 },
    { key: "hamam_ritual", name: "Turkish hamam ritual", description: "Kese & foam massage, 60 min, 24/7 spa.", priceType: "PER_PERSON", price: 180, maxQuantity: 4 },
    { key: "late_checkout", name: "Late check-out", description: "Until 18:00, subject to availability.", priceType: "PER_STAY", price: 150, maxQuantity: 1 },
    { key: "romantic_setup", name: "Romantic decoration", description: "Flowers, wine and treats in the room.", priceType: "PER_STAY", price: 250, maxQuantity: 1 },
  ];
  for (const e of extras) {
    await db.extra.upsert({ where: { key: e.key }, update: {}, create: { ...e, isDemo: true } });
  }

  // ── Experiences (per locale) ──
  const expDefs = [
    { key: "hamam-wellness", locale: "en", title: "24/7 Turkish Hamam & Spa", description: "Kese, foam bath and therapeutic massage around the clock — our signature ritual.", imageUrl: "/images/zarina/web/hamam-marble-pool.webp" },
    { key: "georgian-table", locale: "en", title: "The Georgian table", description: "Khachapuri, Adjarian khinkali and wines from 8,000-year-old qvevri tradition.", imageUrl: "/images/zarina/web/restaurant-dining.webp" },
    { key: "batumi-old-town", locale: "en", title: "Batumi old town walks", description: "Piazza, Europe Square and the boulevard — all within a stroll of the hotel.", imageUrl: "/images/zarina/web/lobby-red-lounge.webp" },
    { key: "hamam-wellness-tr", locale: "tr", title: "7/24 Türk Hamamı & Spa", description: "Kese, köpük banyosu ve terapi masajı — günün her saati.", imageUrl: "/images/zarina/web/hamam-marble-pool.webp" },
    { key: "georgian-table-tr", locale: "tr", title: "Gürcü sofrası", description: "Haçapuri, Acaralı hinkali ve 8.000 yıllık küvevi geleneğinin şarapları.", imageUrl: "/images/zarina/web/restaurant-dining.webp" },
    { key: "hamam-wellness-ka", locale: "ka", title: "24/7 თურქული აბანო & სპა", description: "კესე, ქაფიანი აბაზანა და თერაპიული მასაჟი — დღე-ღამის საათებში.", imageUrl: "/images/zarina/web/hamam-marble-pool.webp" },
  ];
  // Idempotent: replace previous seed experiences & FAQs for this hotel on re-run
  await db.hotelExperience.deleteMany({ where: { hotelId: hotel.id } });
  await db.faq.deleteMany({ where: { hotelId: hotel.id } });
  for (const e of expDefs) {
    await db.hotelExperience.create({ data: { ...e, hotelId: hotel.id } });
  }

  // ── FAQ (en/tr) ──
  const faqs = [
    { locale: "en", q: "What are the check-in and check-out times?", a: "Check-in from 14:00, check-out until 12:00. The front desk is open 24/7." },
    { locale: "en", q: "Is the Turkish hamam included?", a: "The hamam & spa is bookable as an extra; some rate plans include sessions." },
    { locale: "en", q: "Do you offer airport transfers?", a: "Yes — private transfer from Batumi International Airport (7.4 km) can be added at checkout." },
    { locale: "tr", q: "Giriş ve çıkış saatleri nedir?", a: "Giriş 14:00'ten itibaren, çıkış 12:00'ye kadar. Resepsiyon 7/24 açıktır." },
    { locale: "tr", q: "Türk hamamı dahil mi?", a: "Hamam & spa ekstra olarak eklenebilir; bazı tarifeler seans içerir." },
  ];
  for (const [i, f] of faqs.entries()) {
    await db.faq.create({ data: { hotelId: hotel.id, locale: f.locale, question: f.q, answer: f.a, sortOrder: i } });
  }

  // ── Demo offer ──
  await db.offer.upsert({
    where: { slug: "hamam-weekend-batumi" },
    update: {},
    create: {
      slug: "hamam-weekend-batumi",
      locale: "en",
      title: "Hamam Weekend in Batumi",
      summary: "Two nights with daily hamam & spa access and late check-out on Sunday.",
      body: "Includes:\n- 2 nights in a Comfort Double\n- Daily 60-minute hamam & spa access for two\n- Late check-out until 18:00\n\nDEMO DATA — configure real offers in Admin.",
      discountPercent: 12,
      promoCode: "HAMAM12",
      isDemo: true,
      sortOrder: 1,
    },
  });
  await db.promotion.upsert({
    where: { code: "HAMAM12" },
    update: {},
    create: {
      code: "HAMAM12",
      name: "Hamam Weekend 12% off",
      discountType: "PERCENT",
      discountValue: 12,
      minNights: 2,
      isDemo: true,
    },
  });

  // ── Default content blocks (policies as placeholders) ──
  const policyDefaults: Record<string, string> = {
    "policy.privacy": "Zarina Hotels processes personal data solely to manage reservations and comply with legal obligations.\nWe never store card numbers.\nPLACEHOLDER — final wording pending legal review. NEEDS ADMIN VERIFICATION.",
    "policy.terms": "PLACEHOLDER — Terms & Conditions pending owner review. NEEDS ADMIN VERIFICATION.",
    "policy.cancellation-policy": "Cancellation terms depend on the rate plan. Flexible plans: free cancellation until 48h before arrival.\nNon-refundable plans: not refundable.\nPLACEHOLDER — NEEDS ADMIN VERIFICATION.",
  };
  for (const [key, value] of Object.entries(policyDefaults)) {
    await db.contentBlock.upsert({
      where: { key_locale: { key, locale: "en" } },
      update: {},
      create: { key, locale: "en", value, type: "POLICY" },
    });
  }

  console.info("Seed complete: hotel, 6 room types × 120 days inventory+rates, 5 extras, experiences, FAQs, demo offer, content blocks.");
  console.info(`Admin pending setup: ${adminEmail} → run 'npm run admin:create' to get a one-time setup link.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
