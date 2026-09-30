// Galeri fotoğrafları — mevcut resmi Zarina medya kütüphanesi (public/images/zarina/web).
// Her fotoğrafa içerik etiketi (lobi, hamam, restoran...) eklenmiştir.

export type GalleryCategory = "spa" | "rooms" | "dining" | "lobby" | "pool";

export type GalleryItem = {
  src: string;
  /** TR etiket — fotoğraf üzerinde gösterilir */
  labelTr: string;
  /** EN etiket */
  labelEn: string;
  /** KA etiket */
  labelKa: string;
  /** Kategori filtresi */
  category: GalleryCategory;
  /** Masonry yükseklik vurgusu: normal | tall | wide */
  size: "normal" | "tall" | "wide";
};

export const GALLERY_ITEMS: GalleryItem[] = [
  // SPA & HAMAM
  {
    src: "/images/zarina/web/hamam-indoor-pool.webp",
    labelTr: "Hamam & Kapalı Havuz",
    labelEn: "Hamam & Indoor Pool",
    labelKa: "აბანო & დახურული აუზი",
    category: "spa",
    size: "wide",
  },
  {
    src: "/images/zarina/web/hamam-marble-pool.webp",
    labelTr: "Mermer Havuz",
    labelEn: "Marble Pool",
    labelKa: "მარმარილოს აუზი",
    category: "spa",
    size: "normal",
  },
  {
    src: "/images/zarina/web/hamam-sauna.webp",
    labelTr: "Sauna",
    labelEn: "Sauna",
    labelKa: "საუნა",
    category: "spa",
    size: "normal",
  },
  {
    src: "/images/zarina/web/spa-massage-room.webp",
    labelTr: "Masaj Odası",
    labelEn: "Massage Room",
    labelKa: "მასაჟის ოთახი",
    category: "spa",
    size: "tall",
  },
  {
    src: "/images/zarina/web/spa-relax-lounge.webp",
    labelTr: "Spa Dinlenme Salonu",
    labelEn: "Spa Relax Lounge",
    labelKa: "სპა დასასვენებელი",
    category: "spa",
    size: "normal",
  },
  {
    src: "/images/zarina/web/spa-towel-lounge.webp",
    labelTr: "Spa Terası",
    labelEn: "Spa Towel Lounge",
    labelKa: "სპა ტერასა",
    category: "spa",
    size: "normal",
  },
  // ODALAR
  {
    src: "/images/zarina/web/room-junior-suite.webp",
    labelTr: "Junior Suite",
    labelEn: "Junior Suite",
    labelKa: "ჯუნიორ სუიტი",
    category: "rooms",
    size: "wide",
  },
  {
    src: "/images/zarina/web/room-suite-red-panel.webp",
    labelTr: "Family Suite",
    labelEn: "Family Suite",
    labelKa: "ოჯახური სუიტი",
    category: "rooms",
    size: "tall",
  },
  {
    src: "/images/zarina/web/room-comfort-double.webp",
    labelTr: "Comfort Double",
    labelEn: "Comfort Double",
    labelKa: "კომფორტი ორადგილიანი",
    category: "rooms",
    size: "normal",
  },
  {
    src: "/images/zarina/web/room-standard-twin.webp",
    labelTr: "Standard Twin",
    labelEn: "Standard Twin",
    labelKa: "სტანდარტული ტყუპი",
    category: "rooms",
    size: "normal",
  },
  {
    src: "/images/zarina/web/room-double-classic.webp",
    labelTr: "Standart Çift Kişilik",
    labelEn: "Standard Double",
    labelKa: "სტანდარტული ორადგილიანი",
    category: "rooms",
    size: "normal",
  },
  {
    src: "/images/zarina/web/room-deluxe-red-accent.webp",
    labelTr: "Deluxe Oda",
    labelEn: "Deluxe Room",
    labelKa: "დელუქსი ოთახი",
    category: "rooms",
    size: "tall",
  },
  {
    src: "/images/zarina/web/room-double-terrace.webp",
    labelTr: "Teraslı Oda",
    labelEn: "Room with Terrace",
    labelKa: "ტერასიანი ოთახი",
    category: "rooms",
    size: "normal",
  },
  {
    src: "/images/zarina/web/room-family-terrace.webp",
    labelTr: "Aile Terası",
    labelEn: "Family Terrace",
    labelKa: "ოჯახური ტერასა",
    category: "rooms",
    size: "normal",
  },
  {
    src: "/images/zarina/web/bathroom-shower.webp",
    labelTr: "Banyo",
    labelEn: "Bathroom",
    labelKa: "აბაზანა",
    category: "rooms",
    size: "normal",
  },
  // Lobi & Ortak Alanlar
  {
    src: "/images/zarina/web/lobby-red-lounge.webp",
    labelTr: "Lobi",
    labelEn: "Lobby",
    labelKa: "ლობი",
    category: "lobby",
    size: "wide",
  },
  {
    src: "/images/zarina/web/restaurant-dining.webp",
    labelTr: "Restoran",
    labelEn: "Restaurant",
    labelKa: "რესტორანი",
    category: "dining",
    size: "wide",
  },
];

export const GALLERY_CATEGORY_LABELS: Record<GalleryCategory | "all", { tr: string; en: string; ka: string }> = {
  all: { tr: "Tümü", en: "All", ka: "ყველა" },
  spa: { tr: "Spa & Hamam", en: "Spa & Hamam", ka: "სპა & აბანო" },
  rooms: { tr: "Odalar", en: "Rooms", ka: "ოთახები" },
  dining: { tr: "Restoran", en: "Dining", ka: "რესტორანი" },
  lobby: { tr: "Lobi", en: "Lobby", ka: "ლობი" },
  pool: { tr: "Havuz", en: "Pool", ka: "აუზი" },
};
